import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <Dashboard />
      </main>
      <Footer />
    </>
  );
}
