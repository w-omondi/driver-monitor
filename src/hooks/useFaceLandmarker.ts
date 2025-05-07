/**
 * useFaceLandmarker Hook
 * 
 * A custom hook that initializes and manages the MediaPipe Face Landmarker model.
 * This hook is responsible for loading the face landmark detection model and
 * providing it to other components that need face tracking capabilities.
 * 
 * The model is loaded from MediaPipe's CDN and uses GPU acceleration for better
 * performance. It's configured to track a single face in real-time video mode.
 * 
 * @returns {Object} An object containing:
 *   - faceLandmarker: The initialized FaceLandmarker instance or null if not loaded
 *   - isLoading: Boolean indicating if the model is still loading
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useState } from "react";

export const useFaceLandmarker = () => {
    // State for the face landmarker instance and loading status
    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        /**
         * Loads the MediaPipe Face Landmarker model
         * This function:
         * 1. Initializes the MediaPipe fileset resolver
         * 2. Creates a new FaceLandmarker instance with GPU acceleration
         * 3. Configures the model for real-time video processing
         */
        const loadModel = async () => {
            if (typeof window === "undefined") return;

            try {
                console.log("Loading Face Mesh model...");
                // Initialize the MediaPipe fileset resolver
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );

                // Create and configure the face landmarker
                const landmarker = await FaceLandmarker.createFromOptions(
                    filesetResolver,
                    {
                        baseOptions: {
                            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                            delegate: "GPU", // Use GPU for better performance
                        },
                        outputFaceBlendshapes: true, // Enable facial expression tracking
                        runningMode: "VIDEO", // Configure for real-time video processing
                        numFaces: 1, // Track only one face at a time
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

    return { faceLandmarker, isLoading };
}; 