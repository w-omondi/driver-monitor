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

const EAR_THRESHOLD = 0.4;
const CLOSED_EYES_DURATION = 1500;
const BLINK_COOLDOWN = 300;
const EXCESSIVE_BLINKS_THRESHOLD = 15;
const EXCESSIVE_BLINKS_WINDOW = 60000;

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
    const blinkTimestampsRef = useRef<number[]>([]);
    const eyesClosedStartRef = useRef<number | null>(null);
    const lastEARBelowThresholdRef = useRef(false);
    const lastBlinkTimeRef = useRef(0);
    const drowsyAlertSentRef = useRef(false);
    const fatigueAlertSentRef = useRef(false);

    const calculateEAR = useCallback((eye: FaceLandmark[]) => {
        const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        return (vertical1 + vertical2) / (2.0 * horizontal || 1);
    }, []);

    const getEyes = useCallback((landmarks: FaceLandmark[]) => {
        const leftEye = [
            landmarks[33],
            landmarks[160],
            landmarks[158],
            landmarks[133],
            landmarks[153],
            landmarks[144],
        ];
        const rightEye = [
            landmarks[362],
            landmarks[385],
            landmarks[387],
            landmarks[263],
            landmarks[373],
            landmarks[380],
        ];
        return { leftEye, rightEye };
    }, []);

    const detectDrowsiness = useCallback((landmarks: FaceLandmark[]) => {
        if (!landmarks || landmarks.length < 468) return;

        const now = Date.now();
        const { leftEye, rightEye } = getEyes(landmarks);
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const averageEAR = (leftEAR + rightEAR) / 2;

        setEyeMetrics({
            leftEAR: Number(leftEAR.toFixed(3)),
            rightEAR: Number(rightEAR.toFixed(3)),
            averageEAR: Number(averageEAR.toFixed(3)),
            blinkCount: blinkCountRef.current,
        });

        const eyesClosed = averageEAR < EAR_THRESHOLD;

        // BLINK DETECTION
        if (!lastEARBelowThresholdRef.current && eyesClosed) {
            // Transition from open to closed
            eyesClosedStartRef.current = now;
        }

        if (lastEARBelowThresholdRef.current && !eyesClosed) {
            // Transition from closed to open (potential blink)
            if (
                eyesClosedStartRef.current &&
                now - eyesClosedStartRef.current < CLOSED_EYES_DURATION &&
                now - lastBlinkTimeRef.current > BLINK_COOLDOWN
            ) {
                blinkCountRef.current++;
                blinkTimestampsRef.current.push(now);
                lastBlinkTimeRef.current = now;

                // Filter timestamps within 1 minute
                blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
                    (t) => now - t < EXCESSIVE_BLINKS_WINDOW
                );

                if (
                    blinkTimestampsRef.current.length > EXCESSIVE_BLINKS_THRESHOLD &&
                    !fatigueAlertSentRef.current
                ) {
                    handleAlert(
                        "Warning: Excessive blinking detected - possible fatigue",
                        "warning"
                    );
                    fatigueAlertSentRef.current = true;
                }
            }

            // Reset drowsiness detection
            eyesClosedStartRef.current = null;
            drowsyAlertSentRef.current = false;
        }

        // DROWSINESS DETECTION (long closure)
        if (
            eyesClosed &&
            eyesClosedStartRef.current &&
            now - eyesClosedStartRef.current >= CLOSED_EYES_DURATION &&
            !drowsyAlertSentRef.current
        ) {
            handleAlert(
                "Danger: Eyes closed too long - possible drowsiness",
                "danger"
            );
            drowsyAlertSentRef.current = true;
        }

        // Reset fatigue alert if user normalizes
        if (
            blinkTimestampsRef.current.length < EXCESSIVE_BLINKS_THRESHOLD &&
            fatigueAlertSentRef.current
        ) {
            fatigueAlertSentRef.current = false;
        }

        lastEARBelowThresholdRef.current = eyesClosed;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return {
        eyeMetrics,
        detectDrowsiness,
    };
};
