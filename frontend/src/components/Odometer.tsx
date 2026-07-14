interface OdometerDigitProps {
  digit: string; // "0"-"9"
}

const STRIP = "0123456789";

export function OdometerDigit({ digit }: OdometerDigitProps) {
  const index = STRIP.indexOf(digit);
  const offset = index >= 0 ? index : 0;

  return (
    <span className="odometer-cell">
      <span className="odometer-strip" style={{ transform: `translateY(-${offset * 10}%)` }}>
        {STRIP.split("").map((d) => (
          <span className="odometer-digit" key={d}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

interface OdometerProps {
  value: number;
  minDigits?: number;
  prefix?: string;
}

export function Odometer({ value, minDigits = 4, prefix = "" }: OdometerProps) {
  const digits = String(Math.max(0, Math.round(value))).padStart(minDigits, "0").split("");
  return (
    <span className="odometer">
      {prefix && <span className="odometer-prefix">{prefix}</span>}
      {digits.map((d, i) => (
        <OdometerDigit key={i} digit={d} />
      ))}
    </span>
  );
}
