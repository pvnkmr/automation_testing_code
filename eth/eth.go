// This program demonstrates sending ERC20 transfers on Ethereum-like networks
// (e.g., Sepolia) using Go. It supports multiple sender keys and multiple
// recipient addresses, enabling scenarios such as one-to-one, one-to-many,
// many-to-one, and many-to-many. It includes balance checks, nonce management,
// and optional receipt waiting. Results are written to results.json for later
// analysis. The code is intentionally verbose with comments to help first-time
// users understand the flow.
package main

import (
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"os"
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

// ChainID for Sepolia (example). Use your target network's chain ID when running on other networks.
const ChainID = 11155111

// Minimal ERC20 ABI for the transfer function used by this tool.
const erc20ABI = `[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]`

// TransferResult captures the outcome of a single ERC20 transfer attempt.
type TransferResult struct {
	From        string `json:"from"`
	To          string `json:"to"`
	TxHash      string `json:"txHash"`
	Status      string `json:"status"`
	Error       string `json:"error,omitempty"`
	BlockNumber uint64 `json:"blockNumber,omitempty"`
}

// TestConfig holds the wiring for a batch run: which senders, which recipients,
// how much to send, concurrency, and whether to wait for receipts.
type TestConfig struct {
	Scenario       string   `json:"scenario"`
	RPCURL         string   `json:"rpcUrl"`
	ERC20Contract  string   `json:"erc20Contract"`
	SenderKeys     []string `json:"senderKeys"`
	Recipients     []string `json:"recipients"`
	Amount         string   `json:"amount"`
	MaxConcurrent  int      `json:"maxConcurrent"`
	WaitForReceipt bool     `json:"waitForReceipt"`
}

var client *ethclient.Client
var nonceCounters = make(map[string]*uint64)
var nonceMutex sync.Mutex

// loadPrivateKey converts a hex private key into an ECDSA key and derives its address.
// It strips a leading 0x if present.
func loadPrivateKey(hexkey string) (*ecdsa.PrivateKey, common.Address, error) {
	hexkey = strings.TrimPrefix(hexkey, "0x")
	key, err := crypto.HexToECDSA(hexkey)
	if err != nil {
		return nil, common.Address{}, fmt.Errorf("invalid private key: %w", err)
	}
	addr := crypto.PubkeyToAddress(key.PublicKey)
	return key, addr, nil
}

// getNonce provides a tiny nonce management layer to avoid nonce reuse across
// concurrent goroutines. It is keyed by the sender address.
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

// checkBalance ensures both ETH balance and token balance are sufficient for the transfer.
func checkBalance(ctx context.Context, addr common.Address, tokenAddr common.Address, requiredTokens *big.Int) error {
	ethBalance, err := client.BalanceAt(ctx, addr, nil)
	if err != nil {
		return fmt.Errorf("failed to get ETH balance: %w", err)
	}
	// Require a small amount of ETH for gas (example threshold: ~0.001 ETH)
	if ethBalance.Cmp(big.NewInt(1e15)) < 0 {
		return fmt.Errorf("insufficient ETH balance: %s wei (need ~0.001 ETH)", ethBalance.String())
	}

	balanceOfABI := `[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]`
	parsedABI, err := abi.JSON(strings.NewReader(balanceOfABI))
	if err != nil {
		return fmt.Errorf("failed to parse ABI: %w", err)
	}

	bound := bind.NewBoundContract(tokenAddr, parsedABI, client, client, client)
	var results []interface{}
	err = bound.Call(&bind.CallOpts{Context: ctx}, &results, "balanceOf", addr)
	if err != nil {
		return fmt.Errorf("failed to get token balance: %w", err)
	}

	tokenBalance := results[0].(*big.Int)
	if tokenBalance.Cmp(requiredTokens) < 0 {
		return fmt.Errorf("insufficient token balance: %s (need %s)", tokenBalance.String(), requiredTokens.String())
	}

	return nil
}

// transferERC20 executes the ERC20 transfer using the provided transactor and contract binding.
func transferERC20(
	ctx context.Context,
	auth *bind.TransactOpts,
	contract common.Address,
	to common.Address,
	amount *big.Int,
) (string, error) {
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

// waitForReceipt polls for the transaction receipt until it is mined or times out.
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

// executeTransfer performs a single ERC20 transfer from one sender to one recipient.
// It handles nonce, gas price, and optional receipt waiting.
func executeTransfer(
	ctx context.Context,
	privateKeyHex string,
	toAddr common.Address,
	erc20Contract common.Address,
	amount *big.Int,
	shouldWaitForReceipt bool,
) TransferResult {
	result := TransferResult{
		To:     toAddr.Hex(),
		Status: "pending",
	}

	privateKey, fromAddr, err := loadPrivateKey(privateKeyHex)
	if err != nil {
		result.Status = "failed"
		result.Error = err.Error()
		return result
	}
	result.From = fromAddr.Hex()

	err = checkBalance(ctx, fromAddr, erc20Contract, amount)
	if err != nil {
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

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(ChainID))
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

	txHash, err := transferERC20(ctx, auth, erc20Contract, toAddr, amount)
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

// runScenario orchestrates concurrent transfers according to the provided config.
// It spawns worker goroutines limited by MaxConcurrent and collects results.
func runScenario(config TestConfig) []TransferResult {
	var results []TransferResult
	var wg sync.WaitGroup
	var resultsMutex sync.Mutex
	sem := make(chan struct{}, config.MaxConcurrent)

	for _, senderKey := range config.SenderKeys {
		for _, recipient := range config.Recipients {
			wg.Add(1)
			sem <- struct{}{}

			go func(sk, r string) {
				defer wg.Done()
				defer func() { <-sem }()

				ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
				defer cancel()

				amount := new(big.Int)
				amount.SetString(config.Amount, 10)

				result := executeTransfer(
					ctx,
					sk,
					common.HexToAddress(r),
					common.HexToAddress(config.ERC20Contract),
					amount,
					config.WaitForReceipt,
				)

				resultsMutex.Lock()
				results = append(results, result)
				resultsMutex.Unlock()
			}(senderKey, recipient)
		}
	}
	wg.Wait()

	return results
}

// printResults prints a human-readable summary of all transfers and a final tally.
func printResults(results []TransferResult) {
	successCount := 0
	failedCount := 0

	fmt.Println("\n========== RESULTS ==========")
	for i, r := range results {
		fmt.Printf("\nTransfer %d:\n", i+1)
		fmt.Printf("  From:   %s\n", r.From)
		fmt.Printf("  To:     %s\n", r.To)
		fmt.Printf("  TxHash: %s\n", r.TxHash)
		fmt.Printf("  Status: %s\n", r.Status)
		if r.Error != "" {
			fmt.Printf("  Error:  %s\n", r.Error)
		}
		if r.BlockNumber > 0 {
			fmt.Printf("  Block:  %d\n", r.BlockNumber)
		}

		if r.Status == "success" {
			successCount++
		} else {
			failedCount++
		}
	}

	fmt.Println("\n========== SUMMARY ==========")
	fmt.Printf("Total: %d | Success: %d | Failed: %d\n", len(results), successCount, failedCount)
}

// main wires everything together: loads config, connects to RPC, runs the scenario,
// and writes results to a JSON file.
func main() {
	config := TestConfig{
		Scenario:      "many-to-many",
		RPCURL:        "https://rpc.sepolia.org",
		ERC20Contract: "0xdd13E55209Fd76AfE204dBda4007C227904f0a81",
		SenderKeys: []string{
			"REPLACE_WITH_PRIVATE_KEY_1",
			"REPLACE_WITH_PRIVATE_KEY_2",
			"REPLACE_WITH_PRIVATE_KEY_3",
			"REPLACE_WITH_PRIVATE_KEY_4",
		},
		Recipients: []string{
			"0xRECEIPIENT_ADDRESS_1",
			"0xRECEIPIENT_ADDRESS_2",
		},
		Amount:         "5000000000000000000",
		MaxConcurrent:  5,
		WaitForReceipt: true,
	}

	// Optional: override config via a JSON file passed as the first argument
	if len(os.Args) > 1 {
		configFile := os.Args[1]
		data, err := os.ReadFile(configFile)
		if err != nil {
			log.Fatalf("Failed to read config file: %v", err)
		}
		err = json.Unmarshal(data, &config)
		if err != nil {
			log.Fatalf("Failed to parse config: %v", err)
		}
	}

	// Connect to the Ethereum RPC node
	var err error
	client, err = ethclient.Dial(config.RPCURL)
	if err != nil {
		log.Fatalf("Failed to connect to RPC: %v", err)
	}
	defer client.Close()

	// Basic runtime statistics
	fmt.Printf("Scenario: %s\n", config.Scenario)
	fmt.Printf("Senders: %d\n", len(config.SenderKeys))
	fmt.Printf("Recipients: %d\n", len(config.Recipients))
	fmt.Printf("Total transfers: %d\n", len(config.SenderKeys)*len(config.Recipients))

	// Run the defined scenario and collect results
	results := runScenario(config)

	// Print human-friendly results to stdout
	printResults(results)

	// Persist results for later analysis
	jsonResults, _ := json.MarshalIndent(results, "", "  ")
	os.WriteFile("results.json", jsonResults, 0644)
	fmt.Println("\nResults saved to results.json")
}
