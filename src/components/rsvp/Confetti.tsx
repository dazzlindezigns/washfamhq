"use client";

/** A light, CSS-only confetti pop. Hidden under prefers-reduced-motion. */
export function Confetti({ count = 26 }: { count?: number }) {
  const colors = ["#e9bc55", "#b0141e", "#1e7a3c", "#ffffff", "#f6dc95"];
  const rand = (i: number, s: number) => {
    const x = Math.sin(i * 91.7 + s * 37.1) * 10000;
    return x - Math.floor(x);
  };
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="confetti-bit"
          style={
            {
              background: colors[i % colors.length],
              "--x": `${(rand(i, 1) - 0.5) * 520}px`,
              "--y": `${120 + rand(i, 2) * 260}px`,
              "--r": `${(rand(i, 3) - 0.5) * 900}deg`,
              animationDelay: `${rand(i, 4) * 0.15}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
