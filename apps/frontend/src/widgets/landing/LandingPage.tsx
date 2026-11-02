import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { StatsBar } from './sections/StatsBar';
import { HowItWorks } from './sections/HowItWorks';
import { ConnectionsMatter } from './sections/ConnectionsMatter';
import { ProfessionsPreview } from './sections/ProfessionsPreview';
import { GapSection } from './sections/GapSection';
import { PlanSection } from './sections/PlanSection';
import { ImportBanner } from './sections/ImportBanner';
import { FAQ } from './sections/FAQ';
import { FinalCTA } from './sections/FinalCTA';
import { Footer } from './sections/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-page text-text">
      <Header />
      <main>
        <Hero />
        <StatsBar />
        <HowItWorks />
        <ConnectionsMatter />
        <ProfessionsPreview />
        <GapSection />
        <PlanSection />
        <ImportBanner />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
