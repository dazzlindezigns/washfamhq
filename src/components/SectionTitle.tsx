export function SectionTitle({
  id,
  children,
  kicker,
  tone = "dark",
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  kicker?: React.ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <h2
        id={id}
        className={`font-script text-5xl leading-tight sm:text-6xl ${
          tone === "dark" ? "text-gold-light script-glow" : "text-wine drop-shadow-[0_2px_0_rgba(233,188,85,0.6)]"
        }`}
      >
        {children}
      </h2>
      {kicker ? (
        <p className={`mx-auto mt-3 max-w-2xl text-base sm:text-lg ${tone === "dark" ? "text-cream" : "text-ink"}`}>{kicker}</p>
      ) : null}
    </div>
  );
}
