package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
)

const (
	ChainID = 11155111
)

const erc20ABI = `[{
	"constant":false,
	"inputs":[
		{"name":"_to","type":"address"},
		{"name":"_value","type":"uint256"}
	],
	"name":"transfer",
	"outputs":[{"name":"","type":"bool"}],
	"type":"function"
}]`

var client *ethclient.Client
var nonceCounter uint64

func loadPrivateKey(hexkey string) (*ecdsa.PrivateKey, common.Address) {
	key, _ := crypto.HexToECDSA(strings.TrimPrefix(hexkey, "0x"))
	addr := crypto.PubkeyToAddress(key.PublicKey)
	return key, addr
}

func transferERC20(
	auth *bind.TransactOpts,
	contract common.Address,
	to common.Address,
	amount *big.Int,
) (string, error) {

	parsedABI, _ := abi.JSON(strings.NewReader(erc20ABI))
	bound := bind.NewBoundContract(contract, parsedABI, client, client, client)

	tx, err := bound.Transact(auth, "transfer", to, amount)
	if err != nil {
		return "", err
	}
	return tx.Hash().Hex(), nil
}

func main() {
	var err error
	client, err = ethclient.Dial("https://rpc.sepolia.org")
	if err != nil {
		log.Fatal(err)
	}

	privateKeyHex := "4f3edf983ac636a65a842ce7c78d9aa706d3b113b37f3fba3f70a3b7eaa6bf16"
	privateKey, fromAddr := loadPrivateKey(privateKeyHex)

	startNonce, _ := client.PendingNonceAt(context.Background(), fromAddr)
	nonceCounter = startNonce

	toAddresses := []string{
		"0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
	}

	// WETH Sepolia
	erc20Contract := common.HexToAddress("0xdd13E55209Fd76AfE204dBda4007C227904f0a81")

	var wg sync.WaitGroup
	sem := make(chan struct{}, 5)

	for i := 0; i < 2; i++ {
		for _, to := range toAddresses {

			wg.Add(1)
			sem <- struct{}{}

			go func(to string) {
				defer wg.Done()
				defer func() { <-sem }()

				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer cancel()

				nonce := atomic.AddUint64(&nonceCounter, 1) - 1
				gasPrice, _ := client.SuggestGasPrice(ctx)

				auth, _ := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(ChainID))
				auth.Nonce = big.NewInt(int64(nonce))
				auth.GasPrice = gasPrice
				auth.Value = big.NewInt(0)
				auth.Context = ctx

				// 5 WETH (18 decimals)
				amount := new(big.Int).Mul(big.NewInt(5), big.NewInt(1e18))

				tx, err := transferERC20(
					auth,
					erc20Contract,
					common.HexToAddress(to),
					amount,
				)

				if err != nil {
					log.Println("Transfer failed:", err)
					return
				}

				log.Println("TX sent:", tx)
			}(to)
		}
		wg.Wait()
		fmt.Println("Loop completed", i+1)
	}
}
