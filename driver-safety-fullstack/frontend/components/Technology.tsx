"use client";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Cpu, Network, Layers, GitBranch, ArrowRight } from "lucide-react";

const stack = [
  {
    category: "Computer Vision",
    icon: Cpu,
    color: "from-violet-500 to-purple-600",
    glow: "rgba(124,58,237,0.3)",
    techs: [
      { name: "MediaPipe", desc: "Face mesh, hand & pose landmarks at 30+ FPS" },
      { name: "OpenCV", desc: "Frame preprocessing, ROI extraction, colour space ops" },
      { name: "YOLOv8", desc: "Real-time object detection for phones, seatbelts" },
    ],
  },
  {
    category: "Deep Learning",
    icon: Network,
    color: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.3)",
    techs: [
      { name: "TensorFlow / Keras", desc: "Drowsiness LSTM classifier, blink predictor" },
      { name: "PyTorch", desc: "ArcFace identity model, transfer-learning pipeline" },
      { name: "ONNX Runtime", desc: "Optimised inference engine, cross-platform export" },
    ],
  },
  {
    category: "Backend & APIs",
    icon: Layers,
    color: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.3)",
    techs: [
      { name: "FastAPI", desc: "Sub-10ms async REST + WebSocket alert streaming" },
      { name: "Redis Streams", desc: "Durable real-time telemetry pipeline, pub/sub" },
      { name: "PostgreSQL + TimescaleDB", desc: "Time-series event storage and analytics" },
    ],
  },
  {
    category: "Infrastructure",
    icon: GitBranch,
    color: "from-indigo-500 to-violet-600",
    glow: "rgba(99,102,241,0.3)",
    techs: [
      { name: "Docker / Kubernetes", desc: "Multi-vehicle fleet orchestration at scale" },
      { name: "NVIDIA TensorRT", desc: "GPU-accelerated model optimisation, INT8 quant" },
      { name: "Jetson Edge AI", desc: "On-device inference for offline environments" },
    ],
  },
];

const pipeline = [
  { step: "Camera Input", detail: "30 FPS capture", color: "bg-violet-500" },
  { step: "Frame Processing", detail: "OpenCV preprocessing", color: "bg-purple-500" },
  { step: "Landmark Extraction", detail: "MediaPipe 468-pt mesh", color: "bg-pink-500" },
  { step: "Feature Computation", detail: "EAR · MAR · Pose", color: "bg-rose-500" },
  { step: "Model Inference", detail: "ONNX RT <15ms", color: "bg-orange-500" },
  { step: "Alert Engine", detail: "WebSocket push", color: "bg-amber-500" },
];

export default function Technology() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="technology" ref={ref} className="relative py-28 px-6 lg:px-8 overflow-hidden">
      {/* Blobs */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-700/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-pink-700/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/25 text-indigo-400 text-sm font-medium mb-5">
            <Cpu className="w-3.5 h-3.5" />
            Technology Stack
          </div>
          <h2 className="section-title text-white mb-5">
            Built on{" "}
            <span className="gradient-text">production-grade</span> AI
          </h2>
          <p className="text-white/45 text-lg max-w-2xl mx-auto">
            Every layer of the stack is chosen for accuracy, latency, and reliability — from edge inference to cloud analytics.
          </p>
        </motion.div>

        {/* Detection pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="glass rounded-3xl p-8 mb-10 overflow-x-auto"
        >
          <p className="text-white/40 text-xs font-mono uppercase tracking-widest mb-6">Detection Pipeline</p>
          <div className="flex items-center gap-0 min-w-max">
            {pipeline.map((step, i) => (
              <div key={step.step} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${step.color} shadow-lg`}
                    style={{ boxShadow: `0 0 12px ${step.color.includes("violet") ? "#8b5cf6" : step.color.includes("purple") ? "#a855f7" : step.color.includes("pink") ? "#ec4899" : step.color.includes("rose") ? "#f43f5e" : step.color.includes("orange") ? "#f97316" : "#f59e0b"}` }}
                  />
                  <div className="text-center">
                    <div className="text-white text-xs font-semibold whitespace-nowrap">{step.step}</div>
                    <div className="text-white/35 text-xs whitespace-nowrap">{step.detail}</div>
                  </div>
                </div>
                {i < pipeline.length - 1 && (
                  <div className="flex items-center mx-2 mb-6">
                    <div className="w-8 h-px bg-gradient-to-r from-violet-500/40 to-pink-500/40" />
                    <ArrowRight className="w-3 h-3 text-white/20 -ml-1" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tech stack grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stack.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.category}
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.15 + i * 0.1 }}
                className="glass card-lift rounded-3xl p-6 group relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                  style={{ background: `radial-gradient(circle at 20% 20%, ${s.glow} 0%, transparent 65%)` }}
                />

                <div className="relative z-10">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} p-0.5 mb-5`}
                    style={{ boxShadow: `0 0 20px ${s.glow}` }}>
                    <div className="w-full h-full rounded-2xl bg-[#0d0118]/80 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-5 uppercase tracking-wide">{s.category}</h3>

                  <div className="flex flex-col gap-4">
                    {s.techs.map((tech) => (
                      <div key={tech.name}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${s.color}`} />
                          <span className="text-white text-sm font-semibold">{tech.name}</span>
                        </div>
                        <p className="text-white/40 text-xs leading-relaxed pl-3.5">{tech.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Performance numbers row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-5"
        >
          {[
            { value: "468", label: "Facial Landmarks", suffix: "pts" },
            { value: "<15", label: "Model Inference", suffix: "ms" },
            { value: "30+", label: "FPS Processing", suffix: "" },
            { value: "INT8", label: "Quantisation", suffix: "" },
          ].map((item) => (
            <div key={item.label} className="glass rounded-2xl p-5 text-center">
              <div className="text-2xl font-black text-white mb-1">
                {item.value}
                <span className="text-violet-400 text-lg">{item.suffix}</span>
              </div>
              <div className="text-white/40 text-xs">{item.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
