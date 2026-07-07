"use client";

import { AlertTriangle } from "lucide-react";

interface BottomAlertProps {
  /** Pass null/undefined to hide the bar entirely. */
  message: string | null;
}

export default function BottomAlert({ message }: BottomAlertProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-red-700 flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 px-4 py-3 lg:py-0 lg:h-20 text-center text-sm sm:text-lg lg:text-2xl font-bold animate-pulse z-50">
      <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
      <span className="leading-snug">{message}</span>
      <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 flex-shrink-0" />
    </div>
  );
}
