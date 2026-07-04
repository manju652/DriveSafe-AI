"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Eye,
  AlertTriangle,
  Navigation,
  Mic,
  Smartphone,
  ShieldCheck,
  UserCheck,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Drowsiness Detection",
    description:
      "Multi-factor drowsiness scoring using Eye Aspect Ratio, PERCLOS metric, micro-sleep detection, and head nodding patterns with sub-50ms alerting.",
    color: "from-violet-500 to-purple-700",
    glow: "rgba(124,58,237,0.35)",
    tag: "Core Safety",
  },
  {
    icon: Eye,
    title: "Eye Blink Monitoring",
    description:
      "High-frequency MediaPipe landmark tracking measures blink rate, duration, and incomplete blinks — early indicators of fatigue onset.",
    color: "from-pink-500 to-rose-700",
    glow: "rgba(236,72,153,0.35)",
    tag: "Biometrics",
  },
  {
    icon: Navigation,
    title: "Head Pose Tracking",
    description:
      "6-DoF head orientation via 3D facial landmark geometry — yaw, pitch and roll thresholds trigger staged alerts for distraction and microsleep.",
    color: "from-cyan-500 to-blue-700",
    glow: "rgba(6,182,212,0.35)",
    tag: "Pose Estimation",
  },
  {
    icon: Mic,
    title: "Yawning Detection",
    description:
      "Mouth Aspect Ratio analysis with temporal smoothing distinguishes genuine yawns from speech, providing fatigue level scoring.",
    color: "from-indigo-500 to-violet-700",
    glow: "rgba(99,102,241,0.35)",
    tag: "Expression AI",
  },
  {
    icon: Smartphone,
    title: "Phone Usage Detection",
    description:
      "YOLOv8-powered object detection identifies handheld phone usage in real-time, with automatic evidence capture and fleet reporting.",
    color: "from-orange-500 to-amber-700",
    glow: "rgba(249,115,22,0.35)",
    tag: "Object Detection",
  },
  {
    icon: ShieldCheck,
    title: "Seatbelt Detection",
    description:
      "Computer vision classifier detects seatbelt compliance at trip start and monitors throughout — logs violations with timestamp and confidence.",
    color: "from-emerald-500 to-green-700",
    glow: "rgba(16,185,129,0.35)",
    tag: "Compliance",
  },
  {
    icon: UserCheck,
    title: "Face Recognition",
    description:
      "ArcFace-based driver identity verification ensures only authorised drivers operate vehicles, with anti-spoofing liveness detection.",
    color: "from-fuchsia-500 to-pink-700",
    glow: "rgba(217,70,239,0.35)",
    tag: "Identity",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Fleet-wide safety scores, incident heatmaps, driver ranking, trip replays and custom reports — all in a real-time web dashboard.",
    color: "from-sky-500 to-cyan-700",
    glow: "rgba(14,165,233,0.35)",
    tag: "Insights",
  },
];

export default function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" ref={ref} className="relative py-28 px-6 lg:px-8 overflow-hidden">
      {/* Blobs */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-violet-700/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute top-1/3 right-0 w-80 h-80 bg-pink-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-pink-500/25 text-pink-400 text-sm font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            8 AI Detection Modules
          </div>
          <h2 className="section-title text-white mb-5">
            Every safety risk,{" "}
            <span className="gradient-text">covered</span>
          </h2>
          <p className="text-white/45 text-lg max-w-2xl mx-auto leading-relaxed">
            A complete suite of computer vision and deep learning modules running in parallel,
            monitoring every dimension of driver health and behaviour.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="glass card-lift rounded-3xl p-6 group relative overflow-hidden"
              >
                {/* Hover bg */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${f.glow} 0%, transparent 70%)`,
                  }}
                />

                {/* Tag */}
                <div className="relative z-10 mb-5 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/30 uppercase tracking-widest">
                    {f.tag}
                  </span>
                  <span className="text-xs text-white/15 font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                {/* Icon */}
                <div className="relative z-10 mb-5">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} p-0.5`}
                    style={{ boxShadow: `0 0 24px ${f.glow}` }}
                  >
                    <div className="w-full h-full rounded-2xl bg-[#0d0118]/80 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="relative z-10 text-white font-bold text-base mb-3 leading-snug">
                  {f.title}
                </h3>

                {/* Description */}
                <p className="relative z-10 text-white/45 text-sm leading-relaxed">
                  {f.description}
                </p>

                {/* Bottom separator */}
                <div
                  className={`absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r ${f.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
