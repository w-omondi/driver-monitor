/**
 * DriverMonitor Component
 *
 * This is the main component of the driver monitoring system. It integrates various
 * monitoring features including eye tracking, head pose detection, and alert management.
 * The component uses TensorFlow.js for face landmark detection and provides real-time
 * monitoring of driver's state.
 */

"use client";

// Core monitoring context and hooks
import { useMonitoring } from "@/contexts/MonitoringContext";
import { useAlerts } from "@/hooks/useAlerts";
import { useEyeTracking } from "@/hooks/useEyeTracking";
import { useFaceLandmarker } from "@/hooks/useFaceLandmarker";
import { useHeadTracking } from "@/hooks/useHeadTracking";
import { useVideoCanvas } from "@/hooks/useVideoCanvas";

// TensorFlow.js dependencies for face landmark detection
import "@tensorflow/tfjs-backend-webgl";
import "@tensorflow/tfjs-core";

import { useEffect } from "react";
import { Alert } from "./Alert";
import { StatusBar } from "./StatusBar";
import { StatusIndicators } from "./StatusIndicators";

export default function DriverMonitor() {
  // Monitoring context for global state management
  const { isMonitoring, setIsMonitoring, addAlert } = useMonitoring();

  // Face landmark detection setup
  const { faceLandmarker, isLoading } = useFaceLandmarker();

  // Alert management system
  const {
    currentAlert,
    isAlertActive,
    isSoundEnabled,
    handleAlert,
    toggleSound,
  } = useAlerts(addAlert);

  // Eye tracking system for drowsiness detection
  const { eyeMetrics, detectDrowsiness } = useEyeTracking(handleAlert);

  // Head pose tracking for sudden movements and attention monitoring
  const { headPose, movementPattern, detectSuddenMovements } =
    useHeadTracking(handleAlert);

  // Video and canvas setup for real-time monitoring
  const { videoRef, canvasRef, startMonitoring, stopMonitoring } =
    useVideoCanvas(
      faceLandmarker,
      isMonitoring,
      detectDrowsiness,
      detectSuddenMovements,
      addAlert
    );

  // Effect to handle monitoring lifecycle
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
        {/* Status bar showing monitoring state and controls */}
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

        {/* Video feed from camera */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain md:object-cover transform -scale-x-100"
          autoPlay
          playsInline
          muted
        />

        {/* Canvas overlay for drawing face landmarks and tracking data */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-contain md:object-cover transform -scale-x-100"
        />

        {/* Alert display component */}
        <Alert
          message={currentAlert.message}
          type={currentAlert.type}
          isActive={isAlertActive}
        />

        {/* Title and status information */}
        <div className="absolute hidden bottom-6 left-6 z-20 md:block">
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

        {/* Status indicators for monitoring state and movement patterns */}
        <StatusIndicators
          isMonitoring={isMonitoring}
          movementPattern={movementPattern}
        />
      </div>
    </div>
  );
}
