import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import Features from "@/components/Features";
import Demo from "@/components/Demo";
import Technology from "@/components/Technology";
import Testimonials from "@/components/Testimonials";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import DriverCamera from "@/components/DriverCamera";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#020008] overflow-hidden">
      <Navbar />
      <Hero />
      <Stats />
      <Features />
      <Demo />
      <Technology />
      <Testimonials />
      <CTA />
      <Footer />
    </main>
  );
}
