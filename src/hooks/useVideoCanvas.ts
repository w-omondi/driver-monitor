import { DrawingUtils, FaceLandmarker } from "@mediapipe/tasks-vision";
import { useCallback, useRef } from "react";

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
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                },
            });
            video.srcObject = stream;

            // Wait for video to be ready
            await new Promise<void>((resolve) => {
                video.onloadedmetadata = () => {
                    // Set canvas dimensions to match video
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    isVideoReadyRef.current = true;
                    resolve();
                };
            });

            // Ensure video is playing
            await video.play();

            let lastVideoTime = -1;

            const detect = async () => {
                if (!video || !context || !faceLandmarker || !isVideoReadyRef.current) return;

                // Always draw the video frame
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                if (lastVideoTime !== video.currentTime) {
                    lastVideoTime = video.currentTime;
                    const startTimeMs = performance.now();

                    try {
                        const results = faceLandmarker.detectForVideo(video, startTimeMs);

                        if (results.faceLandmarks) {
                            for (const landmarks of results.faceLandmarks) {
                                const nose = landmarks[5]; // Nose tip landmark
                                detectDrowsiness(landmarks);
                                detectSuddenMovements(nose, landmarks);
                                drawFaceMesh(context, landmarks);
                            }
                        } else {
                            addAlert("Warning: No face detected - stay in view!", "warning");
                        }
                    } catch (error) {
                        console.error("Error during face detection:", error);
                        // Don't stop monitoring on error, just continue to next frame
                    }
                }

                if (isMonitoring) {
                    animationFrameRef.current = requestAnimationFrame(detect);
                }
            };

            detect();
        } catch (error) {
            console.error("Error accessing camera:", error);
            addAlert("Error: Failed to access camera", "danger");
        }
    }, [faceLandmarker, isMonitoring, detectDrowsiness, detectSuddenMovements, addAlert]);

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
        isVideoReadyRef.current = false;
    }, []);

    return {
        videoRef,
        canvasRef,
        startMonitoring,
        stopMonitoring,
    };
}; 