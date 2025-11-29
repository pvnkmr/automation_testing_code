package sign

import (
	"crypto/ecdsa"
	"crypto/sha256"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/fbsobreira/gotron-sdk/pkg/proto/core"
	"google.golang.org/protobuf/proto"
)

func SignTransaction(transaction *core.Transaction, fromPrivateKey []byte) (*core.Transaction, error) {
	privateKey := crypto.ToECDSAUnsafe(fromPrivateKey)

	defer zeroKey(privateKey)
	rawData, err := proto.Marshal(transaction.GetRawData())
	if err != nil {
		return nil, err
	}
	h256h := sha256.New()
	h256h.Write(rawData)
	hash := h256h.Sum(nil)
	signature, err := crypto.Sign(hash, privateKey)
	if err != nil {
		return nil, err
	}
	transaction.Signature = append(transaction.Signature, signature)
	return transaction, nil
}

func GetTransactionHash(transaction *core.Transaction) ([]byte, error) {

	rawData, err := proto.Marshal(transaction.GetRawData())
	if err != nil {
		return nil, err
	}
	h256h := sha256.New()
	h256h.Write(rawData)
	hash := h256h.Sum(nil)
	return hash, nil
}

// zeroKey zeroes a private key in memory.
func zeroKey(k *ecdsa.PrivateKey) {
	b := k.D.Bits()
	for i := range b {
		b[i] = 0
	}
}
