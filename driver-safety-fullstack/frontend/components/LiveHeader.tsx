"use client";

import { Wifi, WifiOff } from "lucide-react";

interface LiveHeaderProps {
  isLive?: boolean;
  backendConnected?: boolean;
}

export default function LiveHeader({ isLive = true, backendConnected = true }: LiveHeaderProps) {
  return (
    <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="max-w-[1700px] mx-auto px-8 py-5 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">DriverSafetyAI</h1>
          <p className="text-white/50">Real-Time AI Driver Monitoring</p>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-white/20"}`} />
            {isLive ? "LIVE" : "OFFLINE"}
          </div>

          <div className="flex items-center gap-2">
            {backendConnected ? <Wifi size={18} /> : <WifiOff size={18} className="text-red-400" />}
            {backendConnected ? "Backend Connected" : "Backend Disconnected"}
          </div>
        </div>
      </div>
    </header>
  );
}
