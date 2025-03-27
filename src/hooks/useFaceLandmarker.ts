import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useEffect, useState } from "react";

export const useFaceLandmarker = () => {
    const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    return { faceLandmarker, isLoading };
}; 