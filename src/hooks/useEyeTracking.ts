/**
 * useEyeTracking Hook
 * 
 * A custom hook that implements eye tracking and drowsiness detection using
 * facial landmarks. It calculates the Eye Aspect Ratio (EAR) to detect eye
 * closure and monitors blink patterns to identify potential fatigue.
 * 
 * The hook uses the following detection methods:
 * 1. Eye Aspect Ratio (EAR) calculation for eye closure detection
 * 2. Blink frequency monitoring for fatigue detection
 * 3. Extended eye closure detection for drowsiness alerts
 * 
 * @param handleAlert - Callback function to trigger alerts
 * @returns {Object} Eye tracking metrics and detection function
 */

import { useCallback, useRef, useState } from "react";

/**
 * Represents a facial landmark point in 3D space
 */
interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

/**
 * Represents the current eye tracking metrics
 */
interface EyeMetrics {
    leftEAR: number;    // Left eye aspect ratio
    rightEAR: number;   // Right eye aspect ratio
    averageEAR: number; // Average of both eyes
    blinkCount: number; // Total number of blinks detected
}

// Eye Aspect Ratio (EAR) thresholds and timing configurations
// Range: 0 (fully closed) to 1 (fully open)
const EAR_THRESHOLD = 0.4;                // Eye closure threshold (0.3-0.4: typical range for detecting closed eyes)

// Time-based thresholds (in milliseconds)
const CLOSED_EYES_DURATION = 1500;        // Duration to consider eyes as closed (1000-2000ms: typical range)
const BLINK_COOLDOWN = 300;               // Minimum time between blinks (200-400ms: typical range)

// Blink frequency monitoring
const EXCESSIVE_BLINKS_THRESHOLD = 15;    // Maximum blinks per minute (12-18: typical range)
const EXCESSIVE_BLINKS_WINDOW = 60000;    // Time window for blink counting (60000ms = 1 minute)

export const useEyeTracking = (
    handleAlert: (message: string, type: "danger" | "warning") => void
) => {
    // State for current eye metrics
    const [eyeMetrics, setEyeMetrics] = useState<EyeMetrics>({
        leftEAR: 0,
        rightEAR: 0,
        averageEAR: 0,
        blinkCount: 0,
    });

    // Refs for tracking blink patterns and eye states
    const blinkCountRef = useRef(0);
    const blinkTimestampsRef = useRef<number[]>([]);
    const eyesClosedStartRef = useRef<number | null>(null);
    const lastEARBelowThresholdRef = useRef(false);
    const lastBlinkTimeRef = useRef(0);
    const drowsyAlertSentRef = useRef(false);
    const fatigueAlertSentRef = useRef(false);

    /**
     * Calculates the Eye Aspect Ratio (EAR) for a given eye
     * EAR is the ratio of the height of the eye to its width
     * Lower values indicate more closed eyes
     * 
     * @param eye - Array of facial landmarks for one eye
     * @returns The calculated EAR value
     */
    const calculateEAR = useCallback((eye: FaceLandmark[]) => {
        const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
        const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
        const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
        return (vertical1 + vertical2) / (2.0 * horizontal || 1);
    }, []);

    /**
     * Extracts the landmark points for both eyes from the full face landmarks
     * 
     * @param landmarks - Array of all facial landmarks
     * @returns Object containing left and right eye landmarks
     */
    const getEyes = useCallback((landmarks: FaceLandmark[]) => {
        const leftEye = [
            landmarks[33],  // Left eye corner
            landmarks[160], // Left eye top
            landmarks[158], // Left eye top inner
            landmarks[133], // Left eye bottom
            landmarks[153], // Left eye bottom inner
            landmarks[144], // Left eye corner inner
        ];
        const rightEye = [
            landmarks[362], // Right eye corner
            landmarks[385], // Right eye top
            landmarks[387], // Right eye top inner
            landmarks[263], // Right eye bottom
            landmarks[373], // Right eye bottom inner
            landmarks[380], // Right eye corner inner
        ];
        return { leftEye, rightEye };
    }, []);

    /**
     * Main function for detecting drowsiness and fatigue
     * Processes facial landmarks to:
     * 1. Calculate eye aspect ratios
     * 2. Detect blinks
     * 3. Monitor for extended eye closure
     * 4. Track blink frequency
     * 
     * @param landmarks - Array of facial landmarks from MediaPipe
     */
    const detectDrowsiness = useCallback((landmarks: FaceLandmark[]) => {
        if (!landmarks || landmarks.length < 468) return;

        const now = Date.now();
        const { leftEye, rightEye } = getEyes(landmarks);
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const averageEAR = (leftEAR + rightEAR) / 2;

        // Update current eye metrics
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
                // Valid blink detected
                blinkCountRef.current++;
                blinkTimestampsRef.current.push(now);
                lastBlinkTimeRef.current = now;

                // Filter timestamps within 1 minute
                blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
                    (t) => now - t < EXCESSIVE_BLINKS_WINDOW
                );

                // Check for excessive blinking (fatigue)
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
