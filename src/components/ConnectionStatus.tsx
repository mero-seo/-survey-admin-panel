"use client";

import { WifiOff, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  isDummyData: boolean;
  className?: string;
}

export function ConnectionStatus({
  isConnected,
  isDummyData,
  className,
}: ConnectionStatusProps) {
  if (isConnected && !isDummyData) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600", className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Live Data</span>
      </div>
    );
  }

  if (isDummyData) {
    return (
      <div className={cn("flex items-center gap-2 text-amber-600", className)}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Sample Data</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 text-red-600", className)}>
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Offline</span>
    </div>
  );
}
