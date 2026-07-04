"use client";

import { useState, useEffect, type ReactNode } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
import {
  Eye, Video, Activity, Clock, AlertTriangle,
  Square, Play, Volume2, VolumeX, Moon, Sun,
} from "lucide-react";

/**
 * DetectionLayout
 * -----------------------------------------------------------------------
 * Pure UI shell for the live detection page. Pass in your real values
 * from MediaPipe / your detection hook — this component renders them,
 * it does not compute anything itself.
 *
 * Drop your existing camera/video element into the `cameraSlot` prop
 * (e.g. your <DriverCamera /> component with the canvas overlay) so the
 * landmark drawing logic you already have keeps working untouched.
 * -----------------------------------------------------------------------
 */

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface DetectionMetrics {
  ear: number;            // Eye Aspect Ratio, e.g. 0.18
  mar: number;            // Mouth Aspect Ratio, e.g. 0.62
  blinkFreq: number;      // blinks per minute, e.g. 2.1
  eyeClosure: number;     // seconds, e.g. 4.0
  yawnTime: number;       // seconds, e.g. 4.2
  yawnCount: number;      // count, e.g. 4
  headPose: number;       // degrees, e.g. -9
  alertCount: number;     // count, e.g. 4
}

export interface DetectionLayoutProps {
  /** Your existing camera component (video + canvas overlay) */
  cameraSlot: ReactNode;
  /** Live metrics object — update this every frame from your detection hook */
  metrics: DetectionMetrics;
  /** 0-100+ overall risk score; can exceed 100 to show extreme severity */
  riskScore: number;
  riskLevel: RiskLevel;
  /** Active alert message, or null if no alert is firing */
  activeAlert: string | null;
  /** Whether detection loop is currently running */
  isDetecting: boolean;
  onToggleDetection: () => void;
  /** Whether voice/audio alerts are enabled */
  audioEnabled: boolean;
  onToggleAudio: () => void;
  /** Session elapsed seconds — pass from your own timer/session state */
  sessionSeconds: number;
  /** Nav links — wire these to your router (Next.js <Link> or router.push) */
  onNavigate?: (route: "home" | "detection" | "analytics" | "about") => void;
  activeRoute?: "home" | "detection" | "analytics" | "about";
  /** Optional dark/light toggle if your app supports theme switching */
  isDark?: boolean;
  onToggleTheme?: () => void;
}

const riskStyles: Record<RiskLevel, { bg: string; text: string; label: string }> = {
  low:      { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Low risk" },
  moderate: { bg: "bg-amber-500/15",   text: "text-amber-400",   label: "Moderate risk" },
  high:     { bg: "bg-orange-500/15",  text: "text-orange-400",  label: "High risk" },
  critical: { bg: "bg-red-500/15",     text: "text-red-400",     label: "Critical risk" },
};

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function MetricCard({
  label, value, unit = "", icon: Icon, max, danger,
}: {
  label: string;
  value: number;
  unit?: string;
  icon: React.ElementType;
  max: number;
  danger: boolean;
}) {
  const pct = Math.min(100, Math.round((Math.abs(value) / max) * 100));
  return (
    <div className="bg-white/[0.03] rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/40 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className={`text-sm font-semibold ${danger ? "text-red-400" : "text-white"}`}>
          {value}{unit}
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${danger ? "bg-red-500" : "bg-white/40"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DetectionLayout({
  cameraSlot,
  metrics,
  riskScore,
  riskLevel,
  activeAlert,
  isDetecting,
  onToggleDetection,
  audioEnabled,
  onToggleAudio,
  sessionSeconds,
  onNavigate,
  activeRoute = "detection",
  isDark = true,
  onToggleTheme,
}: DetectionLayoutProps) {
  const risk = riskStyles[riskLevel];
  const navItems: { key: "home" | "detection" | "analytics" | "about"; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "detection", label: "Detection" },
    { key: "analytics", label: "Analytics" },
    { key: "about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ── Top nav ───────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Eye className="w-6 h-6 text-violet-400" />
          <span className="font-semibold text-lg">Driver Safety AI</span>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate?.(item.key)}
              className={`text-sm font-medium transition-colors ${
                activeRoute === item.key ? "text-violet-400" : "text-white/50 hover:text-white/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={onToggleTheme} className="text-white/50 hover:text-white/80 transition-colors">
          {isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 p-6">

        {/* Camera column */}
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Video className="w-4 h-4 text-white/70" />
            <span className="font-medium text-[15px]">Camera feed</span>
          </div>
          <p className="text-white/35 text-xs mb-3">Live video with facial landmark overlay.</p>

          {/* Your real camera component goes here */}
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black aspect-[16/11]">
            {cameraSlot}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onToggleDetection}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                isDetecting
                  ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
              }`}
            >
              {isDetecting ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isDetecting ? "Stop detection" : "Start detection"}
            </button>

            <button
              onClick={onToggleAudio}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              {audioEnabled ? "Audio on" : "Audio off"}
            </button>
          </div>
        </div>

        {/* Sidebar column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-white/70" />
              <span className="font-medium text-[15px]">Live analysis</span>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${risk.bg} ${risk.text}`}>
              {risk.label.toUpperCase()}
            </span>
          </div>

          {/* Session + risk */}
          <div className="bg-white/[0.03] rounded-xl px-4 py-3.5 mb-4">
            <div className="flex items-center justify-between text-xs text-white/40 mb-2.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Session time
              </span>
              <span className="text-sm font-semibold text-white tabular-nums">
                {formatTime(sessionSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
              <span>Risk score</span>
              <span className="text-sm font-semibold text-white">{riskScore}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  riskLevel === "critical" || riskLevel === "high" ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, riskScore)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2.5">
            <Activity className="w-3.5 h-3.5 text-white/50" />
            <span className="text-sm font-medium text-white/70">Real-time metrics</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <MetricCard label="EAR" value={metrics.ear} icon={Eye} max={0.4} danger={metrics.ear < 0.22} />
            <MetricCard label="MAR" value={metrics.mar} icon={Activity} max={1.0} danger={metrics.mar > 0.5} />
            <MetricCard label="Blink freq" value={metrics.blinkFreq} unit="/m" icon={Eye} max={20} danger={metrics.blinkFreq < 5} />
            <MetricCard label="Eye closure" value={metrics.eyeClosure} unit="s" icon={Clock} max={6} danger={metrics.eyeClosure > 2} />
            <MetricCard label="Yawn time" value={metrics.yawnTime} unit="s" icon={Clock} max={6} danger={metrics.yawnTime > 2} />
            <MetricCard label="Yawn count" value={metrics.yawnCount} icon={Activity} max={10} danger={false} />
            <MetricCard label="Head pose" value={metrics.headPose} unit="°" icon={Activity} max={30} danger={Math.abs(metrics.headPose) > 20} />
            <MetricCard label="Alerts" value={metrics.alertCount} icon={AlertTriangle} max={10} danger={metrics.alertCount > 0} />
          </div>
        </div>
      </div>

      {/* ── Bottom alert bar ──────────────────────────────────────── */}
      {activeAlert && (
        <div className="flex items-center justify-center gap-2.5 py-3.5 bg-red-500/15 border-t border-red-500/30 text-red-400 text-sm font-semibold">
          <AlertTriangle className="w-[18px] h-[18px]" />
          <span>{activeAlert.toUpperCase()}</span>
          <AlertTriangle className="w-[18px] h-[18px]" />
        </div>
      )}
    </div>
  );
}
