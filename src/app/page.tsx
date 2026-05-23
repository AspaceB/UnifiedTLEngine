import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <HowItWorks />
        <Dashboard />
      </main>
      <Footer />
    </>
  );
}
