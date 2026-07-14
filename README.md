# GoingOnce

A single-lot, live-bidding auction on Soroban. One lot, a rising floor
price, a countdown to close, and a brass-and-ledger paddle board where
the high bid rolls forward like a mechanical odometer the instant
anyone outbids the room — driven entirely by contract events, not
polling refreshes.

Built for Level 2 (multi-wallet + smart-contract-deployment track):
multi-wallet connect, a deployed testnet contract, frontend→contract
calls, live event sync, and full transaction status tracking.

## Why this project

| Requirement | Where it lives |
|---|---|
| Multi-wallet integration | `frontend/src/lib/wallet.ts` — StellarWalletsKit with Freighter, xBull, Albedo, Lobstr, Hana |
| 3+ error types handled | `frontend/src/lib/errors.ts` — `WalletNotFoundError`, `UserRejectedError`, `InsufficientBalanceError`, `BidTooLowError`, `AuctionEndedError` |
| Contract deployed on testnet | `contracts/goingonce/` + `scripts/deploy.sh` |
| Contract called from frontend | `frontend/src/lib/contract.ts` — `bid`, `get_auction`, `end_auction` |
| Transaction status visible | `frontend/src/components/TxStatusBanner.tsx` — building → simulating → pending → success/error |
| Real-time event sync | `subscribeToBidEvents` polls Soroban RPC `getEvents` for `bid` topics; every connected viewer's odometer rolls forward the instant a new bid lands |

## A note on scope: this is a bidding ledger, not an escrow

`bid()` records the highest bid and bidder on-chain and enforces the
increment/close-time rules, but it does not move XLM. Actually settling
payment (transferring funds from the winning bidder, refunding outbid
bidders automatically) would mean integrating the native asset's token
contract and holding funds in escrow — a meaningfully bigger scope than
a Level 2 project, and one that introduces real financial risk if
rushed. Being upfront about this in the submission is safer than
implying funds move when they don't. If you want to extend it, the
natural next step is wiring `bid()` to a `token::Client::transfer` call
against the native SAC, holding the bid in the contract's own account,
and refunding the previous highest bidder inside the same call.

## Project structure

```
goingonce/
├── contracts/
│   └── goingonce/          # Soroban contract (Rust)
│       ├── src/lib.rs
│       └── src/test.rs
├── frontend/                # React + Vite + TypeScript
│   └── src/
│       ├── lib/             # wallet.ts, contract.ts, errors.ts
│       └── components/      # Odometer, Countdown, LotCard, ConnectWallet, TxStatusBanner
└── scripts/
    └── deploy.sh            # build → optimize → deploy → list the lot
```

## Contract

`contracts/goingonce/src/lib.rs` exposes:

- `initialize(admin, item_name, description, starting_price, min_increment, end_time)` — lists the lot once, at deploy time.
- `bid(bidder, amount)` — requires the bidder's signature; enforces the floor (starting price, or current high + increment), blocks a bidder from outbidding themselves, and rejects bids after the close time. Emits a `bid` event with `(bidder, amount)`.
- `end_auction(caller)` — the admin can close early; anyone can close once the end time has passed, so a stalled auction doesn't sit open waiting on the admin. Emits `ended` with the winner and final price.
- `get_auction()` — reads the full lot state.

Run the tests:

```bash
cd contracts/goingonce
cargo test
```

## Deploying the contract yourself

You'll need [stellar-cli](https://developers.stellar.org/docs/tools/developer-tools/cli) and a funded testnet identity.

```bash
stellar keys generate admin --network testnet --fund
./scripts/deploy.sh "Vintage Star Chart" "Hand-inked celestial map, circa 1890" 1000 100 3600
```

(That lists a lot starting at 1000 XLM, minimum 100 XLM raises, closing
in one hour.) The script prints the deployed contract ID — put it in
`frontend/.env` as `VITE_CONTRACT_ID`.

> Note: the contract address, transaction hash, and demo link below are
> placeholders. Deploy with the script above and place a real bid to
> get your own values — these only exist once you actually sign and
> broadcast on testnet, so they can't be filled in for you.

**Deployed contract address:** `PASTE_YOUR_CONTRACT_ID_HERE`
**Transaction hash of a bid call:** `PASTE_A_TX_HASH_HERE` (verify at `https://stellar.expert/explorer/testnet/tx/<hash>`)
**Live demo:** `PASTE_YOUR_VERCEL_OR_NETLIFY_URL_HERE`

## Running the frontend locally

```bash
cd frontend
npm install
cp .env.example .env   # then fill in VITE_CONTRACT_ID
npm run dev
```

Open the printed local URL, connect a wallet set to **Testnet**, and
place a bid at or above the floor shown. Open the same URL in a second
browser/tab with a different wallet to watch the odometer roll forward
live as the other bid lands.

## Error handling

| Scenario | How it's surfaced |
|---|---|
| Wallet not installed | `WalletNotFoundError` — shown inline, doesn't crash the app |
| Wallet rejects the signing prompt | `UserRejectedError` — caught around `signXdr` |
| Insufficient XLM for fees | `InsufficientBalanceError` — checked via Horizon before the transaction is even built |
| Bid too low / already leading | `BidTooLowError` — the contract itself enforces the floor; the frontend also disables the bid button below it |
| Auction closed | `AuctionEndedError` — the contract rejects bids after `end_time`; the UI hides the bid form once the countdown hits zero |

## Transaction status tracking

Every bid moves through visible states in `TxStatusBanner`:
`building` → `simulating` → `pending` → `success` (with a Stellar
Expert link) or `error` (with the specific reason).

## Deploying the frontend

Any static host works (Vercel, Netlify, Cloudflare Pages). Build
command `npm run build`, output directory `dist/`, set
`VITE_CONTRACT_ID` as an environment variable in the host's dashboard.

## Screenshot

Add a screenshot of the wallet-select modal here before submitting:

`![wallet options](./docs/wallet-options.png)`
