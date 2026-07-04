"use client";

import { useCallback, useState } from "react";
import DriverCamera, { type DriverMetrics } from "@/components/DriverCamera";
import DetectionSidebar from "@/components/DetectionSidebar";
import BottomAlert from "@/components/BottomAlert";
import LiveHeader from "@/components/LiveHeader";

const EMPTY_METRICS: DriverMetrics = {
  ear: 0,
  leftEAR: 0,
  rightEAR: 0,
  eyeClosureSeconds: 0,
  perclos: 0,
  blinkCount: 0,
  blinkRatePerMin: 0,
  avgBlinkDuration: 0,
  mar: 0,
  yawnCount: 0,
  yawnDurationSeconds: 0,
  jawOpen: 0,
  phoneDetected: false,
  phoneDurationSeconds: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  headPoseStatus: "unknown",
  gazeX: 0,
  gazeY: 0,
  fatigueScore: 0,
  riskScore: 0,
  attentionScore: 100,
  confidence: 0,
  faceDetected: false,
  drowsy: false,
  yawning: false,
  distracted: false,
  microSleep: false,
  driverStatus: "Initializing",
};

export default function DetectionPage() {
  const [metrics, setMetrics] = useState<DriverMetrics>(EMPTY_METRICS);

  const [isDetecting, setIsDetecting] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

const handleMetrics = useCallback((m: DriverMetrics) => {
  if (!isDetecting) return;

  setMetrics(m);
}, [isDetecting]);

  const alertMessage = metrics.microSleep
    ? "MICRO-SLEEP DETECTED"
    : metrics.drowsy
    ? "DROWSINESS DETECTED"
    : metrics.yawning
    ? "YAWNING DETECTED"
    : metrics.distracted
    ? `DISTRACTED — HEAD ${metrics.headPoseStatus?.toUpperCase()}`
    : null;
return (
  <div
    className="
      min-h-screen
      bg-[#070A12]
      text-white
      bg-[radial-gradient(circle_at_top_right,#1b1b3a_0%,transparent_35%),radial-gradient(circle_at_bottom_left,#13203a_0%,transparent_35%),#070A12]
    "
  >
    <LiveHeader isLive backendConnected />

    <main className="max-w-[1800px] mx-auto px-8 py-6">

      <div className="grid grid-cols-12 gap-6">

        {/* LEFT COLUMN */}
        <section className="col-span-12 xl:col-span-8">

          <div className="flex items-center justify-between mb-5">

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Live Driver Monitoring
              </h1>

              <p className="text-zinc-400 mt-1">
                AI Powered Real-Time Driver Safety Detection
              </p>
            </div>

            <div className="flex gap-3">

              <div className="rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-400">
                🟢 Face Detected
              </div>

              <div className="rounded-full border border-pink-500/20 bg-pink-500/10 px-4 py-2 text-sm text-pink-400">
                AI Monitoring
              </div>

            </div>

          </div>

          {/* Camera Card */}

          <div
            className="
              rounded-3xl
              border
              border-white/10
              bg-white/5
              backdrop-blur-xl
              shadow-2xl
              overflow-hidden
            "
          >

            <div className="h-[620px]">
  

            <DriverCamera
  onMetrics={handleMetrics}
  isDetecting={isDetecting}
  audioEnabled={audioEnabled}
/>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex items-center gap-4">

          <button
            onClick={() => {
  if (isDetecting) {
    setMetrics(EMPTY_METRICS);
  }

  setIsDetecting(!isDetecting);
}}
            className="
              rounded-2xl
              bg-gradient-to-r
              from-pink-500
              via-rose-500
              to-red-500
              px-8
              py-4
              font-semibold
              shadow-[0_0_30px_rgba(236,72,153,.35)]
              transition-all
              duration-300
              hover:scale-105
            "
          >
            {isDetecting ? "⏹ Stop Detection" : "▶ Start Detection"}
          </button>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="
              rounded-2xl
              border
              border-white/10
              bg-white/5
              backdrop-blur-xl
              px-8
              py-4
              font-semibold
              transition
              hover:bg-white/10
            "
          >
            {audioEnabled ? "🔊 Audio On" : "🔇 Audio Off"}
          </button>

        </div>

      </div>

        </section>

        {/* RIGHT COLUMN */}

        <aside className="col-span-12 xl:col-span-4">

          <DetectionSidebar
            riskScore={metrics.riskScore}
            ear={metrics.ear}
            mar={metrics.mar}
            blinkCount={metrics.blinkCount}
            yawnCount={metrics.yawnCount}
            confidence={metrics.confidence}
            attention={metrics.attentionScore}
            fatigue={metrics.fatigueScore}
          />

        </aside>

      </div>

    </main>

    <BottomAlert message={alertMessage} />

  </div>
);
}
