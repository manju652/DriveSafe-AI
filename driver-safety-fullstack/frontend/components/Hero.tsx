"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Play, ChevronRight, AlertCircle, Eye, Activity } from "lucide-react";
import Link from "next/link";
export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 25 });
  const blobX = useTransform(springX, [0, 1], [-30, 30]);
  const blobY = useTransform(springY, [0, 1], [-20, 20]);
  const [scanPos, setScanPos] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setScanPos((p) => (p >= 100 ? 0 : p + 0.5));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [mouseX, mouseY]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg pt-20"
    >
      {/* Aurora blobs */}
      <div className="aurora">
        <div className="aurora-1" />
        <div className="aurora-2" />
        <div className="aurora-3" />
      </div>

      {/* Parallax floating blobs */}
      <motion.div
        style={{ x: blobX, y: blobY }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        aria-hidden
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-transparent blur-3xl" />
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — text */}
          <div>
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-bright text-sm font-medium text-violet-300 mb-8"
            >
              <div className="relative w-2 h-2">
                <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                <div className="absolute inset-0 rounded-full bg-green-400 pulse-ring" />
              </div>
              AI-Powered Real-Time Monitoring
            </motion.div>

            {/* Hero title */}
            <motion.h1
              className="hero-title text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Real-Time{" "}
              <span className="gradient-text">Driver<br />Safety</span>{" "}
              &amp; Health<br />
              <span className="text-white/90">Monitoring</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg lg:text-xl text-white/55 leading-relaxed max-w-xl mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              Advanced AI-powered monitoring system using MediaPipe, Computer Vision
              and Deep Learning to detect drowsiness, distraction, fatigue and unsafe
              driving behaviour.
            </motion.p>

            {/* Buttons */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55 }}
            ><Link
  href="/dashboard"
  className="btn-glow text-white font-semibold px-8 py-4 text-base flex items-center gap-3"
>
              <span>Start Detection</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
             <Link
  href="/detection"
  className="btn-outline-glow text-white font-medium px-8 py-4 text-base flex items-center gap-3"
>
  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
    <Play className="w-4 h-4 fill-violet-400 text-violet-400" />
  </div>

  <span>Live Demo</span>
</Link>
            </motion.div>

            {/* Trust line */}
            <motion.div
              className="mt-10 flex items-center gap-6 text-white/35 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.75 }}
            >
              <span>No credit card required</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>GDPR compliant</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>SOC 2 certified</span>
            </motion.div>
          </div>

          {/* Right — floating dashboard */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* Glow behind card */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-pink-600/15 rounded-3xl blur-3xl scale-95" />

            {/* Main dashboard card */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative glass-bright rounded-3xl overflow-hidden dashboard-glow"
            >
              {/* Dashboard header */}
              <div className="px-5 py-4 border-b border-violet-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
                  LIVE MONITORING
                </div>
                <div className="text-xs text-white/30 font-mono">23:41:07</div>
              </div>

              {/* Camera feed simulation */}
              <div className="relative aspect-video bg-[#070010] overflow-hidden">
                {/* Animated scan line */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-70 pointer-events-none"
                  style={{ top: `${scanPos}%` }}
                />

                {/* Face detection box */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-36">
                  {/* Corners */}
                  {[
                    "top-0 left-0 border-t-2 border-l-2",
                    "top-0 right-0 border-t-2 border-r-2",
                    "bottom-0 left-0 border-b-2 border-l-2",
                    "bottom-0 right-0 border-b-2 border-r-2",
                  ].map((cls, i) => (
                    <div
                      key={i}
                      className={`absolute w-4 h-4 border-violet-400 ${cls}`}
                    />
                  ))}
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-violet-400 blur-[1px]" />
                </div>

                {/* Eye tracking indicators */}
                <div className="absolute top-[35%] left-[38%] w-8 h-4 rounded-full border border-cyan-400/60 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400/80" />
                </div>
                <div className="absolute top-[35%] right-[38%] w-8 h-4 rounded-full border border-cyan-400/60 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400/80" />
                </div>

                {/* Face mesh dots */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-0.5 h-0.5 rounded-full bg-violet-400/40"
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.08 }}
                    style={{
                      left: `${38 + (i % 6) * 4.5}%`,
                      top: `${30 + Math.floor(i / 6) * 10}%`,
                    }}
                  />
                ))}

                {/* Status overlay */}
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-500/20 border border-green-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                    <span className="text-green-400 text-xs font-mono font-semibold">ALERT</span>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-500/20 border border-violet-500/30">
                    <Eye className="w-3 h-3 text-violet-400" />
                    <span className="text-violet-400 text-xs font-mono">EAR 0.28</span>
                  </div>
                </div>

                {/* Dark vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#07001a]/60 to-transparent pointer-events-none" />
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-0 divide-x divide-violet-500/15">
                {[
                  { label: "Drowsiness", value: "Low", color: "text-green-400", icon: Activity },
                  { label: "Distraction", value: "None", color: "text-green-400", icon: AlertCircle },
                  { label: "Fatigue", value: "7%", color: "text-yellow-400", icon: Eye },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1 py-4 px-3">
                    <Icon className={`w-4 h-4 ${color} opacity-70`} />
                    <span className={`text-sm font-bold ${color}`}>{value}</span>
                    <span className="text-white/35 text-xs">{label}</span>
                  </div>
                ))}
              </div>

              {/* EEG/pulse viz */}
              <div className="px-5 py-4 border-t border-violet-500/15">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/40 text-xs font-mono">ATTENTION SCORE</span>
                  <span className="text-white text-xs font-bold font-mono">94%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500"
                    initial={{ width: "0%" }}
                    animate={{ width: "94%" }}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Floating mini cards */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -left-6 top-12 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl border border-violet-500/20"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <div className="text-xs text-white/40">Blink Rate</div>
                <div className="text-sm font-bold text-white">14 /min</div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -right-6 bottom-24 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl border border-pink-500/20"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500/30 to-violet-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <div className="text-xs text-white/40">Head Pose</div>
                <div className="text-sm font-bold text-white">±3° yaw</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#020008] to-transparent pointer-events-none" />
    </section>
  );
}
