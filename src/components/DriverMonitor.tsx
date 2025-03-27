"use client";

import { useMonitoring } from "@/contexts/MonitoringContext";
import "@tensorflow/tfjs-core";
// Register WebGL backend.
import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import "@tensorflow/tfjs-backend-webgl";
import { useCallback, useEffect, useRef, useState } from "react";

interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export default function DriverMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastBlinkRef = useRef(Date.now());
  const blinkCountRef = useRef(0);
  const isEyeClosedRef = useRef(false);
  const previousNosePositionRef = useRef<FaceLandmark | null>(null);
  const { isMonitoring, setIsMonitoring, addAlert } = useMonitoring();
  const [isAlertActive, setIsAlertActive] = useState(false);
  const lastAlertTimeRef = useRef(Date.now());
  const ALERT_COOLDOWN = 30000; // 30 seconds cooldown between alerts

  // Add states for displaying metrics
  const [eyeMetrics, setEyeMetrics] = useState({
    leftEAR: 0,
    rightEAR: 0,
    averageEAR: 0,
    blinkCount: 0,
  });

  // Add refs for audio elements
  const drowsinessAlarmRef = useRef<HTMLAudioElement | null>(null);
  const warningBeepRef = useRef<HTMLAudioElement | null>(null);

  // Add state for current alert message
  const [currentAlert, setCurrentAlert] = useState<{
    message: string;
    type: "danger" | "warning" | null;
  }>({ message: "", type: null });

  useEffect(() => {
    const loadModel = async () => {
      if (typeof window === "undefined") return;

      try {
        console.log("Loading Face Mesh model...");
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );

        const landmarker = await FaceLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1,
          }
        );

        console.log("Model loaded successfully");
        setFaceLandmarker(landmarker);
      } catch (error) {
        console.error("Error loading model:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
  }, []);

  // Initialize audio elements
  useEffect(() => {
    // Create audio elements
    drowsinessAlarmRef.current = new Audio("/sounds/alarm.wav"); // Add these audio files to your public folder
    warningBeepRef.current = new Audio("/sounds/warning.wav");

    // Configure audio elements
    if (drowsinessAlarmRef.current) {
      drowsinessAlarmRef.current.loop = true; // Continuous alarm for drowsiness
    }
    if (warningBeepRef.current) {
      warningBeepRef.current.loop = false; // Single beep for warnings
    }

    // Cleanup
    return () => {
      if (drowsinessAlarmRef.current) {
        drowsinessAlarmRef.current.pause();
      }
      if (warningBeepRef.current) {
        warningBeepRef.current.pause();
      }
    };
  }, []);

  const handleAlert = async (message: string, type: "danger" | "warning") => {
    const now = Date.now();
    // Check if enough time has passed since last alert
    if (now - lastAlertTimeRef.current < ALERT_COOLDOWN) {
      console.log("Alert suppressed due to cooldown period");
      return;
    }

    // Update last alert time
    lastAlertTimeRef.current = now;

    // Update alert message
    setCurrentAlert({ message, type });

    // Clear alert message after 5 seconds
    setTimeout(() => {
      setCurrentAlert({ message: "", type: null });
    }, 5000);

    // Visual alert
    setIsAlertActive(true);

    // Sound alert
    if (type === "danger") {
      if (drowsinessAlarmRef.current) {
        try {
          await drowsinessAlarmRef.current.play();
          // Stop alarm after 5 seconds
          setTimeout(() => {
            if (drowsinessAlarmRef.current) {
              drowsinessAlarmRef.current.pause();
              drowsinessAlarmRef.current.currentTime = 0;
            }
          }, 5000);
        } catch (error) {
          console.error("Failed to play alarm sound:", error);
        }
      }
    } else {
      if (warningBeepRef.current) {
        try {
          warningBeepRef.current.currentTime = 0;
          await warningBeepRef.current.play();
        } catch (error) {
          console.error("Failed to play warning sound:", error);
        }
      }
    }

    // External alerts
    try {
      await fetch("/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          channels: ["sms", "whatsapp"],
          recipients: [], // Add specific recipients here if needed
        }),
      });
    } catch (error) {
      console.error("Failed to send alert:", error);
    }

    addAlert(message, type);
  };

  const detectDrowsiness = (landmarks: FaceLandmark[]) => {
    if (!landmarks || !isMonitoring) {
      console.log("Skipping drowsiness detection:", {
        hasLandmarks: !!landmarks,
        isMonitoring,
      });
      return;
    }

    // Get correct eye landmarks
    const leftEyeInner = landmarks[133]; // Left eye inner corner
    const leftEyeOuter = landmarks[33]; // Left eye outer corner
    const leftEyeTop = landmarks[159];
    const leftEyeBottom = landmarks[145];

    const rightEyeInner = landmarks[362]; // Right eye inner corner
    const rightEyeOuter = landmarks[263]; // Right eye outer corner
    const rightEyeTop = landmarks[386];
    const rightEyeBottom = landmarks[374];

    if (
      !leftEyeInner ||
      !leftEyeOuter ||
      !leftEyeTop ||
      !leftEyeBottom ||
      !rightEyeInner ||
      !rightEyeOuter ||
      !rightEyeTop ||
      !rightEyeBottom
    ) {
      console.log("Missing eye landmarks");
      return;
    }

    // Improved EAR calculation with proper width
    const leftEAR = calculateEAR(
      leftEyeInner,
      leftEyeOuter,
      leftEyeTop,
      leftEyeBottom
    );
    const rightEAR = calculateEAR(
      rightEyeInner,
      rightEyeOuter,
      rightEyeTop,
      rightEyeBottom
    );
    const averageEAR = (leftEAR + rightEAR) / 2;

    // Update metrics for display
    setEyeMetrics({
      leftEAR: Number(leftEAR.toFixed(3)),
      rightEAR: Number(rightEAR.toFixed(3)),
      averageEAR: Number(averageEAR.toFixed(3)),
      blinkCount: blinkCountRef.current,
    });

    console.log("Eye Aspect Ratio:", {
      left: leftEAR.toFixed(3),
      right: rightEAR.toFixed(3),
      average: averageEAR.toFixed(3),
      isEyeClosed: isEyeClosedRef.current,
      timeSinceLastBlink: Date.now() - lastBlinkRef.current,
      blinkCount: blinkCountRef.current,
    });

    const now = Date.now();

    // Detect eye closure with an appropriate threshold (adjust if needed)
    const EAR_THRESHOLD = 0.23;
    const DROWSINESS_TIME_THRESHOLD = 3000; // 3 seconds

    if (averageEAR < EAR_THRESHOLD && !isEyeClosedRef.current) {
      console.log("Eyes detected as closed");
      isEyeClosedRef.current = true;
      blinkCountRef.current++;
      lastBlinkRef.current = now;
    } else if (averageEAR >= EAR_THRESHOLD && isEyeClosedRef.current) {
      console.log("Eyes detected as open");
      isEyeClosedRef.current = false;
    }

    // Trigger drowsiness alert if eyes remain closed for too long
    if (
      isEyeClosedRef.current &&
      now - lastBlinkRef.current > DROWSINESS_TIME_THRESHOLD
    ) {
      handleAlert(
        "Warning: Eyes closed for too long - possible drowsiness!",
        "danger"
      );
    }

    // Alert for excessive blinking (fatigue detection)
    if (blinkCountRef.current > 50 && now - lastBlinkRef.current < 120000) {
      handleAlert(
        "Warning: Frequent blinking detected - possible fatigue!",
        "warning"
      );
      blinkCountRef.current = 0;
    }
  };

  const calculateEAR = (
    eyeInner: FaceLandmark,
    eyeOuter: FaceLandmark,
    eyeTop: FaceLandmark,
    eyeBottom: FaceLandmark
  ) => {
    const eyeHeight = Math.abs(eyeTop.y - eyeBottom.y);
    const eyeWidth = Math.abs(eyeOuter.x - eyeInner.x);
    return eyeHeight / (eyeWidth || 1);
  };

  const detectSuddenMovements = (nose: FaceLandmark) => {
    const prevNose = previousNosePositionRef.current;
    if (!prevNose) return;

    const movement = Math.sqrt(
      Math.pow(nose.x - prevNose.x, 2) + Math.pow(nose.y - prevNose.y, 2)
    );

    if (movement > 30) {
      addAlert("Warning: Sudden head movement detected!", "danger");
    }

    const verticalMovement = Math.abs(nose.y - prevNose.y);
    if (verticalMovement > 40) {
      addAlert("Warning: Excessive head tilt detected!", "warning");
    }

    previousNosePositionRef.current = nose;
  };

  const drawFaceMesh = (
    context: CanvasRenderingContext2D,
    landmarks: FaceLandmark[]
  ) => {
    if (!landmarks) {
      console.log("No landmarks found");
      return;
    }

    const drawingUtils = new DrawingUtils(context);

    // Draw the face mesh components
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      { color: "#C0C0C070", lineWidth: 1 }
    );
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
      { color: "#FF3030" }
    );
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
      { color: "#FF3030" }
    );
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
      { color: "#30FF30" }
    );
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
      { color: "#30FF30" }
    );
    drawingUtils.drawConnectors(
      landmarks,
      FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
      { color: "#E0E0E0" }
    );
    drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
      color: "#E0E0E0",
    });
  };

  const startMonitoring = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 300, facingMode: "user" },
      });
      video.srcObject = stream;

      await new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          await video.play();
          resolve(null);
        };
      });

      let lastVideoTime = -1;

      const detect = async () => {
        if (!video || !context || !faceLandmarker) return;

        // Always draw the video frame
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (lastVideoTime !== video.currentTime) {
          lastVideoTime = video.currentTime;
          const startTimeMs = performance.now();
          const results = faceLandmarker.detectForVideo(video, startTimeMs);

          if (results.faceLandmarks) {
            for (const landmarks of results.faceLandmarks) {
              const nose = landmarks[5]; // Nose tip landmark
              detectDrowsiness(landmarks);
              detectSuddenMovements(nose);
              drawFaceMesh(context, landmarks);
            }
          } else {
            addAlert("Warning: No face detected - stay in view!", "warning");
          }
        }

        if (isMonitoring) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
      };

      detect();
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  }, [faceLandmarker, isMonitoring]);

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    previousNosePositionRef.current = null;
    lastBlinkRef.current = Date.now();
    blinkCountRef.current = 0;
    isEyeClosedRef.current = false;
  }, []);

  useEffect(() => {
    if (isMonitoring && faceLandmarker) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    return () => stopMonitoring();
  }, [isMonitoring, faceLandmarker]);

  // Add sound control to the UI
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const toggleSound = () => {
    setIsSoundEnabled(!isSoundEnabled);
    if (!isSoundEnabled) {
      if (drowsinessAlarmRef.current) {
        drowsinessAlarmRef.current.muted = false;
      }
      if (warningBeepRef.current) {
        warningBeepRef.current.muted = false;
      }
    } else {
      if (drowsinessAlarmRef.current) {
        drowsinessAlarmRef.current.muted = true;
      }
      if (warningBeepRef.current) {
        warningBeepRef.current.muted = true;
      }
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen">
      <div className="relative w-full h-full">
        {/* Status Bar */}
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
              {/* Sound toggle button */}
              <button
                onClick={toggleSound}
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
                onClick={() => setIsMonitoring(!isMonitoring)}
                disabled={isLoading || !faceLandmarker}
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

        {/* Video and Canvas */}
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

        {/* Alert Label */}
        {currentAlert.message && (
          <div
            className={`absolute top-1/4 left-1/2 transform -translate-x-1/2 
            px-6 py-3 rounded-lg text-white text-xl font-bold
            ${
              currentAlert.type === "danger"
                ? "bg-red-500/80 animate-bounce"
                : "bg-yellow-500/80 animate-pulse"
            } backdrop-blur-sm`}
          >
            <div className="flex items-center gap-2">
              {currentAlert.type === "danger" ? "⚠️" : "⚡"}
              {currentAlert.message}
            </div>
          </div>
        )}

        {/* Visual Alert Border */}
        {isAlertActive && (
          <div
            className={`absolute inset-0 animate-pulse border-8 
            ${
              currentAlert.type === "danger"
                ? "border-red-500"
                : "border-yellow-500"
            }`}
          />
        )}

        {/* App Title */}
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

        {/* Status Indicators */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
          {isMonitoring && (
            <>
              <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-lg text-white">
                <div className="animate-pulse w-2 h-2 rounded-full bg-green-500" />
                <span>Monitoring Active</span>
              </div>
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
                    {currentAlert.type === "danger"
                      ? "Alert Active"
                      : "Warning Active"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
