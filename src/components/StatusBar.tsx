/**
 * StatusBar Component
 *
 * A top-level status bar that displays real-time monitoring metrics and controls.
 * Shows eye tracking metrics, head pose angles, and provides controls for sound
 * and monitoring state.
 */

import React from "react";

/**
 * Props interface for the StatusBar component
 * @property isMonitoring - Current state of the monitoring system
 * @property eyeMetrics - Real-time eye tracking metrics
 * @property headPose - Current head pose angles in degrees
 * @property isSoundEnabled - Current state of alert sounds
 * @property onToggleSound - Callback to toggle alert sounds
 * @property onToggleMonitoring - Callback to start/stop monitoring
 * @property isLoading - Loading state of the face landmark model
 * @property hasFaceLandmarker - Whether the face landmark model is available
 */
interface StatusBarProps {
  isMonitoring: boolean;
  eyeMetrics: {
    leftEAR: number; // Left eye aspect ratio
    rightEAR: number; // Right eye aspect ratio
    averageEAR: number; // Average eye aspect ratio
    blinkCount: number; // Total number of blinks detected
  };
  headPose: {
    yaw: number; // Horizontal rotation angle
    pitch: number; // Vertical tilt angle
    roll: number; // Side-to-side tilt angle
  };
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  onToggleMonitoring: () => void;
  isLoading: boolean;
  hasFaceLandmarker: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isMonitoring,
  eyeMetrics,
  headPose,
  isSoundEnabled,
  onToggleSound,
  onToggleMonitoring,
  isLoading,
  hasFaceLandmarker,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 bg-black/50 text-white p-4 z-20">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 ">
        {/* Eye tracking metrics section */}
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-300">Eye aspect ratio</div>
          <div className="w-full grid grid-cols-3 gap-2">
            <div className="text-xs">Left: {eyeMetrics.leftEAR}</div>
            <div className="text-xs">Right: {eyeMetrics.rightEAR}</div>
            <div className="text-xs">Avg: {eyeMetrics.averageEAR}</div>
          </div>
        </div>

        {/* Head pose angles section */}
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-300">Head Pose</div>
          <div className="w-full grid grid-cols-3 gap-2">
            <div className="text-xs">Yaw: {headPose.yaw.toFixed(1)}°</div>
            <div className="text-xs">Pitch: {headPose.pitch.toFixed(1)}°</div>
            <div className="text-xs">Roll: {headPose.roll.toFixed(1)}°</div>
          </div>
        </div>

        {/* Control buttons section */}
        <div className="flex items-center md:justify-end gap-4">
          {/* Sound toggle button */}
          <button
            onClick={onToggleSound}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            {isSoundEnabled ? <span>🔊</span> : <span>🔇</span>}
          </button>

          {/* Monitoring toggle button */}
          <button
            onClick={onToggleMonitoring}
            disabled={isLoading || !hasFaceLandmarker}
            className={`px-4 py-2 rounded-lg ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : isMonitoring
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white font-semibold`}
          >
            {isLoading ? "Loading Model..." : isMonitoring ? "Stop" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
};
