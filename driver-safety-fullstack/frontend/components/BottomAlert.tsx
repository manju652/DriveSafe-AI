"use client";

import { AlertTriangle } from "lucide-react";

interface BottomAlertProps {
  /** Pass null/undefined to hide the bar entirely. */
  message: string | null;
}

export default function BottomAlert({ message }: BottomAlertProps) {
  if (!message) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-red-700 flex items-center justify-center gap-4 text-2xl font-bold animate-pulse z-50">
      <AlertTriangle />
      {message}
      <AlertTriangle />
    </div>
  );
}
