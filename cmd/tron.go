package main

import (
	"encoding/hex"
	"fmt"
	"log"
	"math"
	"math/big"
	"math/rand"
	"sync"
	"time"
	"tron_load/trx/grpcs"
	"tron_load/trx/sign"
)

var (
	Client *grpcs.Client
)

func Initialize(rpcUrl, key string) {
	client, err := grpcs.NewClient(rpcUrl, &key)
	if err != nil {
		fmt.Printf("Failed to initialize TRON gRPC client: %v", err)
	}
	Client = client
}

func TransferTrc20(senderAddress string, receiverAddress, USDTTronContract string, fromPrivateKey []byte, amountTransfer *big.Int) (txid string, err error) {
	tx, err := Client.TransferTrc20(senderAddress, receiverAddress, USDTTronContract, amountTransfer, 5000000)
	if err != nil {
		return "", err
	}
	signTx, err := sign.SignTransaction(tx.Transaction, fromPrivateKey)
	if err != nil {
		return "", err
	}
	err = Client.BroadcastTransaction(signTx)
	if err != nil {
		return "", err
	}

	return hex.EncodeToString(tx.Txid), nil
}

func main() {
	grpcURL := "grpc.nile.trongrid.io:50051"         // grpc url
	apiKey := "7585872f-2797-4599-90e9-7c2a99bf3664" // tron grid api key
	Initialize(grpcURL, apiKey)
	privateKeys := []string{
		"781fdd322bbfa49bd9ef37115f71621f9d6f4e5b87ec53ce871a001bd1f17233",
		// "2c452a466a11b0a9886479c49dc1a0b122225c76a17195db92aaa6fa0b3a2b6e",
	} // tron wallet private key

	addresses := []string{
		"TM6Z55ogJsC1p4oSA6zF3n2Aoy39ZxcLzY", // rayan wallet
		// "TVR8XVzdFsAQQv8m22coTTFA715mrHZy95", // pannu wallet
	} // private key wallet address same sequence

	targets := []string{
		// "TPoLuivbLuoqLRVY4iKgzJtavjYL4UneHx", // rayan SFP dev
		// "TAACVBRdm9gk1Mr1pUPBtUixwrnrznctLt", // sfp dev pannu
		// "TWXdYbDufhifkBJsctuuWEoRWkZwMJvKV9", // wsvip dev pannu
		// "TUXCNvZoYBo5bHjHuf8bFZr4kBe5WLtXqn", // rayan wsvip dev
		// "TLZHbLZ68R13hXta5VrzTcUawGp9pjfZxd", // pannu wsvip uat
		//"TUXCNvZoYBo5bHjHuf8bFZr4kBe5WLtXqn",
		//"TJFKsm5FKK619jLdvSg4HENtRYtL8iYS9w",
		//"TJxifiPjmkbcNnB2VRsHfhm3qZYehtUBCk",

	} // reciepient wallet address list
	// targets := []string{
	// 	"TLBhRbMuFyVc1FSLLQ5MeyeWTepKHGMrML",
	// 	"TLBhRbMuFyVc1FSLLQ5MeyeWTepKHGMrML",
	// } // my cds

	contractAddr := "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj" // usdt contract address
	loopCount := 2                                       // loop count
	delay := 100 * time.Millisecond                      // delay time between each loop
	minAmount := 3.0                                     // min transaction amount
	maxAmount := 10.0                                    // max transaction amount
	maxGoroutines := 10                                  // concurrency

	semaphore := make(chan struct{}, maxGoroutines)
	var wg sync.WaitGroup

	for i := 0; i < loopCount; i++ {
		for j, to := range targets {
			wg.Add(1)
			semaphore <- struct{}{} // acquire slot
			go func(j int, to string) {
				defer wg.Done()
				defer func() { <-semaphore }() // release slot

				var fromAddr, pk string
				// if j%2 == 0 {
				// 	fromAddr, pk = addresses[1], privateKeys[1]
				// } else {
				// 	fromAddr, pk = addresses[0], privateKeys[0]
				// }
				fromAddr, pk = addresses[0], privateKeys[0]
				random := rand.New(rand.NewSource(time.Now().UnixNano()))

				// Random amount between min and max
				amount := minAmount + random.Float64()*(maxAmount-minAmount)

				amount = math.Round(amount*100) / 100

				// On Tron, token amounts are big.Int
				fromPrivateKey, err := hex.DecodeString(pk)
				if err != nil {
					log.Printf("Invalid private key: %v", err)
				}
				amountBig := new(big.Int).Mul(
					big.NewInt(int64(amount*1_000_000)),
					big.NewInt(1),
				)
				txId, err := TransferTrc20(fromAddr, to, contractAddr, fromPrivateKey, amountBig)
				if err != nil {
					log.Printf("Error sending TRC20 TX from %s to %s: %v", fromAddr, to, err)
				}
				fmt.Printf("Count: %v, Amount %v, Sender: %v, Reciever: %v , TxId: %v\n", j, amount, fromAddr, to, txId)
			}(j, to)
		}
		fmt.Printf("\n Loop Completed %v\n", i+1)
		wg.Wait()
		time.Sleep(delay)
	}
}
