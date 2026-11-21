import { Brand } from "@/components/Brand";
import { EventDetails } from "@/components/EventDetails";
import { Faq, Footer, RsvpSection } from "@/components/Bottom";
import { Hero } from "@/components/Hero";
import { Intro } from "@/components/Intro";
import { LivePoller } from "@/components/live/LiveBits";
import { DishSignup, Games, WhoAll } from "@/components/Sections";
import { SiteNav } from "@/components/SiteNav";
import { resolveSettings } from "@/lib/settings";

export default function Home() {
  return (
    <>
      <SiteNav brand={<Brand />} />
      <main id="main">
        <Hero />
        <Intro />
        <EventDetails fallbackSettings={resolveSettings(null)} />
        <DishSignup />
        <WhoAll />
        <Games />
        <RsvpSection />
        <Faq />
      </main>
      <Footer />
      <LivePoller />
    </>
  );
}
