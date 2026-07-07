"use client";

interface RiskGaugeProps {
  score?: number;
}

export default function RiskGauge({ score = 0 }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (clamped / 100) * circumference;

  const color =
    clamped < 35
      ? "#22c55e"
      : clamped < 70
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(0,0,0,.3)]">
      <h2 className="text-base sm:text-lg font-bold text-center mb-3 sm:mb-4">
        Risk Score
      </h2>

      <div className="flex justify-center">
        <div className="relative w-[160px] h-[160px]">
          <svg
            className="absolute inset-0 -rotate-90"
            width="160"
            height="160"
          >
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="rgba(255,255,255,.08)"
              strokeWidth="10"
              fill="none"
            />

            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              style={{
                transition: "all .8s ease",
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <h1 className="text-3xl font-black">
              {clamped}%
            </h1>

            <p className="text-xs text-white/50 mt-1">
              Risk Level
            </p>

            <div
              className="mt-2 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: color + "22",
                color,
              }}
            >
              {clamped < 35
                ? "SAFE"
                : clamped < 70
                ? "WARNING"
                : "CRITICAL"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}