"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Eye, AlertTriangle, Activity, Wifi, Camera, Shield, ChevronRight, CheckCircle2 } from "lucide-react";

const alerts = [
  { type: "warning", msg: "Drowsiness detected — eye closure 0.21", time: "00:04:12", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { type: "critical", msg: "Head down event — pitch angle 28°", time: "00:07:45", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  { type: "info", msg: "Seatbelt compliance confirmed", time: "00:00:03", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
  { type: "warning", msg: "Yawn detected — MAR 0.62", time: "00:11:30", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  { type: "critical", msg: "Phone usage detected — confidence 97%", time: "00:15:02", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
];

const metrics = [
  { label: "Attention", value: 94, color: "from-violet-500 to-purple-500" },
  { label: "Fatigue", value: 12, color: "from-green-500 to-emerald-500", invert: true },
  { label: "Focus", value: 88, color: "from-cyan-500 to-blue-500" },
  { label: "Risk", value: 8, color: "from-yellow-500 to-orange-500", invert: true },
];

// Static wave points — fixed values, no Math.random(), no Date, no window check
// Pure deterministic numbers so SSR and client render identically
const WAVE_D =
  "M 0 58 L 2 55 L 4 50 L 6 45 L 8 43 L 10 45 L 12 50 L 14 56 L 16 60 L 18 62 " +
  "L 20 60 L 22 55 L 24 49 L 26 44 L 28 42 L 30 44 L 32 50 L 34 57 L 36 62 L 38 64 " +
  "L 40 61 L 42 55 L 44 48 L 46 43 L 48 41 L 50 44 L 52 50 L 54 57 L 56 63 L 58 65 " +
  "L 60 62 L 62 56 L 64 49 L 66 44 L 68 42 L 70 45 L 72 51 L 74 58 L 76 63 L 78 65 " +
  "L 80 62 L 82 55 L 84 48 L 86 43 L 88 41 L 90 44 L 92 51 L 94 58 L 96 63 L 98 65";

function WaveChart({ color, id }: { color: string; id: string }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-16" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={WAVE_D + " L 98 100 L 0 100 Z"} fill={`url(#${id})`} />
      <path d={WAVE_D} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [activeAlert, setActiveAlert] = useState(0);
  const [scanY, setScanY] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setScanY((y) => (y >= 100 ? 0 : y + 0.6)), 16);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveAlert((a) => (a + 1) % alerts.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="demo" ref={ref} className="relative py-28 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-violet-700/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/25 text-cyan-400 text-sm font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 live-dot" />
            Live Detection Dashboard
          </div>
          <h2 className="section-title text-white mb-5">
            See it work in{" "}
            <span className="gradient-text">real-time</span>
          </h2>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            A full-stack monitoring pipeline — from camera feed to alert — running in under 45ms.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left panel — camera + face mesh */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="lg:col-span-2 glass rounded-3xl overflow-hidden"
          >
            {/* Panel header */}
            <div className="px-5 py-3.5 border-b border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-medium text-white/70">Driver Camera</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400 font-mono">LIVE</span>
              </div>
            </div>

            {/* Camera view */}
            <div className="relative bg-[#04000d] aspect-[4/3] overflow-hidden">
              {/* Scan line */}
              <div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent pointer-events-none z-10"
                style={{ top: `${scanY}%` }}
              />

              {/* Face detection box */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-36 h-44">
                {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2",
                  "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((cls, i) => (
                  <div key={i} className={`absolute w-5 h-5 border-violet-400 ${cls}`} />
                ))}
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 border border-violet-500/20 rounded-sm"
                />
              </div>

              {/* Face mesh landmarks */}
              {Array.from({ length: 36 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[3px] h-[3px] rounded-full bg-violet-400/50"
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                  style={{
                    left: `${35 + (i % 9) * 3.5}%`,
                    top: `${25 + Math.floor(i / 9) * 12}%`,
                  }}
                />
              ))}

              {/* Eye indicators */}
              {[{ left: "33%", top: "36%" }, { left: "56%", top: "36%" }].map((pos, i) => (
                <div key={i} className="absolute" style={pos}>
                  <div className="w-9 h-4 rounded-full border border-cyan-400/50 flex items-center justify-center">
                    <motion.div
                      animate={{ scaleY: [1, 0.15, 1] }}
                      transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-2 h-2 rounded-full bg-cyan-400/80"
                    />
                  </div>
                </div>
              ))}

              {/* Overlays */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#020008]/80 border border-violet-500/30 backdrop-blur-sm">
                  <span className="text-violet-400 text-xs font-mono">EAR 0.31</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#020008]/80 border border-cyan-500/30 backdrop-blur-sm">
                  <span className="text-cyan-400 text-xs font-mono">MAR 0.18</span>
                </div>
              </div>

              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-green-500/15 border border-green-500/30 backdrop-blur-sm">
                <span className="text-green-400 text-xs font-mono font-semibold">AWAKE</span>
              </div>

              {/* Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#04000d]/50 to-transparent pointer-events-none" />
            </div>

            {/* Bottom stats */}
            <div className="grid grid-cols-2 divide-x divide-violet-500/10 border-t border-violet-500/10">
              {[
                { label: "FPS", value: "30", icon: Activity },
                { label: "Confidence", value: "98.4%", icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-4">
                  <Icon className="w-4 h-4 text-violet-400/60" />
                  <div>
                    <div className="text-white font-bold text-sm">{value}</div>
                    <div className="text-white/35 text-xs">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Middle panel — metrics */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-2 flex flex-col gap-5"
          >
            {/* Metric cards */}
            {metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, x: 20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/60 text-sm font-medium">{m.label}</span>
                  <span className="text-white font-bold text-lg font-mono">
                    {m.invert ? m.value : m.value}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${m.color}`}
                    initial={{ width: "0%" }}
                    animate={inView ? { width: `${m.value}%` } : {}}
                    transition={{ duration: 1.2, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-3 h-12 opacity-60">
                  <WaveChart
                      id={`wc-${i}`}
                      color={m.color.includes("violet") ? "#8b5cf6" : m.color.includes("green") ? "#10b981" : m.color.includes("cyan") ? "#06b6d4" : "#f59e0b"}
                    />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Right panel — alerts */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="lg:col-span-1 glass rounded-3xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-3.5 border-b border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white/70">Alerts</span>
              </div>
              <span className="text-xs font-mono text-white/30">Trip #4821</span>
            </div>

            <div className="flex-1 overflow-hidden p-4 flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {alerts.map((alert, i) => (
                  <motion.div
                    key={alert.msg}
                    layout
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{
                      opacity: i === activeAlert ? 1 : 0.45,
                      y: 0,
                      scale: i === activeAlert ? 1 : 0.97,
                    }}
                    transition={{ duration: 0.4 }}
                    className={`rounded-xl border px-3 py-3 ${alert.bg} cursor-pointer transition-all`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${alert.color.replace("text-", "bg-")}`} />
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${alert.color} mb-0.5`}>
                          {alert.type.toUpperCase()}
                        </p>
                        <p className="text-white/70 text-xs leading-snug line-clamp-2">{alert.msg}</p>
                        <p className="text-white/25 text-xs mt-1 font-mono">{alert.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="px-4 py-4 border-t border-violet-500/10">
              <button className="w-full flex items-center justify-center gap-2 text-violet-400 text-xs font-medium hover:text-violet-300 transition-colors py-2 rounded-xl border border-violet-500/20 hover:border-violet-500/40">
                View full log <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Bottom feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {["Edge AI processing", "On-device inference", "Encrypted telemetry", "Zero cloud latency", "Offline capable"].map((pill) => (
            <div key={pill} className="flex items-center gap-2 px-4 py-2 glass rounded-full text-sm text-white/50">
              <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
              {pill}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
