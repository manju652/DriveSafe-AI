"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Zap, ArrowRight, Shield, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const perks = [
  "14-day free trial, no card required",
  "Up to 5 vehicles included",
  "Full analytics dashboard access",
  "24/7 dedicated onboarding support",
];

export default function CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative py-28 px-6 lg:px-8 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-700/20 via-pink-700/15 to-indigo-700/10 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative glass-bright rounded-[32px] p-10 lg:p-16 text-center overflow-hidden"
        >
          {/* Corner glow accents */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Animated border */}
          <div className="absolute inset-0 rounded-[32px] p-px bg-gradient-to-br from-violet-500/30 via-transparent to-pink-500/30 pointer-events-none" />

          {/* Shield icon */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={inView ? { scale: 1, rotate: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 items-center justify-center mb-8 mx-auto"
            style={{ boxShadow: "0 0 40px rgba(168,85,247,0.4), 0 0 80px rgba(236,72,153,0.2)" }}
          >
            <Shield className="w-10 h-10 text-white" />
          </motion.div>

          <h2 className="section-title text-white mb-5">
            Zero incidents starts{" "}
            <span className="gradient-text">today</span>
          </h2>
          <p className="text-white/50 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Join 1,200+ fleet operators protecting their drivers with real-time AI monitoring.
            Deploy in under 48 hours — hardware included.
          </p>

          {/* Perks */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-2 text-white/60 text-sm">
                <CheckCircle2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                {perk}
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
  href="/detection"
  className="btn-glow text-white font-bold px-10 py-5 text-lg flex items-center justify-center gap-3 group"
>
  <Zap className="w-5 h-5" />
  <span>Start Detection Free</span>
  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
</Link>
            <button className="btn-outline-glow text-white font-semibold px-10 py-5 text-lg">
              Talk to an Expert
            </button>
          </div>

          {/* Social proof */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-white/25 text-sm"
          >
            2.4M+ incidents prevented &bull; 99.2% detection accuracy &bull; SOC 2 Type II
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
