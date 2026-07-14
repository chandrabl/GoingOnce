/**
 * Distinct, typed error classes so the UI can render a specific message
 * per failure mode instead of one generic banner.
 */

export class WalletNotFoundError extends Error {
  constructor(walletName: string) {
    super(`${walletName} isn't installed or isn't available in this browser.`);
    this.name = "WalletNotFoundError";
  }
}

export class UserRejectedError extends Error {
  constructor() {
    super("The transaction was rejected in the wallet.");
    this.name = "UserRejectedError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor(available: string, required: string) {
    super(
      `This account doesn't hold enough XLM to cover the network fee. ` +
        `Available: ${available} XLM, needed: at least ${required} XLM.`
    );
    this.name = "InsufficientBalanceError";
  }
}

export class BidTooLowError extends Error {
  constructor() {
    super("Someone else already bid at or above that amount. Raise your bid and try again.");
    this.name = "BidTooLowError";
  }
}

export class AuctionEndedError extends Error {
  constructor() {
    super("This lot has closed — no more bids are accepted.");
    this.name = "AuctionEndedError";
  }
}

export class ContractCallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractCallError";
  }
}

/**
 * Normalizes errors thrown by the wallets-kit / Soroban RPC / simulation
 * layer into one of the typed errors above, based on substrings those
 * layers are known to throw.
 */
export function classifyError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("not installed") || lower.includes("not detected") || lower.includes("no wallet")) {
    return new WalletNotFoundError("The selected wallet");
  }
  if (
    lower.includes("rejected") ||
    lower.includes("declined") ||
    lower.includes("user denied") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return new UserRejectedError();
  }
  if (lower.includes("insufficient") || lower.includes("underfunded")) {
    return new InsufficientBalanceError("?", "?");
  }
  if (lower.includes("bid too low") || lower.includes("already hold the highest bid")) {
    return new BidTooLowError();
  }
  if (lower.includes("auction has closed") || lower.includes("already ended")) {
    return new AuctionEndedError();
  }
  return new ContractCallError(message);
}
