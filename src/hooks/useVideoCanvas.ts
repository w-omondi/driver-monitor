import { DrawingUtils, FaceLandmarker} from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef } from "react";

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const isVideoReadyRef = useRef(false);
    const lastDetectionTimeRef = useRef(0);
    const detectionIntervalRef = useRef(100); // ~10 FPS detection
    const isInitializedRef = useRef(false);

    const drawFaceMesh = useCallback((context: CanvasRenderingContext2D, landmarks: FaceLandmark[]) => {
        if (!landmarks || landmarks.length === 0) {
            console.log("No landmarks found");
            return;
        }

        const drawingUtils = new DrawingUtils(context);

        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
    }, []);

    const initializeCamera = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !faceLandmarker || isInitializedRef.current) return;

        try {
            console.log("Requesting camera access...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            });

            const video = videoRef.current;
            video.srcObject = stream;

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

    const detect = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !faceLandmarker || !isVideoReadyRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;

        if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            console.warn("Invalid video dimensions, waiting...");
            if (isMonitoring) {
                animationFrameRef.current = requestAnimationFrame(detect);
            }
            return;
        }

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const currentTime = performance.now();
        const timeSinceLastDetection = currentTime - lastDetectionTimeRef.current;

        try {
            const results  = faceLandmarker.detectForVideo(video, currentTime);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                for (const landmarks of results.faceLandmarks) {
                    if (landmarks && landmarks.length > 0) {
                        drawFaceMesh(context, landmarks);

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
                if (timeSinceLastDetection >= detectionIntervalRef.current) {
                    addAlert("Warning: No face detected - stay in view!", "warning");
                }
            }
        } catch (error) {
            console.error("Error during face detection:", error);
        }

        if (isMonitoring) {
            animationFrameRef.current = requestAnimationFrame(detect);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faceLandmarker, isMonitoring]);

    const startMonitoring = useCallback(async () => {
        if (!isInitializedRef.current) {
            await initializeCamera();
        }
        if (isInitializedRef.current) {
            detect();
        }
    }, [initializeCamera, detect]);

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
