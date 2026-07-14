import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  rpc as SorobanRpc,
} from "@stellar/stellar-sdk";
import { signXdr } from "./wallet";
import { InsufficientBalanceError, UserRejectedError, classifyError } from "./errors";

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
export const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID as string;
const NETWORK_PASSPHRASE = Networks.TESTNET;
const MIN_XLM_FOR_FEES = 2;

export const server = new SorobanRpc.Server(RPC_URL, { allowHttp: false });

export type TxStatus = "idle" | "building" | "simulating" | "pending" | "success" | "error";

export interface AuctionState {
  itemName: string;
  description: string;
  startingPrice: number;
  minIncrement: number;
  endTime: number; // unix seconds
  highestBid: number;
  highestBidder: string;
  hasBids: boolean;
  admin: string;
  ended: boolean;
}

export async function assertCanAffordFee(publicKey: string): Promise<void> {
  const res = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
  if (res.status === 404) {
    throw new InsufficientBalanceError("0", String(MIN_XLM_FOR_FEES));
  }
  if (!res.ok) return;
  const data = await res.json();
  const nativeBalance = data.balances?.find((b: any) => b.asset_type === "native");
  const available = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
  if (available < MIN_XLM_FOR_FEES) {
    throw new InsufficientBalanceError(available.toFixed(2), String(MIN_XLM_FOR_FEES));
  }
}

async function loadAccount(publicKey: string) {
  return server.getAccount(publicKey);
}

async function simulateRead(publicKey: string, method: string, args: any[] = []) {
  const account = await loadAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(sim.error);
  }
  return scValToNative(sim.result!.retval);
}

export async function getAuction(publicKey: string): Promise<AuctionState> {
  const raw = await simulateRead(publicKey, "get_auction");
  return {
    itemName: raw.item_name,
    description: raw.description,
    startingPrice: Number(raw.starting_price),
    minIncrement: Number(raw.min_increment),
    endTime: Number(raw.end_time),
    highestBid: Number(raw.highest_bid),
    highestBidder: raw.highest_bidder,
    hasBids: raw.has_bids,
    admin: raw.admin,
    ended: raw.ended,
  };
}

/**
 * Places a bid: builds, simulates, signs (via the connected wallet),
 * submits, then polls Soroban RPC until the tx confirms or fails —
 * driving the pending → success/error status the UI shows.
 */
export async function placeBid(
  publicKey: string,
  amount: number,
  onStatus: (status: TxStatus) => void
): Promise<{ hash: string; auction: AuctionState }> {
  onStatus("building");
  await assertCanAffordFee(publicKey);

  const account = await loadAccount(publicKey);
  const contract = new Contract(CONTRACT_ID);
  const bidderScVal = nativeToScVal(Address.fromString(publicKey), { type: "address" });
  const amountScVal = nativeToScVal(BigInt(Math.round(amount)), { type: "i128" });

  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call("bid", bidderScVal, amountScVal))
    .setTimeout(60)
    .build();

  onStatus("simulating");
  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    onStatus("error");
    throw classifyError(new Error(sim.error));
  }
  tx = SorobanRpc.assembleTransaction(tx, sim).build();

  let signedXdr: string;
  try {
    signedXdr = await signXdr(tx.toXDR(), publicKey);
  } catch (err) {
    onStatus("error");
    const message = err instanceof Error ? err.message : String(err);
    if (message.toLowerCase().includes("reject") || message.toLowerCase().includes("declin") || message.toLowerCase().includes("cancel")) {
      throw new UserRejectedError();
    }
    throw classifyError(err);
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  onStatus("pending");
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    onStatus("error");
    throw classifyError(new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`));
  }

  const hash = sendResult.hash;
  const finalStatus = await pollTransactionStatus(hash);

  if (finalStatus.status !== "SUCCESS") {
    onStatus("error");
    throw classifyError(new Error(`Transaction ${finalStatus.status.toLowerCase()}`));
  }

  onStatus("success");
  const auction = await getAuction(publicKey);
  return { hash, auction };
}

async function pollTransactionStatus(hash: string, timeoutMs = 30_000, intervalMs = 1500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await server.getTransaction(hash);
    if (result.status !== "NOT_FOUND") {
      return result;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Timed out waiting for transaction confirmation");
}

/**
 * Real-time sync: polls Soroban RPC's getEvents for the contract's `bid`
 * events since a given ledger and calls back with each new high bid, so
 * every connected viewer's paddle board updates without re-fetching the
 * whole auction on a timer.
 */
export function subscribeToBidEvents(
  onBid: (bidder: string, amount: number) => void,
  pollMs = 4000
): () => void {
  let cancelled = false;
  let cursorLedger: number | null = null;

  (async () => {
    try {
      const latest = await server.getLatestLedger();
      cursorLedger = Math.max(latest.sequence - 100, 1);
    } catch {
      cursorLedger = 1;
    }

    while (!cancelled) {
      try {
        const events = await server.getEvents({
          startLedger: cursorLedger!,
          filters: [
            {
              type: "contract",
              contractIds: [CONTRACT_ID],
              topics: [["bid"]],
            },
          ],
          limit: 50,
        });

        for (const event of events.events) {
          const [bidder, amount] = scValToNative(event.value);
          onBid(bidder, Number(amount));
          cursorLedger = event.ledger + 1;
        }
        if (events.latestLedger) {
          cursorLedger = Math.max(cursorLedger ?? 1, events.latestLedger - 1);
        }
      } catch {
        // transient RPC hiccup — keep polling
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
  })();

  return () => {
    cancelled = true;
  };
}
