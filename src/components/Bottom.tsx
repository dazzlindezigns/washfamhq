import { eventConfig } from "@/config/event";
import { hostPhone } from "@/lib/site";
import { Brand } from "./Brand";
import { RsvpForm } from "./rsvp/RsvpForm";
import { SectionTitle } from "./SectionTitle";

export function RsvpSection() {
  const phone = hostPhone();
  return (
    <section id="rsvp" aria-labelledby="rsvp-title" className="bg-buffalo relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/55" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-4 py-14 sm:py-20">
        <SectionTitle
          id="rsvp-title"
          kicker={
            <>
              That&rsquo;s the RSVP, baby. It takes less than a minute. Tell us who&rsquo;s coming and what you&rsquo;re bringing,
              and we&rsquo;ll put you on the board.
            </>
          }
        >
          {eventConfig.rsvpSectionTitle}
        </SectionTitle>
        <div className="on-cream mt-8">
          <RsvpForm hostName={eventConfig.hostName} hostSms={phone?.sms ?? null} />
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const phone = hostPhone();
  const host = eventConfig.hostName;
  const textHost = phone ? (
    <>
      {" "}
      Or just{" "}
      <a href={phone.sms} className="font-semibold text-wine underline underline-offset-4">
        text {host} at {phone.display}
      </a>
      .
    </>
  ) : (
    <> Or just reach out to {host} directly.</>
  );

  const faqs: { q: string; a: React.ReactNode }[] = [
    {
      q: "What do I wear?",
      a: (
        <>
          Christmas pajamas. They&rsquo;re <strong>required</strong>, not suggested. Get cozy, get festive, and come ready
          to play. No PJs? Don&rsquo;t test me.
        </>
      ),
    },
    {
      q: "What do I bring?",
      a: (
        <>
          Two things: a <strong>finger-food dish</strong> and <strong>one small gift</strong> for the game prize table. Head
          to{" "}
          <a href="#dishes" className="font-semibold text-wine underline underline-offset-4">
            Dish Signup
          </a>{" "}
          and claim your category (Meats, Sides, Chips &amp; Dip, Desserts, or Drinks). We&rsquo;ve got the plates, cups,
          napkins, forks, and spoons. You bring your dish in something disposable or easy to clean,{" "}
          <strong>plus the serving utensils for it</strong> (tongs, serving spoon, whatever it needs). Got a game
          we should play? Put it on the{" "}
          <a href="#games" className="font-semibold text-wine underline underline-offset-4">
            Game Ideas
          </a>{" "}
          board.
        </>
      ),
    },
    {
      q: "Are kids welcome?",
      a: (
        <>
          Yes, yes, YES. Kids are welcome, wanted, and celebrated. Bring them in their pajamas, ready to play. Just count them
          in your RSVP so we have enough food and seats for every one of them.
        </>
      ),
    },
    {
      q: "Can I invite someone?",
      a: (
        <>
          This one&rsquo;s <strong>by invitation only</strong>, so please don&rsquo;t share the link or the flyer. If
          there&rsquo;s someone you&rsquo;d like to attend, talk to the Washingtons and they&rsquo;ll send the invite to them
          directly.
        </>
      ),
    },
    {
      q: "When do I get the address?",
      a: (
        <>
          We&rsquo;re booking a VRBO, and the address will show up right here in{" "}
          <a href="#details" className="font-semibold text-wine underline underline-offset-4">
            Event Details
          </a>{" "}
          (with a Maps link) as soon as it&rsquo;s locked in. Check back closer to Christmas Eve.
        </>
      ),
    },
    {
      q: "Can I change my RSVP?",
      a: (
        <>
          Absolutely. Come back to this page on the same phone or computer you used to RSVP and tap &ldquo;Update my
          RSVP&rdquo; in the{" "}
          <a href="#rsvp" className="font-semibold text-wine underline underline-offset-4">
            {eventConfig.rsvpSectionTitle.replace(/!$/, "")}
          </a>{" "}
          section. Change your headcount, your dish, or your answer.{textHost}
        </>
      ),
    },
  ];

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-paper on-cream">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20" data-reveal>
        <SectionTitle id="faq-title" tone="light" kicker="The stuff everybody's gonna text me about anyway.">
          Quick Questions
        </SectionTitle>
        <div className="mt-8 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border-2 border-gold-deep/70 bg-white shadow-sm open:shadow-md">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-3 text-lg font-semibold text-wine">
                {f.q}
                <svg className="faq-chevron h-5 w-5 shrink-0 transition-transform" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="px-5 pb-5 text-base leading-relaxed text-ink">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const phone = hostPhone();
  return (
    <footer className="bg-fireplace border-t-2 border-gold/50 text-cream">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center">
        <p className="font-script text-6xl text-white script-glow sm:text-7xl">Merry Christmas!</p>
        <p className="mt-4 text-lg">
          Hosted with love by {eventConfig.hostFamily}.{" "}
          {phone ? (
            <>
              Questions?{" "}
              <a href={phone.sms} className="font-semibold text-gold-light underline underline-offset-4">
                Text {eventConfig.hostName}
              </a>
              .
            </>
          ) : null}
        </p>
        <div className="mt-8 flex justify-center">
          <Brand size="footer" />
        </div>
      </div>
    </footer>
  );
}
