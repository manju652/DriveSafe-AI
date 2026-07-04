"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingUp, Zap, Clock, Shield } from "lucide-react";

const stats = [
  {
    value: 99.2,
    suffix: "%",
    label: "Detection Accuracy",
    sublabel: "Across all monitored events",
    icon: TrendingUp,
    color: "from-violet-500 to-purple-600",
    glow: "rgba(124,58,237,0.4)",
  },
  {
    value: 45,
    prefix: "<",
    suffix: "ms",
    label: "Response Time",
    sublabel: "Real-time alert latency",
    icon: Zap,
    color: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.4)",
  },
  {
    value: 24,
    suffix: "/7",
    label: "Monitoring",
    sublabel: "Continuous protection",
    icon: Clock,
    color: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.4)",
  },
  {
    value: 2.4,
    prefix: "",
    suffix: "M+",
    label: "Incidents Prevented",
    sublabel: "Across global deployments",
    icon: Shield,
    color: "from-indigo-500 to-violet-600",
    glow: "rgba(99,102,241,0.4)",
  },
];

function useCounter(target: number, duration = 2000, started: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const isDecimal = target % 1 !== 0;
    const raf = (time: number) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration, started]);

  return count;
}

function StatCard({
  stat,
  index,
  started,
}: {
  stat: (typeof stats)[0];
  index: number;
  started: boolean;
}) {
  const count = useCounter(stat.value, 1800, started);
  const Icon = stat.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={started ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="glass card-lift rounded-3xl p-8 relative overflow-hidden group"
    >
      {/* Background gradient glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-8 transition-opacity duration-500 rounded-3xl`}
      />

      {/* Dot pattern */}
      <div className="absolute inset-0 dot-pattern opacity-30 rounded-3xl" />

      <div className="relative z-10">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} p-0.5 mb-6`}
          style={{ boxShadow: `0 0 20px ${stat.glow}` }}
        >
          <div className="w-full h-full rounded-2xl bg-[#0d0118] flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Number */}
        <div className="stat-number ticker mb-1">
          {stat.prefix}
          {count}
          {stat.suffix}
        </div>

        {/* Label */}
        <div className="text-white font-semibold text-lg mb-1">{stat.label}</div>
        <div className="text-white/40 text-sm">{stat.sublabel}</div>

        {/* Bottom glow line */}
        <div
          className={`absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r ${stat.color} opacity-30 group-hover:opacity-70 transition-opacity duration-500`}
        />
      </div>
    </motion.div>
  );
}

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-24 px-6 lg:px-8 overflow-hidden">
      {/* Aurora blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-violet-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/25 text-violet-400 text-sm font-medium mb-4">
            By the numbers
          </div>
          <h2 className="section-title text-white">
            Proven at{" "}
            <span className="gradient-text">scale</span>
          </h2>
          <p className="text-white/45 mt-4 max-w-xl mx-auto text-lg">
            Deployed across fleets worldwide, our system delivers measurable safety improvements every second.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} started={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
