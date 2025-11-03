# Provenance Registry DApp (Next.js + Ethers v6)

A small DApp UI and server API to push provenance JSON data to the `ProvenanceRegistryV1` smart contract. Built with Next.js (TypeScript), Ethers v6, React Hook Form, and react-qr-code.

## Features

- Dynamic form for entity fields with add/remove rows
- Optional batch submission (two entities) using contract `pushBatchEntities`
- Live JSON preview (pretty) and compact JSON for submission
- Server-side signing with `PRIVATE_KEY` (demo only) and RPC provider
- Displays tx hash, clickable explorer URL, and QR code for mobile scanning
- Structured API responses and error handling

## Tech

- Next.js (App Router, TypeScript)
- Ethers.js v6 for contract interaction
- React Hook Form for form handling
- react-qr-code for QR rendering

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create `.env.local` in the project root:

```ini
# DEMO ONLY — do not use real private keys in development
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
RPC_URL=http://localhost:8545
CONTRACT_ADDRESS=0xYourRegistryAddress
CHAIN_EXPLORER_TX_URL=https://explorer.example/tx/
CHAIN_NAME=Local
```

Notes:
- `CHAIN_EXPLORER_TX_URL` must be the base URL prefix for transaction links, e.g. `https://etherscan.io/tx/`, `https://goerli.etherscan.io/tx/`, or your Blockscout explorer URL like `http://115.75.100.60:8067/tx/`.
- `CHAIN_NAME` is optional and only used for display.

### 3) Run the dev server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

## How to Use

1. Fill `entityType`, optionally `entityId` and `baseKey` (if `entityId` is blank, the server will compute `id = ethers.id(baseKey || entityType)`).
2. Add arbitrary key/value pairs (strings).
3. Optionally set `previousId` (bytes32). If left empty, zero hash is used.
4. Click “Preview JSON” to see the prettified JSON.
5. Click “Submit to Chain” to send data to `/api/push`.
6. After success, you will see the tx hash, a clickable explorer URL, and a QR code.

### Batch Mode

- Toggle “Submit as batch” to include a second entity.
- Both entities must have `entityType` and data fields.
- The server calls `pushBatchEntities(ids, types_, dataJsons, previousIds)`.

## API

### POST `/api/push`

Request body (single):

```ts
{
  id?: string;        // bytes32 or string; if empty server computes from baseKey/entityType
  baseKey?: string;   // used if id is empty
  entityType: string;
  dataJson: string;   // compact JSON string
  previousId?: string | null; // bytes32 or null/empty for zero hash
}
```

Request body (batch):

```ts
{
  batch: true,
  items: Array<{ id?: string; baseKey?: string; entityType: string; dataJson: string; previousId?: string | null; }>
}
```

Response:

```ts
// success
{ success: true, txHash: string, txUrl: string, chainName?: string, receipt?: any }

// error
{ success: false, error: string }
```

## Contract ABI and Interaction

- Minimal ABI is provided in `abi/ProvenanceRegistry.json` with `pushEntity` and `pushBatchEntities`.
- Server builds provider and signer from `RPC_URL` and `PRIVATE_KEY`.
- If `id` is not bytes32, server converts using `ethers.id(<string>)`.
- For empty `previousId`, server uses `ethers.ZeroHash`.

## Testing Locally

### Using Hardhat

1. Initialize a local chain:

```bash
npx hardhat node
```

2. Deploy the contract to your local chain (example with Foundry or Hardhat). After deployment, set `CONTRACT_ADDRESS` in `.env.local`.

3. Set `RPC_URL` to `http://127.0.0.1:8545` (Hardhat default).

### Using Ganache

1. Start Ganache on port 8545.
2. Deploy the contract to Ganache and set the address in `.env.local`.

### Example Input

- `entityType`: `Product`
- Fields: `name=Widget`, `batch=2024-11`, `origin=US`
- Optional: `baseKey=widget-2024-11` (server computes `id` from this if `entityId` is blank)

## Security Note

Storing a private key in `.env.local` and signing transactions server-side is acceptable for demos only. For production, use a secure KMS (AWS KMS, GCP KMS, Hashicorp Vault) or a hardware signer. Avoid exposing private keys to client-side code.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — build for production
- `npm run start` — start production server

## Deployment (Vercel)

This project is designed to run seamlessly on Vercel. Vercel will auto-detect Next.js and use the default build settings.

### Required Environment Variables

Add these environment variables in Vercel Project Settings (or via CLI):

- `PRIVATE_KEY` — signer private key (demo only)
- `RPC_URL` — RPC endpoint (e.g., Alchemy/Infura/Blockscout or local)
- `CONTRACT_ADDRESS` — deployed `ProvenanceRegistryV1` address
- `CHAIN_EXPLORER_TX_URL` — base explorer tx URL, e.g. `https://etherscan.io/tx/`
- `CHAIN_NAME` — optional chain name for UI badges
- `NEXT_PUBLIC_SITE_URL` — your site URL, e.g. `https://your-project.vercel.app`

### Vercel CLI Cheat Sheet

```bash
# Install Vercel CLI
npm i -g vercel

# Authenticate
vercel login

# Link local project to Vercel project (create if needed)
vercel link

# Add env vars (repeat for each var)
vercel env add NEXT_PUBLIC_SITE_URL production
vercel env add NEXT_PUBLIC_SITE_URL preview
vercel env add PRIVATE_KEY production
vercel env add RPC_URL production
vercel env add CONTRACT_ADDRESS production
vercel env add CHAIN_EXPLORER_TX_URL production
vercel env add CHAIN_NAME production

# Pull envs locally into .env.local (optional)
vercel env pull .env.local

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Inspect logs
vercel logs <deployment-url>
```

Notes:
- Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain (production and preview). The app uses this to build internal QR links.
- No `vercel.json` is required; Vercel auto-detects Next.js. Add one only if you need custom headers/rewrites.
- For private key management in production, use a KMS or secrets manager; avoid plain `.env` values when possible.

## Troubleshooting

- “Missing env” — Ensure `.env.local` has `PRIVATE_KEY`, `RPC_URL`, `CONTRACT_ADDRESS`, `CHAIN_EXPLORER_TX_URL`.
- “Invalid id” — If you pass a non-bytes32 `id`, server will compute using `ethers.id()`.
- Explorer link incorrect — Verify your `CHAIN_EXPLORER_TX_URL` ends with `/tx/` if required by your explorer.