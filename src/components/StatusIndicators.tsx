import React from "react";

interface MovementPattern {
  type: "normal" | "abnormal" | "accident";
  confidence: number;
  description: string;
}

interface StatusIndicatorsProps {
  isMonitoring: boolean;
  movementPattern: MovementPattern | null;
  currentAlert: {
    message: string;
    type: "danger" | "warning" | null;
  };
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  isMonitoring,
  movementPattern,
  currentAlert,
}) => {
  if (!isMonitoring) return null;

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 w-[400px]">
      <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg text-white">
        <div className="animate-pulse w-2 h-2 rounded-full bg-green-500" />
        <span>Monitoring Active</span>
      </div>
      {movementPattern && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white ${
            movementPattern.type === "accident"
              ? "bg-red-500/50"
              : movementPattern.type === "abnormal"
              ? "bg-yellow-500/50"
              : "bg-green-500/50"
          }`}
        >
          <div className="animate-pulse w-2 h-2 rounded-full bg-white" />
          <span>{movementPattern.description}</span>
        </div>
      )}
      {currentAlert.type && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white
          ${
            currentAlert.type === "danger"
              ? "bg-red-500/50"
              : "bg-yellow-500/50"
          }`}
        >
          <div className="animate-pulse w-2 h-2 rounded-full bg-white" />
          <span>
            {currentAlert.type === "danger" ? "Alert Active" : "Warning Active"}
          </span>
        </div>
      )}
    </div>
  );
};
