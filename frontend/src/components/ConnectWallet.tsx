interface ConnectWalletProps {
  address: string | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function ConnectWallet({ address, connecting, onConnect, onDisconnect }: ConnectWalletProps) {
  if (address) {
    return (
      <button className="house-btn house-btn--ghost" onClick={onDisconnect}>
        <span className="house-dot house-dot--live" />
        {truncate(address)} · disconnect
      </button>
    );
  }
  return (
    <button className="house-btn" onClick={onConnect} disabled={connecting}>
      {connecting ? "Opening wallet…" : "Register a paddle"}
    </button>
  );
}
