import React from "react";

interface MovementPattern {
  type: "normal" | "abnormal" | "accident";
  confidence: number;
  description: string;
}

interface StatusIndicatorsProps {
  isMonitoring: boolean;
  movementPattern: MovementPattern | null;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  isMonitoring,
  movementPattern,
}) => {
  if (!isMonitoring)
    return (
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20 w-[400px]">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-white`}
        >
          <div className="animate-pulse w-2 h-2 rounded-full bg-white" />
          <span>Standby</span>
        </div>
      </div>
    );

  return (
    <div className="w-[90%] absolute bottom-6 right-[5%] md:right-6 flex flex-col gap-2 z-20 md:w-[400px]">
      {movementPattern && (
        <div
          className={`px-3 py-2 rounded-lg text-white ${
            movementPattern.type === "accident"
              ? "bg-red-500/50"
              : movementPattern.type === "abnormal"
              ? "bg-yellow-500/50"
              : "bg-green-500/50"
          }`}
        >
          <div className="flex items-center gap-2">
            {movementPattern.description}
          </div>
          <div className="text-sm opacity-75">
            ({(movementPattern.confidence * 100).toFixed(0)}% confidence)
          </div>
        </div>
      )}
    </div>
  );
};
