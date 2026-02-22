Go ERC20 Transfer Lab

Overview
- A Go-based tool to send ERC20 transfers on Ethereum-like networks (e.g., Sepolia).
- Supports multiple senders and multiple recipients, enabling: one-to-one, one-to-many,
  many-to-one, and many-to-many transfer scenarios.
- Includes balance checks, nonce management, and optional receipt waiting.
- Outputs results to results.json for post-run analysis. Designed to be wired into Playwright tests.

Prerequisites
- Go installed (1.18+ recommended).
- Access to an Ethereum-like RPC (e.g., Sepolia) with funded accounts and ERC20 tokens.
- Knowledge of the private keys you want to use for sending tokens (do not publish these keys).

Getting started
- Build/run with defaults: go run eth.go
- Or override config with a JSON file: go run eth.go config.json

Config file (schema)
- The config is a JSON object with the following fields:
  - scenario: string (e.g., one-to-one, one-to-many, many-to-one, many-to-many)
  - rpcUrl: string (RPC endpoint)
  - erc20Contract: string (ERC20 contract address)
  - senderKeys: array of strings (private keys in hex, 0x prefixed or not)
  - recipients: array of addresses (strings)
  - amount: string (decimal or integer value, in token's smallest unit)
  - maxConcurrent: int (parallel transfers)
  - waitForReceipt: bool (wait for tx receipts)

Four sample configurations
- One-to-One (1 sender, 1 recipient)
```
{
  "scenario": "one-to-one",
  "rpcUrl": "https://rpc.sepolia.org",
  "erc20Contract": "0xdd13E55209Fd76AfE204dBda4007C227904f0a81",
  "senderKeys": ["REPLACE_WITH_PRIVATE_KEY_1"],
  "recipients": ["0xRecipientAddress1"],
  "amount": "1000000000000000000",
  "maxConcurrent": 2,
  "waitForReceipt": true
}
```

- One-to-Many (1 sender, multiple recipients)
```
{
  "scenario": "one-to-many",
  ...
}
```

- Many-to-One (multiple senders, 1 recipient)
```
{
  "scenario": "many-to-one",
  ...
}
```

- Many-to-Many (multiple senders, multiple recipients)
```
{
  "scenario": "many-to-many",
  ...
}
```

Playwright integration
- You can drive this Go binary from a Playwright test, or wrap it in a helper script.
- Example (Node.js): use child_process to run the Go binary with a config.json.

Example Playwright (TypeScript) snippet
```ts
import { exec } from 'child_process';
async function runGo(configPath: string) {
  return new Promise<void>((resolve, reject) => {
    const cmd = `go run ${__dirname}/eth.go ${configPath}`;
    const proc = exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) return reject(err);
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
    proc.stdout?.on('data', (d) => console.log(d.toString()));
  });
}
// In your test, call await runGo('config.json');
```

Notes
- The sample keys in README are placeholders. Replace with your own funded keys.
- Do not publish private keys or seed info in public repos.
- For production reliability, handle retries, dynamic gas estimation, and secure key storage.

Patch and patches
- If you want more robust config handling or a dedicated config schema, we can add a small config.validate step.

Enjoy experimenting with one-to-one, one-to-many, many-to-one, and many-to-many ERC20 transfers from Go, and wiring it into Playwright tests for end-to-end automation.
