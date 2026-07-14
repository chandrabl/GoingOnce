import { useEffect, useState } from "react";

interface CountdownProps {
  endTime: number; // unix seconds
  ended: boolean;
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function Countdown({ endTime, ended }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now() / 1000);

  useEffect(() => {
    if (ended) return;
    const interval = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => clearInterval(interval);
  }, [ended]);

  const remaining = endTime - now;
  const isClosed = ended || remaining <= 0;

  if (isClosed) {
    return <span className="countdown countdown--closed">HAMMER FALLEN · LOT CLOSED</span>;
  }

  return (
    <span className={`countdown${remaining < 60 ? " countdown--urgent" : ""}`}>
      closes in {formatRemaining(remaining)}
    </span>
  );
}
