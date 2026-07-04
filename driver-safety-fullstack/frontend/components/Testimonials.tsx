"use client";
import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Driver Safety AI reduced our fleet incident rate by 68% in the first quarter. The drowsiness alerts have prevented what could have been catastrophic accidents across 400 vehicles.",
    name: "Marcus Chen",
    title: "Fleet Safety Director",
    company: "TransGlobal Logistics",
    rating: 5,
    initials: "MC",
    color: "from-violet-500 to-purple-600",
  },
  {
    quote:
      "The detection accuracy is extraordinary. False positive rates are under 0.3% — which means drivers trust the system and don't tune it out. That credibility is everything in safety tech.",
    name: "Priya Nair",
    title: "Head of Driver Operations",
    company: "RideForward Mobility",
    rating: 5,
    initials: "PN",
    color: "from-pink-500 to-rose-600",
  },
  {
    quote:
      "Integration with our dispatch platform took 48 hours. The WebSocket alert feed is rock-solid — we've processed 12 million events without a single missed alert.",
    name: "Stefan Wolff",
    title: "CTO",
    company: "EuroRoute Systems",
    rating: 5,
    initials: "SW",
    color: "from-cyan-500 to-blue-600",
  },
  {
    quote:
      "Our insurance premiums dropped 22% after deploying Driver Safety AI. The timestamped evidence and analytics reports are exactly what insurers need to see.",
    name: "Amara Osei",
    title: "VP Risk & Compliance",
    company: "SafeHaul Africa",
    rating: 5,
    initials: "AO",
    color: "from-indigo-500 to-violet-600",
  },
  {
    quote:
      "The edge-AI deployment on Jetson hardware means our long-haul trucks stay protected even through dead zones with no connectivity. Offline resilience was our biggest requirement.",
    name: "Lisa Fontaine",
    title: "Technology Lead",
    company: "AlpineFreight SA",
    rating: 5,
    initials: "LF",
    color: "from-emerald-500 to-teal-600",
  },
];

const companies = ["TransGlobal", "RideForward", "EuroRoute", "SafeHaul", "AlpineFreight", "NovaDrive", "FleetGuard"];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a === 0 ? testimonials.length - 1 : a - 1));
  const next = () => setActive((a) => (a === testimonials.length - 1 ? 0 : a + 1));

  const t = testimonials[active];

  return (
    <section id="testimonials" ref={ref} className="relative py-28 px-6 lg:px-8 overflow-hidden">
      {/* Aurora */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-700/10 to-pink-700/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 text-violet-400 text-sm font-medium mb-5">
            <Star className="w-3.5 h-3.5 fill-violet-400" />
            Customer Stories
          </div>
          <h2 className="section-title text-white mb-5">
            Trusted by safety{" "}
            <span className="gradient-text">leaders</span>
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Fleets across six continents rely on Driver Safety AI to protect their drivers every day.
          </p>
        </motion.div>

        {/* Testimonial card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-bright rounded-3xl p-8 lg:p-12 relative overflow-hidden">
            {/* Quote icon */}
            <div className="absolute top-8 right-8 opacity-10">
              <Quote className="w-24 h-24 text-violet-400" />
            </div>

            {/* Glow */}
            <div
              className={`absolute -top-20 -left-20 w-80 h-80 bg-gradient-to-br ${t.color} opacity-10 rounded-full blur-3xl pointer-events-none transition-all duration-500`}
            />

            <div className="relative z-10">
              {/* Stars */}
              <div className="flex gap-1 mb-8">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Quote */}
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={active}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-white/80 text-xl lg:text-2xl leading-relaxed font-light mb-10"
                >
                  &ldquo;{t.quote}&rdquo;
                </motion.blockquote>
              </AnimatePresence>

              {/* Author */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`author-${active}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-white font-bold text-lg">{t.name}</div>
                    <div className="text-white/50 text-sm">{t.title}</div>
                    <div className="text-violet-400 text-sm font-medium">{t.company}</div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="flex items-center justify-between mt-10 pt-8 border-t border-violet-500/15">
                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActive(i)}
                      className={`transition-all duration-300 rounded-full ${
                        i === active
                          ? "w-8 h-2 bg-gradient-to-r from-violet-500 to-pink-500"
                          : "w-2 h-2 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prev}
                    className="w-10 h-10 rounded-full glass border border-violet-500/20 flex items-center justify-center text-white/60 hover:text-white hover:border-violet-500/50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    className="w-10 h-10 rounded-full glass border border-violet-500/20 flex items-center justify-center text-white/60 hover:text-white hover:border-violet-500/50 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logo row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20"
        >
          <p className="text-center text-white/25 text-sm mb-8 uppercase tracking-widest">Trusted by fleet operators worldwide</p>
          <div className="flex flex-wrap justify-center gap-6 lg:gap-10">
            {companies.map((co) => (
              <div key={co} className="px-5 py-3 glass rounded-xl text-white/30 font-semibold text-sm hover:text-white/60 transition-colors cursor-default">
                {co}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
