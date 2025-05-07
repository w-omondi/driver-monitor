/**
 * useHeadTracking Hook
 * 
 * A custom hook that implements head tracking and movement analysis for detecting
 * sudden movements, abnormal head poses, and potential accidents. Uses facial
 * landmarks to calculate head pose angles and track movement patterns.
 * 
 * Features:
 * - Real-time head pose estimation (yaw, pitch, roll)
 * - Movement velocity and acceleration analysis
 * - Pattern recognition for normal, abnormal, and accident scenarios
 * - Confidence-based movement classification
 */

import { useRef, useState } from "react";

/**
 * Represents a facial landmark point in 3D space
 */
interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

/**
 * Represents the current head pose angles in degrees
 */
interface HeadPose {
    yaw: number;   // Horizontal rotation (left/right)
    pitch: number; // Vertical rotation (up/down)
    roll: number;  // Side-to-side tilt
}

/**
 * Represents movement data for a single frame
 */
interface MovementData {
    timestamp: number;
    position: FaceLandmark;
    velocity: FaceLandmark;
    acceleration: FaceLandmark;
    pose: HeadPose;
}

/**
 * Represents a classified movement pattern
 */
interface MovementPattern {
    type: "normal" | "abnormal" | "accident";
    confidence: number;
    description: string;
}

/**
 * Thresholds and configuration values for movement analysis
 * All values are based on empirical testing and typical ranges
 */
const MOVEMENT_THRESHOLDS = {
    // --- VELOCITY ---
    // Face landmark coordinates change very little between frames unless there's sudden motion.
    // Values are normalized from the frame (0 to 1 range).
    // Range: 0 (no movement) to 1 (maximum movement)
    VELOCITY_THRESHOLD: 0.08,            // Normal subtle head movement (0.05-0.08: typical range)
    HIGH_VELOCITY_THRESHOLD: 0.18,       // Sudden head motion (0.15-0.25: concerning range)

    // --- ACCELERATION ---
    // Acceleration magnitudes in 3D are usually smaller since frame-to-frame difference is already tiny.
    // Range: 0 (no acceleration) to 1 (maximum acceleration)
    ACCELERATION_THRESHOLD: 0.05,       // Subtle acceleration (0.03-0.05: normal range)
    HIGH_ACCELERATION_THRESHOLD: 0.08,   // High acceleration (0.08-0.15: concerning range)

    // --- POSE ANGLES (degrees) ---
    // These are angular thresholds, not normalized — real degrees.
    // Range: 0° (neutral) to 180° (maximum rotation)
    POSE_THRESHOLD: 55,                  // Typical slight tilt (30°-55°: normal range)
    HIGH_POSE_THRESHOLD: 80,             // Sharp rotation (80°-120°: concerning range)

    // --- TIME + FRAMES ---
    // Time-based thresholds in milliseconds
    UNCONSCIOUSNESS_THRESHOLD: 5000,     // 5 seconds without movement (3000-7000ms: typical range)
    INITIALIZATION_FRAMES: 15,           // Warm-up period (10-20 frames: typical range)
    ACCIDENT_CONFIRMATION_FRAMES: 5,     // Confirmation frames (3-7 frames: typical range)
};

export const useHeadTracking = (
    handleAlert: (message: string, type: "danger" | "warning") => void
) => {
    // State for current head pose and movement pattern
    const [headPose, setHeadPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
    const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);

    // Refs for tracking movement history and state
    const movementHistoryRef = useRef<MovementData[]>([]);
    const frameCountRef = useRef(0);
    const isInitializedRef = useRef(false);
    const accidentConfirmationCountRef = useRef(0);
    const lastAccidentTimeRef = useRef<number | null>(null);

    const MAX_HISTORY_LENGTH = 50;

    /**
     * Calculates head pose angles using facial landmarks
     * Uses the nose and eye positions to estimate rotation in 3D space
     * 
     * @param landmarks - Array of facial landmarks
     * @returns HeadPose object with calculated angles
     */
    const calculateHeadPose = (landmarks: FaceLandmark[]): HeadPose => {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        // Yaw: Horizontal turning (left/right)
        const yaw = Math.atan2(rightEye.z - leftEye.z, rightEye.x - leftEye.x) * (180 / Math.PI);
        // Pitch: Nodding up/down
        const pitch = Math.atan2(nose.y - (leftEye.y + rightEye.y) / 2, nose.z) * (180 / Math.PI);
        // Roll: Head tilt left/right (2D angle between the eyes)
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

        return { yaw, pitch, roll };
    };

    /**
     * Calculates movement data between frames
     * Computes velocity and acceleration based on position changes
     * 
     * @param currentPosition - Current nose position
     * @param currentTime - Current timestamp
     * @param landmarks - Current facial landmarks
     * @returns MovementData object or null if calculation not possible
     */
    const calculateMovementData = (
        currentPosition: FaceLandmark,
        currentTime: number,
        landmarks: FaceLandmark[]
    ): MovementData | null => {
        const history = movementHistoryRef.current;

        if (history.length === 0) {
            return {
                timestamp: currentTime,
                position: currentPosition,
                velocity: { x: 0, y: 0, z: 0 },
                acceleration: { x: 0, y: 0, z: 0 },
                pose: calculateHeadPose(landmarks),
            };
        }

        const last = history[history.length - 1];
        const dt = (currentTime - last.timestamp) / 1000; // time delta in seconds
        if (dt === 0) return null;

        // Calculate velocity (change in position over time)
        const velocity = {
            x: (currentPosition.x - last.position.x) / dt,
            y: (currentPosition.y - last.position.y) / dt,
            z: (currentPosition.z - last.position.z) / dt,
        };

        // Calculate acceleration (change in velocity over time)
        const acceleration = {
            x: (velocity.x - last.velocity.x) / dt,
            y: (velocity.y - last.velocity.y) / dt,
            z: (velocity.z - last.velocity.z) / dt,
        };

        return {
            timestamp: currentTime,
            position: currentPosition,
            velocity,
            acceleration,
            pose: calculateHeadPose(landmarks),
        };
    };

    /**
     * Determines the primary direction of movement from acceleration vector
     * 
     * @param accel - Acceleration vector
     * @returns String describing the primary direction
     */
    const getMovementDirection = (accel: FaceLandmark): string => {
        const { x, y, z } = accel;
        const abs = { x: Math.abs(x), y: Math.abs(y), z: Math.abs(z) };

        if (abs.z > abs.x && abs.z > abs.y) return z < 0 ? "forward" : "backward";
        if (abs.x > abs.y) return x > 0 ? "right" : "left";
        return y > 0 ? "up" : "down";
    };

    /**
     * Calculates confidence score for movement classification
     * Combines multiple factors to determine how certain we are about the movement type
     * 
     * @param data - Current movement data
     * @returns Confidence score between 0 and 1
     */
    const calculateConfidence = (data: MovementData): number => {
        const { velocity, acceleration, pose } = data;

        const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);
        const accelMag = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
        const poseMax = Math.max(Math.abs(pose.yaw), Math.abs(pose.pitch), Math.abs(pose.roll));

        let confidence = 0;

        // Add confidence based on acceleration magnitude
        if (accelMag > MOVEMENT_THRESHOLDS.HIGH_ACCELERATION_THRESHOLD) {
            confidence += 0.4;
        } else if (accelMag > MOVEMENT_THRESHOLDS.ACCELERATION_THRESHOLD) {
            confidence += 0.2;
        }

        // Add confidence based on velocity magnitude
        if (velocityMag > MOVEMENT_THRESHOLDS.HIGH_VELOCITY_THRESHOLD) {
            confidence += 0.3;
        } else if (velocityMag > MOVEMENT_THRESHOLDS.VELOCITY_THRESHOLD) {
            confidence += 0.1;
        }

        // Add confidence based on head pose angles
        if (poseMax > MOVEMENT_THRESHOLDS.HIGH_POSE_THRESHOLD) {
            confidence += 0.2;
        } else if (poseMax > MOVEMENT_THRESHOLDS.POSE_THRESHOLD) {
            confidence += 0.1;
        }

        // Boost confidence for combined high-magnitude movements
        if (
            accelMag > MOVEMENT_THRESHOLDS.HIGH_ACCELERATION_THRESHOLD &&
            velocityMag > MOVEMENT_THRESHOLDS.HIGH_VELOCITY_THRESHOLD &&
            poseMax > MOVEMENT_THRESHOLDS.HIGH_POSE_THRESHOLD
        ) {
            confidence += 0.2;
        }

        return Math.min(confidence, 1);
    };

    /**
     * Analyzes movement data and classifies it into a pattern
     * Uses confidence scores and thresholds to determine movement type
     * 
     * @param data - Current movement data
     * @returns Classified MovementPattern
     */
    const analyzeMovementPattern = (data: MovementData): MovementPattern => {
        const confidence = calculateConfidence(data);
        const now = Date.now();

        // Ignore movements shortly after an accident alert
        if (lastAccidentTimeRef.current && now - lastAccidentTimeRef.current < 5000) {
            return {
                type: "normal",
                confidence: 1,
                description: "Head movement is within normal range.",
            };
        }

        // Check for potential accident
        if (confidence > 0.9) {
            accidentConfirmationCountRef.current++;
            if (accidentConfirmationCountRef.current >= MOVEMENT_THRESHOLDS.ACCIDENT_CONFIRMATION_FRAMES) {
                lastAccidentTimeRef.current = now;
                const direction = getMovementDirection(data.acceleration);
                return {
                    type: "accident",
                    confidence,
                    description: `Possible collision detected (${direction} impact).`,
                };
            }
        } else {
            accidentConfirmationCountRef.current = 0;
        }

        // Check for abnormal movement
        if (confidence > 0.7) {
            return {
                type: "abnormal",
                confidence,
                description: "Abnormal head movement detected.",
            };
        }

        // Default to normal movement
        return {
            type: "normal",
            confidence: 1,
            description: "Head movement is within normal range.",
        };
    };

    /**
     * Main tracking function that processes each frame
     * Should be called with the current nose landmark and the full landmark array
     * 
     * @param nose - Current nose position
     * @param landmarks - Current facial landmarks
     */
    const detectSuddenMovements = (nose: FaceLandmark, landmarks: FaceLandmark[]) => {
        const now = Date.now();
        const data = calculateMovementData(nose, now, landmarks);

        if (!data) return;

        // Initialize tracking system
        if (!isInitializedRef.current) {
            frameCountRef.current++;
            if (frameCountRef.current < MOVEMENT_THRESHOLDS.INITIALIZATION_FRAMES) {
                movementHistoryRef.current.push(data);
                return;
            }
            isInitializedRef.current = true;
            console.log("Head tracking initialized");
        }

        // Maintain fixed-length motion history
        movementHistoryRef.current = [
            ...movementHistoryRef.current.slice(-MAX_HISTORY_LENGTH + 1),
            data,
        ];

        const pattern = analyzeMovementPattern(data);
        setHeadPose(data.pose);
        setMovementPattern(pattern);

        // Trigger alerts for abnormal movements and accidents
        if (pattern.type === "accident") {
            handleAlert(pattern.description, "danger");
        } else if (pattern.type === "abnormal") {
            handleAlert(pattern.description, "warning");
        }
    };

    return {
        headPose,
        movementPattern,
        detectSuddenMovements,
    };
};
