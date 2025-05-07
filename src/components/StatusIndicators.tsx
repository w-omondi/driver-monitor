/**
 * StatusIndicators Component
 *
 * Displays real-time status indicators for the monitoring system, including
 * movement patterns and their confidence levels. Shows different states based
 * on whether monitoring is active and the type of movement detected.
 */

import React from "react";

/**
 * Represents a detected movement pattern with its type, confidence level, and description
 * @property type - The category of movement ('normal', 'abnormal', or 'accident')
 * @property confidence - Confidence score between 0 and 1
 * @property description - Human-readable description of the movement pattern
 */
interface MovementPattern {
  type: "normal" | "abnormal" | "accident";
  confidence: number;
  description: string;
}

/**
 * Props interface for the StatusIndicators component
 * @property isMonitoring - Whether the monitoring system is active
 * @property movementPattern - Current detected movement pattern, if any
 */
interface StatusIndicatorsProps {
  isMonitoring: boolean;
  movementPattern: MovementPattern | null;
}

export const StatusIndicators: React.FC<StatusIndicatorsProps> = ({
  isMonitoring,
  movementPattern,
}) => {
  // Show standby indicator when monitoring is inactive
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
      {/* Display movement pattern indicator if detected */}
      {movementPattern && (
        <div
          className={`px-3 py-2 rounded-lg text-white ${
            movementPattern.type === "accident"
              ? "bg-red-500/50" // Red for accident
              : movementPattern.type === "abnormal"
              ? "bg-yellow-500/50" // Yellow for abnormal
              : "bg-green-500/50" // Green for normal
          }`}
        >
          {/* Movement pattern description */}
          <div className="flex items-center gap-2">
            {movementPattern.description}
          </div>
          {/* Confidence level display */}
          <div className="text-sm opacity-75">
            ({(movementPattern.confidence * 100).toFixed(0)}% confidence)
          </div>
        </div>
      )}
    </div>
  );
};
