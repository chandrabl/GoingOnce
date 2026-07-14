<div align="center">
  
# 🔨 GoingOnce - Live On-Chain Auction

**A single-lot, live-bidding auction built on Stellar & Soroban smart contracts.**  
*GoingOnce features a rising floor price, a countdown, and a brass-and-ledger paddle board where the high bid rolls forward instantly via real-time event syncing.*

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue.svg)](https://stellar.org/soroban)
[![Vite](https://img.shields.io/badge/Frontend-Vite_React-purple.svg)](https://vitejs.dev/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black.svg?logo=vercel)](https://going-once-delta.vercel.app/)

### 🚀 [▶️ Live App](https://going-once-delta.vercel.app/)

</div>

<br />

## ✨ Key Features

1. **Multi-Wallet Integration:** Supports Freighter, xBull, Albedo, Lobstr, and Hana via StellarWalletsKit.
2. **Real-time Event Sync:** `subscribeToBidEvents` polls the Soroban RPC; every viewer's odometer rolls forward the instant a new bid lands.
3. **Transaction Status Tracking:** Visual pipeline moving from building → simulating → pending → success/error.
4. **Comprehensive Error Handling:** Gracefully handles `WalletNotFoundError`, `UserRejectedError`, `InsufficientBalanceError`, `BidTooLowError`, and `AuctionEndedError`.

---

## 🌐 Smart Contract Deployment (Stellar Testnet)

The smart contract acts as the on-chain bidding ledger of record and is deployed to the **Stellar Testnet**.

| Contract | Contract ID | Explorer |
|---|---|---|
| 📜 **GoingOnce** | `CDP542OQHSRO6E5TGSBQZ3GCNELMUL6CTP4GC3SMAIW4MNU3G2VU5DOU` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDP542OQHSRO6E5TGSBQZ3GCNELMUL6CTP4GC3SMAIW4MNU3G2VU5DOU) |

**Network:** Stellar Testnet  
**RPC URL:** `https://soroban-testnet.stellar.org`  
**Horizon URL:** `https://horizon-testnet.stellar.org`  

### 🔗 Sample On-Chain Transactions

| Action | Transaction Hash | Explorer |
|---|---|---|
| 💸 Bid Placed | `ef0c15d1f5488fd3ae01e03635f419ba778d5eba3f61c174bbfb6d4db13b27c0` | [View](https://stellar.expert/explorer/testnet/tx/ef0c15d1f5488fd3ae01e03635f419ba778d5eba3f61c174bbfb6d4db13b27c0) |

---

## 📸 Application Showcase

### 1. Product UI (Placing a Bid)

![Product UI](images/product%20ui.png)

### 2. Wallet Connection Options

![Wallet Options](images/wallet%20options.png)

### 3. Verified Bid On-Chain

![Verified Bid](images/verified%20bid.png)

---

## 🏗️ Architecture

This project is split into three main components:

1. **Smart Contract (`contracts/goingonce/`)**
   - Written in Rust for Soroban.
   - Exposes `initialize`, `bid`, `end_auction`, and `get_auction`.
2. **Frontend Application (`frontend/`)**
   - React + Vite Single Page Application.
   - Integrates with `@creit.tech/stellar-wallets-kit`.
3. **Deployment Scripts (`scripts/`)**
   - Automates building, optimizing, deploying, and initializing the contract.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- Rust + `wasm32-unknown-unknown` target
- Stellar CLI (`cargo install --locked stellar-cli`)

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```
