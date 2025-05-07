/**
 * useVideoCanvas Hook
 * 
 * A custom hook that manages video capture, face detection, and canvas rendering
 * for the driver monitoring system. It handles camera initialization, real-time
 * face landmark detection, and visualization of facial features.
 * 
 * Features:
 * - Camera stream management
 * - Face landmark detection and visualization
 * - Real-time monitoring with configurable FPS
 * - Automatic cleanup of resources
 */

import { DrawingUtils, FaceLandmarker } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef } from "react";

/**
 * Represents a facial landmark point in 3D space
 */
interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

export const useVideoCanvas = (
    faceLandmarker: FaceLandmarker | null,
    isMonitoring: boolean,
    detectDrowsiness: (landmarks: FaceLandmark[]) => void,
    detectSuddenMovements: (nose: FaceLandmark, landmarks: FaceLandmark[]) => void,
    addAlert: (message: string, type: "danger" | "warning") => void
) => {
    // Refs for video and canvas elements
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isVideoReadyRef = useRef(false);
    const lastDetectionTimeRef = useRef(0);
    const detectionIntervalRef = useRef(100); // ~10 FPS detection
    const isInitializedRef = useRef(false);

    /**
     * Draws the face mesh and landmarks on the canvas
     * Uses different colors for different facial features
     * 
     * @param context - Canvas 2D rendering context
     * @param landmarks - Array of facial landmarks to draw
     */
    const drawFaceMesh = useCallback((context: CanvasRenderingContext2D, landmarks: FaceLandmark[]) => {
        if (!landmarks || landmarks.length === 0) {
            console.log("No landmarks found");
            return;
        }

        const drawingUtils = new DrawingUtils(context);

        // Draw different facial features with distinct colors
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
    }, []);

    /**
     * Initializes the camera and sets up video stream
     * Configures video element and canvas dimensions
     */
    const initializeCamera = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !faceLandmarker || isInitializedRef.current) return;

        try {
            console.log("Requesting camera access...");
            // Request HD camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            });

            const video = videoRef.current;
            video.srcObject = stream;

            // Wait for video metadata to load
            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    isVideoReadyRef.current = true;
                    isInitializedRef.current = true;
                    resolve();
                };
            });

            await video.play();
        } catch (error) {
            console.error("Error accessing camera:", error);
            addAlert("Error: Failed to access camera", "danger");
            isInitializedRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faceLandmarker]);

    /**
     * Main detection loop
     * Processes video frames, detects faces, and triggers monitoring functions
     */
    const detect = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isVideoReadyRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        // Check for valid video dimensions
        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            console.warn("Invalid video dimensions, waiting...");
            if (isMonitoring) {
                animationFrameRef.current = requestAnimationFrame(detect);
            }
            return;
        }

        // Draw current video frame
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const currentTime = performance.now();
        const timeSinceLastDetection = currentTime - lastDetectionTimeRef.current;

        try {
            // Detect face landmarks
            const results = faceLandmarker.detectForVideo(video, currentTime);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                for (const landmarks of results.faceLandmarks) {
                    if (landmarks && landmarks.length > 0) {
                        // Draw face mesh
                        drawFaceMesh(context, landmarks);

                        // Process landmarks at configured interval
                        if (timeSinceLastDetection >= detectionIntervalRef.current) {
                            lastDetectionTimeRef.current = currentTime;
                            const nose = landmarks[5]; // nose tip
                            if (nose) {
                                detectDrowsiness(landmarks);
                                detectSuddenMovements(nose, landmarks);
                            }
                        }
                    }
                }
            } else {
                // Alert if no face is detected
                if (timeSinceLastDetection >= detectionIntervalRef.current) {
                    addAlert("Warning: No face detected - stay in view!", "warning");
                }
            }
        } catch (error) {
            console.error("Error during face detection:", error);
        }

        // Continue detection loop if monitoring is active
        if (isMonitoring) {
            animationFrameRef.current = requestAnimationFrame(detect);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faceLandmarker, isMonitoring]);

    /**
     * Starts the monitoring process
     * Initializes camera if needed and begins detection loop
     */
    const startMonitoring = useCallback(async () => {
        if (!isInitializedRef.current) {
            await initializeCamera();
        }
        if (isInitializedRef.current) {
            detect();
        }
    }, [initializeCamera, detect]);

    /**
     * Stops the monitoring process
     * Cleans up resources and stops camera stream
     */
    const stopMonitoring = useCallback(() => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
        isVideoReadyRef.current = false;
        isInitializedRef.current = false;
        lastDetectionTimeRef.current = 0;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMonitoring();
        };
    }, [stopMonitoring]);

    return {
        videoRef,
        canvasRef,
        startMonitoring,
        stopMonitoring,
    };
};
