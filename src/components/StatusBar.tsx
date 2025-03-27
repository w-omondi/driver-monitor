import React from "react";

interface StatusBarProps {
  isMonitoring: boolean;
  eyeMetrics: {
    leftEAR: number;
    rightEAR: number;
    averageEAR: number;
    blinkCount: number;
  };
  headPose: {
    yaw: number;
    pitch: number;
    roll: number;
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
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isMonitoring ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span>
              {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
            </span>
          </div>
          <div>Blink Count: {eyeMetrics.blinkCount}</div>
        </div>

        <div className="flex items-center gap-6">
          <div>Left EAR: {eyeMetrics.leftEAR}</div>
          <div>Right EAR: {eyeMetrics.rightEAR}</div>
          <div>Avg EAR: {eyeMetrics.averageEAR}</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="text-sm text-gray-300">Head Pose</div>
            <div className="flex gap-2">
              <div className="text-xs">Yaw: {headPose.yaw.toFixed(1)}°</div>
              <div className="text-xs">Pitch: {headPose.pitch.toFixed(1)}°</div>
              <div className="text-xs">Roll: {headPose.roll.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSound}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            {isSoundEnabled ? (
              <>
                <span>🔊</span>
                <span>Sound On</span>
              </>
            ) : (
              <>
                <span>🔇</span>
                <span>Sound Off</span>
              </>
            )}
          </button>

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
            {isLoading
              ? "Loading Model..."
              : isMonitoring
              ? "Stop Monitoring"
              : "Start Monitoring"}
          </button>
        </div>
      </div>
    </div>
  );
};
