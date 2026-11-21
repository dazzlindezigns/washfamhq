import { eventConfig } from "@/config/event";

export function Intro() {
  return (
    <section aria-labelledby="intro-title" className="bg-paper on-cream relative overflow-hidden">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20" data-reveal>
        <h2 id="intro-title" className="flex flex-col items-center">
          <span className="font-script text-4xl text-wine sm:text-6xl">The Night Before Christmas&hellip;</span>
          <span className="mt-2 inline-block -rotate-1 rounded-md bg-plaid px-4 py-1 font-script text-3xl text-white shadow-md sm:text-5xl">
            Game Night Edition!
          </span>
        </h2>
        <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink">
          <p>
            <strong className="font-semibold">Liiisten. You&rsquo;re invited.</strong> The Washingtons are taking over a VRBO on
            Christmas Eve, and we want ALL of y&rsquo;all there: in your coziest Christmas PJs, with a dish in one hand and
            your game face on.
          </p>
          <p>
            It&rsquo;s going to be a {eventConfig.toneLine} night of family, food, laughter, and a little friendly
            competition. I&rsquo;m not playing games&hellip; well, actually, we are.
          </p>
          <p className="font-medium text-wine">
            So RSVP, claim your dish, and let&rsquo;s make some memories. Love y&rsquo;all. &mdash; {eventConfig.hostName}
          </p>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-2" aria-label="What the night is about">
          {["Games", "Cards", "Laughter", "Family", "Food"].map((t) => (
            <li key={t} className="rounded-full border-2 border-gold-deep bg-plaid px-4 py-1.5 font-script text-xl text-white shadow">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
