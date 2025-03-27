import { useRef, useState } from "react";

interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

interface EyeMetrics {
    leftEAR: number;
    rightEAR: number;
    averageEAR: number;
    blinkCount: number;
}

export const useEyeTracking = (handleAlert: (message: string, type: "danger" | "warning") => void) => {
    const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics>({
        leftEAR: 0,
        rightEAR: 0,
        averageEAR: 0,
        blinkCount: 0,
    });

    const lastBlinkRef = useRef(Date.now());
    const blinkCountRef = useRef(0);
    const isEyeClosedRef = useRef(false);

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

    const detectDrowsiness = (landmarks: FaceLandmark[]) => {
        if (!landmarks) {
            console.log("No landmarks found");
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

        // Calculate EAR
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

        const now = Date.now();
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

    return {
        eyeMetrics,
        detectDrowsiness,
    };
}; 