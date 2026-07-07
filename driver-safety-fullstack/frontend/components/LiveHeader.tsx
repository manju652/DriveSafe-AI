"use client";

import { Wifi, WifiOff } from "lucide-react";

interface LiveHeaderProps {
  isLive?: boolean;
  backendConnected?: boolean;
}

export default function LiveHeader({ isLive = true, backendConnected = true }: LiveHeaderProps) {
  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">DriverSafetyAI</h1>
          <p className="text-white/50 text-xs sm:text-sm lg:text-base">Real-Time AI Driver Monitoring</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-6 lg:gap-8">
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm lg:text-base">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${isLive ? "bg-green-500 animate-pulse" : "bg-white/20"}`} />
            {isLive ? "LIVE" : "OFFLINE"}
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm lg:text-base">
            {backendConnected ? <Wifi size={16} className="flex-shrink-0" /> : <WifiOff size={16} className="text-red-400 flex-shrink-0" />}
            <span className="whitespace-nowrap">{backendConnected ? "Backend Connected" : "Backend Disconnected"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
