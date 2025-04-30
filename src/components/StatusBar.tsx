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
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 ">
        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-300">Eye aspect ration</div>
          <div className="w-full grid grid-cols-3 gap-2">
            <div className="text-xs">Left EAR: {eyeMetrics.leftEAR}</div>
            <div className="text-xs">Right EAR: {eyeMetrics.rightEAR}</div>
            <div className="text-xs">Avg EAR: {eyeMetrics.averageEAR}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-sm text-gray-300">Head Pose</div>
          <div className="w-full grid grid-cols-3 gap-2">
            <div className="text-xs">Yaw: {headPose.yaw.toFixed(1)}°</div>
            <div className="text-xs">Pitch: {headPose.pitch.toFixed(1)}°</div>
            <div className="text-xs">Roll: {headPose.roll.toFixed(1)}°</div>
          </div>
        </div>

        <div className="flex items-center md:justify-end gap-4">
          <button
            onClick={onToggleSound}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600"
          >
            {isSoundEnabled ? <span>🔊</span> : <span>🔇</span>}
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
            {isLoading ? "Loading Model..." : isMonitoring ? "Stop" : "Start"}
          </button>
        </div>
      </div>
    </div>
  );
};
