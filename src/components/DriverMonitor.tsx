"use client";

import { useMonitoring } from "@/contexts/MonitoringContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useEyeTracking } from "@/hooks/useEyeTracking";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import { useHeadTracking } from "@/hooks/useHeadTracking";
import { useVideoCanvas } from "@/hooks/useVideoCanvas";
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-core";
import { useEffect } from "react";
import { Alert } from "./Alert";
import { StatusBar } from "./StatusBar";
import { StatusIndicators } from "./StatusIndicators";

export default function DriverMonitor() {
  const { isMonitoring, setIsMonitoring, addAlert } = useMonitoring();
  const { faceLandmarker, isLoading } = useFaceLandmarker();
  const {
    currentAlert,
    isAlertActive,
    isSoundEnabled,
    handleAlert,
    toggleSound,
  } = useAlerts(addAlert);

  const { eyeMetrics, detectDrowsiness } = useEyeTracking(handleAlert);
  
  const { headPose, movementPattern, detectSuddenMovements } =
    useHeadTracking(handleAlert);
  
  const { videoRef, canvasRef, startMonitoring, stopMonitoring } =
    useVideoCanvas(
      faceLandmarker,
      isMonitoring,
      detectDrowsiness,
      detectSuddenMovements,
      addAlert
    );

  useEffect(() => {
    if (isMonitoring && faceLandmarker) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => stopMonitoring();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoring, faceLandmarker]);

  return (
    <div className="fixed inset-0 w-screen h-screen">
      <div className="relative w-full h-full">
        <StatusBar
          isMonitoring={isMonitoring}
          eyeMetrics={eyeMetrics}
          headPose={headPose}
          isSoundEnabled={isSoundEnabled}
          onToggleSound={toggleSound}
          onToggleMonitoring={() => setIsMonitoring(!isMonitoring)}
          isLoading={isLoading}
          hasFaceLandmarker={!!faceLandmarker}
        />

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />

        <Alert
          message={currentAlert.message}
          type={currentAlert.type}
          isActive={isAlertActive}
        />

        <div className="absolute bottom-6 left-6 z-20">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">
              Driver Monitor
            </h1>
            <p className="text-sm text-gray-200 drop-shadow-lg">
              {isMonitoring
                ? "Actively monitoring driver status"
                : "Ready to monitor"}
            </p>
          </div>
        </div>

        <StatusIndicators
          isMonitoring={isMonitoring}
          movementPattern={movementPattern}
        />
      </div>
    </div>
  );
}
