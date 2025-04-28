import { useCallback, useRef, useState } from "react";

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

// Constants
const EAR_THRESHOLD = 0.4; // Lowered threshold for better sensitivity
const CLOSED_EYES_DURATION = 1500; // Reduced to 1.5 seconds for faster response
const BLINK_COOLDOWN = 300; // 300ms between blinks
const EXCESSIVE_BLINKS_THRESHOLD = 15; // Blinks in 60s
const EXCESSIVE_BLINKS_WINDOW = 60000; // 60s
const DROWSINESS_WINDOW = 5000; // 5 seconds window for drowsiness detection

export const useEyeTracking = (
    handleAlert: (message: string, type: "danger" | "warning") => void
) => {
    const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics>({
        leftEAR: 0,
        rightEAR: 0,
        averageEAR: 0,
        blinkCount: 0,
    });

    const blinkCountRef = useRef(0);
    const lastBlinkTimeRef = useRef(0);
    const eyesClosedStartRef = useRef<number | null>(null);
    const blinkTimestampsRef = useRef<number[]>([]);
    const drowsyAlertSentRef = useRef(false);
    const fatigueAlertSentRef = useRef(false);
    const lastDrowsinessCheckRef = useRef(0);

    const calculateEAR = useCallback((eye: FaceLandmark[]) => {
        const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        return (vertical1 + vertical2) / (2.0 * horizontal || 1); // Avoid divide-by-zero
    }, []);

    const getEyes = useCallback((landmarks: FaceLandmark[]) => {
        const leftEye = [
            landmarks[33],  // outer
            landmarks[160], // top outer
            landmarks[158], // top inner
            landmarks[133], // inner
            landmarks[153], // bottom inner
            landmarks[144], // bottom outer
        ];
        const rightEye = [
            landmarks[362], // outer
            landmarks[385], // top outer
            landmarks[387], // top inner
            landmarks[263], // inner
            landmarks[373], // bottom inner
            landmarks[380], // bottom outer
        ];
        return { leftEye, rightEye };
    }, []);

    const detectDrowsiness = useCallback(
        (landmarks: FaceLandmark[]) => {
            if (!landmarks || landmarks.length < 468) return;

            const { leftEye, rightEye } = getEyes(landmarks);
            const leftEAR = calculateEAR(leftEye);
            const rightEAR = calculateEAR(rightEye);
            const averageEAR = (leftEAR + rightEAR) / 2;

            const now = Date.now();

            // Update metrics
            setEyeMetrics({
                leftEAR: Number(leftEAR.toFixed(3)),
                rightEAR: Number(rightEAR.toFixed(3)),
                averageEAR: Number(averageEAR.toFixed(3)),
                blinkCount: blinkCountRef.current,
            });

            // Filter timestamps within 1 minute
            blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
                (timestamp) => now - timestamp < EXCESSIVE_BLINKS_WINDOW
            );

            // Check for drowsiness only every DROWSINESS_WINDOW milliseconds
            if (now - lastDrowsinessCheckRef.current >= DROWSINESS_WINDOW) {
                lastDrowsinessCheckRef.current = now;

                if (averageEAR < EAR_THRESHOLD) {
                    // Start closed eyes timer
                    if (eyesClosedStartRef.current === null) {
                        eyesClosedStartRef.current = now;
                        console.log("Eyes closed detected, starting timer");
                    }

                    // Check for blink
                    if (
                        now - lastBlinkTimeRef.current > BLINK_COOLDOWN &&
                        eyesClosedStartRef.current &&
                        now - eyesClosedStartRef.current < CLOSED_EYES_DURATION
                    ) {
                        blinkCountRef.current++;
                        blinkTimestampsRef.current.push(now);
                        lastBlinkTimeRef.current = now;
                        console.log("Blink detected, count:", blinkCountRef.current);

                        if (
                            blinkTimestampsRef.current.length > EXCESSIVE_BLINKS_THRESHOLD &&
                            !fatigueAlertSentRef.current
                        ) {
                            console.log("Excessive blinking detected, sending alert");
                            handleAlert(
                                "Warning: Excessive blinking detected - possible fatigue",
                                "warning"
                            );
                            fatigueAlertSentRef.current = true;
                        }
                    }

                    // Check for drowsiness (long eye closure)
                    if (
                        eyesClosedStartRef.current &&
                        now - eyesClosedStartRef.current >= CLOSED_EYES_DURATION &&
                        !drowsyAlertSentRef.current
                    ) {
                        console.log("Drowsiness detected, sending alert");
                        handleAlert("Danger: Eyes closed too long - possible drowsiness", "danger");
                        drowsyAlertSentRef.current = true;
                    }
                } else {
                    // Reset eye-closed state if eyes are open
                    if (eyesClosedStartRef.current) {
                        console.log("Eyes open, resetting state");
                        eyesClosedStartRef.current = null;
                        drowsyAlertSentRef.current = false;
                    }
                }

                // Reset fatigue warning if window passed
                if (
                    blinkTimestampsRef.current.length < EXCESSIVE_BLINKS_THRESHOLD &&
                    fatigueAlertSentRef.current
                ) {
                    console.log("Resetting fatigue warning");
                    fatigueAlertSentRef.current = false;
                }
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    return {
        eyeMetrics,
        detectDrowsiness,
    };
};
