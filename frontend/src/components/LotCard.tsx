import { useState } from "react";
import { Odometer } from "./Odometer";
import { Countdown } from "./Countdown";
import { AuctionState } from "../lib/contract";

interface LotCardProps {
  auction: AuctionState;
  connected: boolean;
  address: string | null;
  bidding: boolean;
  onBid: (amount: number) => void;
}

export function LotCard({ auction, connected, address, bidding, onBid }: LotCardProps) {
  const floor = auction.hasBids ? auction.highestBid + auction.minIncrement : auction.startingPrice;
  const [input, setInput] = useState(String(floor));
  const isClosed = auction.ended || Date.now() / 1000 >= auction.endTime;
  const isLeading = auction.hasBids && address === auction.highestBidder;

  function submit() {
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount < floor) return;
    onBid(amount);
  }

  return (
    <div className="lot-card">
      <div className="lot-card__eyebrow">lot 01</div>
      <h1 className="lot-card__title">{auction.itemName}</h1>
      <p className="lot-card__description">{auction.description}</p>

      <div className="lot-card__bid-block">
        <span className="lot-card__bid-label">{auction.hasBids ? "current bid (XLM)" : "starting price (XLM)"}</span>
        <Odometer value={auction.hasBids ? auction.highestBid : auction.startingPrice} minDigits={5} />
        {auction.hasBids && (
          <span className={`lot-card__bidder${isLeading ? " lot-card__bidder--you" : ""}`}>
            {isLeading ? "you're leading" : `paddle ${auction.highestBidder.slice(0, 6)}…`}
          </span>
        )}
      </div>

      <Countdown endTime={auction.endTime} ended={auction.ended} />

      {!isClosed && (
        <div className="lot-card__bid-form">
          <span className="lot-card__min">min next bid: {floor} XLM</span>
          <div className="lot-card__input-row">
            <input
              className="lot-card__input"
              type="number"
              min={floor}
              step={auction.minIncrement}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!connected || bidding}
            />
            <button
              className="house-btn"
              onClick={submit}
              disabled={!connected || bidding || Number(input) < floor}
            >
              {bidding ? "bidding…" : "place bid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
