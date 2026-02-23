// This program demonstrates sending ERC20 transfers on Ethereum-like networks
// (e.g., Sepolia) using Go. It supports multiple sender keys and multiple
// recipient addresses, enabling scenarios such as one-to-one, one-to-many,
// many-to-one, and many-to-many. It includes balance checks, nonce management,
// and optional receipt waiting. Results are written to results.json for later
// analysis.
package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/big"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ChainID for Sepolia (example). Change to your target network if needed.
const ChainID = 11155111

// Minimal ERC20 ABI for transfer
const erc20ABI = `[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]`

// Path to store per-run results for quick checks
const ETH_RESULT_FILENAME = "eth_result.json"

type TransferResult struct {
	From        string `json:"from"`
	To          string `json:"to"`
	TxHash      string `json:"txHash"`
	Status      string `json:"status"`
	Error       string `json:"error,omitempty"`
	BlockNumber uint64 `json:"blockNumber,omitempty"`
}

type TestConfig struct {
	Scenario       string   `json:"scenario"`
	RPCURL         string   `json:"rpcUrl"`
	ERC20Contract  string   `json:"erc20Contract"`
	SenderKeys     []string `json:"senderKeys"`
	Recipients     []string `json:"recipients"`
	MaxConcurrent  int      `json:"maxConcurrent"`
	WaitForReceipt bool     `json:"waitForReceipt"`
	ContractAddr   string   `json:"contractAddr"`
	LoopCount      int      `json:"loopCount"`
	Delay          int      `json:"delay"` // ms between each inner loop
	MinAmount      float64  `json:"minAmount"`
	MaxAmount      float64  `json:"maxAmount"`
	Decimals       int      `json:"decimals"`
	MaxGoroutines  int      `json:"maxGoroutines"`
	// Production planners: quick retry knobs
	RetryCount     int `json:"retryCount"`
	RetryBackoffMs int `json:"retryBackoffMs"`
}

var client *ethclient.Client
var nonceCounters = make(map[string]*uint64)
var nonceMutex sync.Mutex

func loadPrivateKey(hexkey string) (*ecdsa.PrivateKey, common.Address, error) {
	hexkey = strings.TrimPrefix(hexkey, "0x")
	key, err := crypto.HexToECDSA(hexkey)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("invalid private key: %w", err)
	}
	addr := crypto.PubkeyToAddress(key.PublicKey)
	return key, addr, nil
}

func getNonce(fromAddr common.Address) (uint64, error) {
	addrStr := fromAddr.Hex()
	nonceMutex.Lock()
	defer nonceMutex.Unlock()
	if counter, exists := nonceCounters[addrStr]; exists {
		return atomic.AddUint64(counter, 1) - 1, nil
	}
	startNonce, err := client.PendingNonceAt(context.Background(), fromAddr)
	if err != nil {
		return 0, fmt.Errorf("failed to get nonce: %w", err)
	}
	var newCounter uint64 = startNonce
	nonceCounters[addrStr] = &newCounter
	return atomic.AddUint64(&newCounter, 1) - 1, nil
}

func checkBalance(ctx context.Context, addr common.Address, tokenAddr common.Address, amount *big.Int) error {
	ethBalance, err := client.BalanceAt(ctx, addr, nil)
	if err != nil {
		return fmt.Errorf("failed to get ETH balance: %w", err)
	}
	if ethBalance.Cmp(big.NewInt(1e15)) < 0 {
		return fmt.Errorf("insufficient ETH balance: %s wei (need ~0.001 ETH)", ethBalance.String())
	}
	// token balance check
	balanceOfABI := `[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(balanceOfABI))
	if err != nil {
		return fmt.Errorf("failed to parse ABI: %w", err)
	}
	bound := bind.NewBoundContract(tokenAddr, parsedABI, client, client, client)
	var res []interface{}
	err = bound.Call(&bind.CallOpts{Context: ctx}, &res, "balanceOf", addr)
	if err != nil {
		return fmt.Errorf("failed to get token balance: %w", err)
	}
	if res[0].(*big.Int).Cmp(amount) < 0 {
		return fmt.Errorf("insufficient token balance for transfer amount: %s", res[0].(*big.Int).String())
	}
	return nil
}

func amountFromRange(min, max float64, decimals int) *big.Int {
	if decimals <= 0 {
		decimals = 18
	}
	if max <= min {
		max = min
	}
	v := min + rand.Float64()*(max-min)
	scale := math.Pow(10, float64(decimals))
	amt := int64(math.Round(v * scale))
	return big.NewInt(amt)
}

func transferERC20(auth *bind.TransactOpts, contract, to common.Address, amount *big.Int) (string, error) {
	parsedABI, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		return "", fmt.Errorf("failed to parse ABI: %w", err)
	}
	bound := bind.NewBoundContract(contract, parsedABI, client, client, client)
	tx, err := bound.Transact(auth, "transfer", to, amount)
	if err != nil {
		return "", fmt.Errorf("transfer failed: %w", err)
	}
	return tx.Hash().Hex(), nil
}

func waitForReceipt(ctx context.Context, txHash string) (uint64, error) {
	hash := common.HexToHash(txHash)
	for i := 0; i < 60; i++ {
		receipt, err := client.TransactionReceipt(ctx, hash)
		if err == nil {
			if receipt.Status == 0 {
				return 0, fmt.Errorf("transaction reverted")
			}
			return receipt.BlockNumber.Uint64(), nil
		}
		select {
		case <-ctx.Done():
			return 0, fmt.Errorf("context cancelled while waiting for receipt")
		case <-time.After(2 * time.Second):
		}
	}
	return 0, fmt.Errorf("timeout waiting for receipt")
}

// logEthResults writes the latest results to a fixed eth_result.json file for quick inspection
func logEthResults(results []TransferResult) {
	data, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		log.Printf("failed to marshal results for eth_result.json: %v", err)
		return
	}
	path := ETH_RESULT_FILENAME
	if err := os.WriteFile(path, data, 0644); err != nil {
		log.Printf("failed writing eth_result.json to %s: %v", path, err)
	} else {
		fmt.Printf("eth_result.json written to %s\n", path)
	}
}

// isTransientError heuristically determines whether an error is temporary and worth retrying.
func isTransientError(err string) bool {
	if err == "" {
		return false
	}
	l := strings.ToLower(err)
	return strings.Contains(l, "nonce") || strings.Contains(l, "timeout") || strings.Contains(l, "rpc") || strings.Contains(l, "temporary") || strings.Contains(l, "context deadline exceeded") || strings.Contains(l, "rate limit")
}

// robustExecuteTransfer performs a transfer with retry logic for transient errors.
func robustExecuteTransfer(ctx context.Context, privateKeyHex string, toAddr common.Address, erc20Contract common.Address, amount *big.Int, shouldWaitForReceipt bool, retries int, backoff time.Duration) TransferResult {
	var last TransferResult
	if retries <= 0 {
		retries = 1
	}
	for i := 0; i < retries; i++ {
		last = executeTransfer(ctx, privateKeyHex, toAddr, erc20Contract, amount, shouldWaitForReceipt)
		if last.Status == "success" {
			return last
		}
		if isTransientError(last.Error) {
			time.Sleep(backoff)
			backoff = backoff * 2
			continue
		}
		// Non-transient error, stop retrying
		return last
	}
	return last
}

func executeTransfer(ctx context.Context, privateKeyHex string, toAddr common.Address, erc20Contract common.Address, amount *big.Int, shouldWaitForReceipt bool) TransferResult {
	result := TransferResult{To: toAddr.Hex(), Status: "pending"}
	priv, fromAddr, err := loadPrivateKey(privateKeyHex)
	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		return result
	}
	_ = priv
	result.From = fromAddr.Hex()
	if err := checkBalance(ctx, fromAddr, erc20Contract, amount); err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		return result
	}
	nonce, err := getNonce(fromAddr)
	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		return result
	}
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("failed to get gas price: %v", err)
		return result
	}
	// Create a transactor using the loaded private key
	auth, err := bind.NewKeyedTransactorWithChainID(priv, big.NewInt(ChainID))
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("failed to create transactor: %v", err)
		return result
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.GasPrice = gasPrice
	auth.GasLimit = uint64(100000)
	auth.Value = big.NewInt(0)
	auth.Context = ctx
	txHash, err := transferERC20(auth, erc20Contract, toAddr, amount)
	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		return result
	}
	result.TxHash = txHash
	if shouldWaitForReceipt {
		blockNum, err := waitForReceipt(ctx, txHash)
		if err != nil {
			result.Status = "failed"
			result.Error = fmt.Sprintf("receipt error: %v", err)
			return result
		}
		result.BlockNumber = blockNum
	}
	result.Status = "success"
	return result
}

func runScenario(config TestConfig) []TransferResult {
	var results []TransferResult
	var wg sync.WaitGroup
	var mu sync.Mutex
	cap := config.MaxGoroutines
	if cap <= 0 {
		cap = 5
	}
	sem := make(chan struct{}, cap)

	ercContract := common.HexToAddress(config.ERC20Contract)
	if strings.TrimSpace(config.ContractAddr) != "" {
		ercContract = common.HexToAddress(config.ContractAddr)
	}
	decimals := config.Decimals
	if decimals <= 0 {
		decimals = 18
	}
	loopCount := config.LoopCount
	if loopCount <= 0 {
		loopCount = 1
	}
	delay := time.Duration(config.Delay) * time.Millisecond

	rand.Seed(time.Now().UnixNano())

	for _, sk := range config.SenderKeys {
		for _, recip := range config.Recipients {
			wg.Add(1)
			sem <- struct{}{}
			go func(key string, to string) {
				defer wg.Done()
				defer func() { <-sem }()
				ctx, cancel := context.WithTimeout(context.Background(), time.Duration(loopCount*60)*time.Second)
				defer cancel()
				for i := 0; i < loopCount; i++ {
					amt := amountFromRange(config.MinAmount, config.MaxAmount, decimals)
					r := robustExecuteTransfer(ctx, key, common.HexToAddress(to), ercContract, amt, config.WaitForReceipt, config.RetryCount, time.Duration(config.RetryBackoffMs)*time.Millisecond)
					mu.Lock()
					results = append(results, r)
					mu.Unlock()
					if delay > 0 {
						time.Sleep(delay)
					}
				}
			}(sk, recip)
		}
	}
	wg.Wait()
	return results
}

func printResults(results []TransferResult) {
	success, failed := 0, 0
	fmt.Println("\n========== RESULTS ==========")
	for i, r := range results {
		fmt.Printf("\nTransfer %d:\n", i+1)
		fmt.Printf("  From: %s\n", r.From)
		fmt.Printf("  To: %s\n", r.To)
		fmt.Printf("  TxHash: %s\n", r.TxHash)
		fmt.Printf("  Status: %s\n", r.Status)
		if r.Error != "" {
			fmt.Printf("  Error: %s\n", r.Error)
		}
		if r.BlockNumber > 0 {
			fmt.Printf("  Block: %d\n", r.BlockNumber)
		}
		if r.Status == "success" {
			success++
		} else {
			failed++
		}
	}
	fmt.Println("\n========== SUMMARY ==========")
	fmt.Printf("Total: %d | Success: %d | Failed: %d\n", len(results), success, failed)
}

func main() {
	config := TestConfig{
		Scenario:      "many-to-many",
		RPCURL:        "https://rpc.sepolia.org",
		ERC20Contract: "0xdd13E55209Fd76AfE204dBda4007C227904f0a81",
		SenderKeys: []string{
			// Replace with funded Sepolia private keys
			"REPLACE_WITH_PRIVATE_KEY_1",
			"REPLACE_WITH_PRIVATE_KEY_2",
			"REPLACE_WITH_PRIVATE_KEY_3",
			"REPLACE_WITH_PRIVATE_KEY_4",
		},
		Recipients: []string{
			"0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
			"0xf17f52151EbEF6C7334FAD080c5704D77216b732",
		},
		MaxConcurrent:  5,
		WaitForReceipt: true,
		LoopCount:      2,
		Delay:          100,
		MinAmount:      3.0,
		MaxAmount:      10.0,
		Decimals:       18,
		MaxGoroutines:  10,
		RetryCount:     2,
		RetryBackoffMs: 200,
	}

	if len(os.Args) > 1 {
		cfgPath := os.Args[1]
		data, err := os.ReadFile(cfgPath)
		if err != nil {
			log.Fatalf("Failed to read config: %v", err)
		}
		if err := json.Unmarshal(data, &config); err != nil {
			log.Fatalf("Failed to parse config: %v", err)
		}
	}

	var err error
	client, err = ethclient.Dial(config.RPCURL)
	if err != nil {
		log.Fatalf("Failed to connect to RPC: %v", err)
	}
	defer client.Close()

	results := runScenario(config)
	printResults(results)
	logEthResults(results)

	// Persist results to a configurable path (defaults to ./results/results.json)
	resultsPath := os.Getenv("RESULTS_PATH")
	if resultsPath == "" {
		resultsPath = "results/results.json"
	}
	if err := os.MkdirAll(filepath.Dir(resultsPath), 0755); err != nil {
		log.Printf("warning: could not create results dir: %v", err)
	}
	data, _ := json.MarshalIndent(results, "", "  ")
	if err := os.WriteFile(resultsPath, data, 0644); err != nil {
		log.Printf("failed writing results to %s: %v", resultsPath, err)
	} else {
		fmt.Printf("Results written to %s\n", resultsPath)
	}
}
