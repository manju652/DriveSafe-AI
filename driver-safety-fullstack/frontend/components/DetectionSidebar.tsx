"use client";

import RiskGauge from "@/components/RiskGauge";
import DriverStatus from "@/components/DriverStatus";

import {
  Smile,
  Activity,
  Brain,
} from "lucide-react";

interface Props {
  riskScore: number;
  ear: number;
  mar: number;
  blinkCount: number;
  yawnCount: number;
  confidence: number;
  attention?: number;
  fatigue?: number;
}

function Metric({
  icon,
  title,
  value,
  progress,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-pink-400">{icon}</div>

          <p className="text-xs text-zinc-400">
            {title}
          </p>
        </div>

        <h3 className="text-base font-semibold text-white">
          {value}
        </h3>
      </div>

      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}

export default function DetectionSidebar({
  riskScore,
  mar,
  blinkCount,
  yawnCount,
  confidence,
  attention = 100,
  fatigue = 0,
}: Props) {
  return (
    <div className="space-y-3">

      <RiskGauge score={riskScore} />

      <DriverStatus
        risk={riskScore}
        attention={attention}
        fatigue={fatigue}
      />

      {/* Live Metrics Card */}

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3 sm:p-4 shadow-[0_0_20px_rgba(0,0,0,.25)]">

        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
          Live Metrics
        </h2>

        <div className="space-y-3 sm:space-y-4">

          <Metric
            icon={<Smile size={16} />}
            title="Mouth Ratio"
            value={mar.toFixed(2)}
            progress={Math.min(mar * 100, 100)}
          />

          <Metric
            icon={<Activity size={16} />}
            title="Blinks"
            value={blinkCount.toString()}
            progress={Math.min(blinkCount * 5, 100)}
          />

          <Metric
            icon={<Activity size={16} />}
            title="Yawns"
            value={yawnCount.toString()}
            progress={Math.min(yawnCount * 20, 100)}
          />

          <Metric
            icon={<Brain size={16} />}
            title="Confidence"
            value={`${confidence}%`}
            progress={confidence}
          />

        </div>

      </div>

    </div>
  );
}