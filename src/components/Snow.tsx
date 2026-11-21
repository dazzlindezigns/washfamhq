/** Gentle CSS-only snowfall. No JS; hidden entirely under prefers-reduced-motion. */
export function Snow({ count = 28 }: { count?: number }) {
  // Deterministic pseudo-random so server + client markup match.
  const rand = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const size = 2 + rand(i, 1) * 4;
        return (
          <span
            key={i}
            className="snowflake"
            style={
              {
                left: `${rand(i, 2) * 100}%`,
                width: size,
                height: size,
                opacity: 0.35 + rand(i, 3) * 0.5,
                animationDuration: `${9 + rand(i, 4) * 10}s`,
                animationDelay: `${-rand(i, 5) * 18}s`,
                "--drift": `${(rand(i, 6) - 0.5) * 80}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

export function Twinkles() {
  const spots = [
    { l: "6%", t: "18%", d: "0s" },
    { l: "18%", t: "8%", d: "1.1s" },
    { l: "88%", t: "14%", d: "0.6s" },
    { l: "94%", t: "46%", d: "1.8s" },
    { l: "4%", t: "62%", d: "2.2s" },
    { l: "52%", t: "4%", d: "1.4s" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {spots.map((s, i) => (
        <span
          key={i}
          className="twinkle absolute h-1.5 w-1.5 rounded-full bg-gold-light shadow-[0_0_12px_4px_rgba(246,220,149,0.6)]"
          style={{ left: s.l, top: s.t, animationDelay: s.d }}
        />
      ))}
    </div>
  );
}
