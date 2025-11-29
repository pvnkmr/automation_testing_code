package grpcs

import (
	"encoding/json"
	"errors"
	"math/big"
	"strings"
	"time"

	"google.golang.org/grpc/credentials/insecure"

	"github.com/fbsobreira/gotron-sdk/pkg/client"
	"github.com/fbsobreira/gotron-sdk/pkg/proto/api"
	"github.com/fbsobreira/gotron-sdk/pkg/proto/core"
	"github.com/google/martian/log"
	"google.golang.org/grpc"
)

type Client struct {
	node string
	GRPC *client.GrpcClient
}

func NewClient(node string, apiKey *string) (*Client, error) {
	c := new(Client)
	c.node = node

	c.GRPC = client.NewGrpcClient(node)
	if apiKey != nil && *apiKey != "" {
		c.GRPC.SetAPIKey(*apiKey)
	}

	c.GRPC.SetTimeout(time.Second * 60)
	err := c.GRPC.Start(grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (c *Client) SetTimeout(timeout time.Duration) error {
	if c == nil {
		return errors.New("client is nil ptr")
	}
	c.GRPC = client.NewGrpcClientWithTimeout(c.node, timeout)
	err := c.GRPC.Start()
	if err != nil {
		return err
	}
	return nil
}

/*
保持连接，如果中途连接失败，就重连
*/
func (c *Client) keepConnect() error {
	_, err := c.GRPC.GetNodeInfo()
	if err != nil {
		if strings.Contains(err.Error(), "no such host") {
			return c.GRPC.Reconnect(c.node)
		}
		return err
	}
	return nil
}

func (c *Client) Transfer(from, to string, amount int64) (*api.TransactionExtention, error) {
	err := c.keepConnect()
	log.Infof("keepConnect %s", err)
	if err != nil {
		return nil, err
	}
	return c.GRPC.Transfer(from, to, amount)
}

func (c *Client) TransferTrc20(from, to, contract string, amount *big.Int, feeLimit int64) (*api.TransactionExtention, error) {
	err := c.keepConnect()
	if err != nil {
		return nil, err
	}
	return c.GRPC.TRC20Send(from, to, contract, amount, feeLimit)
}

func (c *Client) BroadcastTransaction(transaction *core.Transaction) error {
	err := c.keepConnect()
	if err != nil {
		return err
	}
	result, err := c.GRPC.Broadcast(transaction)
	if err != nil {
		return err
	}
	if result.Code != 0 {
		return errors.New("bad transaction: " + string(result.GetMessage()))
	}
	if result.Result == true {
		return nil
	}
	d, _ := json.Marshal(result)
	return errors.New("tx send fail: " + string(d))
}
