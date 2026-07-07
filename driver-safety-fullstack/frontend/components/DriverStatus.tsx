"use client";

import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Brain,
  Activity,
} from "lucide-react";

interface Props {
  risk: number;
  attention: number;
  fatigue: number;
}

export default function DriverStatus({
  risk,
  attention,
  fatigue,
}: Props) {
  const safe = risk < 35;

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(0,0,0,.3)]">

      <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">
        Driver Status
      </h2>

      <div className="flex items-center gap-3">

        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center ${
            safe
              ? "bg-green-500/20 text-green-400"
              : risk < 70
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {safe ? (
            <ShieldCheck size={24} />
          ) : risk < 70 ? (
            <ShieldAlert size={24} />
          ) : (
            <ShieldX size={24} />
          )}
        </div>

        <div>
          <h3 className="text-base font-semibold">
            {safe
              ? "Driver Alert"
              : risk < 70
              ? "Driver Distracted"
              : "Driver Drowsy"}
          </h3>

          <p className="text-xs text-white/50">
            Real-time monitoring
          </p>
        </div>

      </div>

      <div className="mt-6 space-y-4">

        <div>

          <div className="flex items-center justify-between mb-2 text-sm">

            <span className="flex items-center gap-2">
              <Brain size={15} />
              Attention
            </span>

            <span className="font-medium">
              {attention}%
            </span>

          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{
                width: `${attention}%`,
              }}
            />
          </div>

        </div>

        <div>

          <div className="flex items-center justify-between mb-2 text-sm">

            <span className="flex items-center gap-2">
              <Activity size={15} />
              Fatigue
            </span>

            <span className="font-medium">
              {fatigue}%
            </span>

          </div>

          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-pink-500 transition-all duration-500"
              style={{
                width: `${fatigue}%`,
              }}
            />
          </div>

        </div>

      </div>

    </div>
  );
}