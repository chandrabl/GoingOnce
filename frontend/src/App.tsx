import { useEffect, useState } from "react";
import { ConnectWallet } from "./components/ConnectWallet";
import { LotCard } from "./components/LotCard";
import { TxStatusBanner } from "./components/TxStatusBanner";
import { connectWallet } from "./lib/wallet";
import { placeBid, getAuction, getWalletBalance, subscribeToBidEvents, AuctionState, TxStatus, CONTRACT_ID } from "./lib/contract";
import { classifyError } from "./lib/errors";

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [auction, setAuction] = useState<AuctionState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bidding, setBidding] = useState(false);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live sync: any bid from any wallet updates everyone's lot card.
  useEffect(() => {
    const unsubscribe = subscribeToBidEvents((bidder, amount) => {
      setAuction((prev) => (prev ? { ...prev, highestBid: amount, highestBidder: bidder, hasBids: true } : prev));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadError(null);
        const state = await getAuction(address);
        const currentBalance = await getWalletBalance(address);
        if (!cancelled) {
          setAuction(state);
          setBalance(currentBalance);
        }
      } catch (err) {
        if (!cancelled) setLoadError(classifyError(err).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address]);

  async function handleConnect() {
    setConnecting(true);
    setErrorMessage(null);
    try {
      const { address: connectedAddress } = await connectWallet();
      setAddress(connectedAddress);
    } catch (err) {
      setErrorMessage(classifyError(err).message);
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setBalance(null);
    setAuction(null);
  }

  async function handleBid(amount: number) {
    if (!address) return;
    setBidding(true);
    setErrorMessage(null);
    setTxHash(null);
    try {
      const { hash, auction: updated } = await placeBid(address, amount, setTxStatus);
      const currentBalance = await getWalletBalance(address);
      setTxHash(hash);
      setAuction(updated);
      setBalance(currentBalance);
    } catch (err) {
      setErrorMessage(classifyError(err).message);
      setTxStatus("error");
    } finally {
      setBidding(false);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__brand-mark">GoingOnce</span>
          <span className="app__brand-sub">live on-chain auction · Soroban testnet</span>
        </div>
        <ConnectWallet address={address} balance={balance} connecting={connecting} onConnect={handleConnect} onDisconnect={handleDisconnect} />
      </header>

      <TxStatusBanner status={txStatus} hash={txHash} errorMessage={txStatus === "error" ? errorMessage : null} />

      <main className="app__main">
        {!CONTRACT_ID && (
          <div className="callout callout--warn">
            No contract configured. Set <code>VITE_CONTRACT_ID</code> in <code>.env</code> after deploying (see README).
          </div>
        )}

        {!address && CONTRACT_ID && <div className="callout">Register a paddle to view the live lot and bid.</div>}

        {address && loadError && <div className="callout callout--error">{loadError}</div>}

        {address && !auction && !loadError && <div className="callout">Loading the lot from the contract…</div>}

        {auction && (
          <LotCard auction={auction} connected={!!address} address={address} bidding={bidding} onBid={handleBid} />
        )}

        {errorMessage && txStatus !== "error" && <div className="callout callout--error">{errorMessage}</div>}
      </main>

      <footer className="app__footer">
        contract: <code>{CONTRACT_ID || "not deployed yet"}</code>
      </footer>
    </div>
  );
}
