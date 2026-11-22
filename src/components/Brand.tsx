import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

const LOGO_FILE = "washfam-hq-logo.png";

function hasLogo() {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "images", LOGO_FILE));
  } catch {
    return false;
  }
}

/**
 * WashFam HQ brand mark. Drop the logo at public/images/washfam-hq-logo.png and it
 * replaces the text wordmark automatically on the next build.
 */
export function Brand({ size = "nav" }: { size?: "nav" | "footer" }) {
  const big = size === "footer";
  if (hasLogo()) {
    return (
      <Image
        src={`/images/${LOGO_FILE}`}
        alt="The WashFam HQ"
        width={big ? 768 : 168}
        height={big ? 512 : 112}
        sizes={big ? "(min-width: 640px) 340px, 260px" : "84px"}
        className={`mix-blend-lighten ${big ? "h-auto w-[260px] sm:w-[340px]" : "h-14 w-auto"}`}
        priority={!big}
      />
    );
  }
  return (
    <span role="img" className="inline-flex items-baseline gap-1 leading-none" aria-label="WashFam HQ">
      <span aria-hidden="true" className={`font-script text-white ${big ? "text-4xl" : "text-2xl"} drop-shadow-[0_2px_0_rgba(0,0,0,0.6)]`}>
        WashFam
      </span>
      <span
        aria-hidden="true"
        className={`font-display text-plaid-bright ${big ? "text-4xl" : "text-2xl"} [-webkit-text-stroke:1px_#e9bc55] [paint-order:stroke_fill]`}
      >
        HQ
      </span>
    </span>
  );
}
