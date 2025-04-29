import { useRef, useState } from "react";

interface FaceLandmark {
    x: number;
    y: number;
    z: number;
}

interface HeadPose {
    yaw: number;
    pitch: number;
    roll: number;
}

interface MovementData {
    timestamp: number;
    position: FaceLandmark;
    velocity: FaceLandmark;
    acceleration: FaceLandmark;
    pose: HeadPose;
}

interface MovementPattern {
    type: "normal" | "abnormal" | "accident";
    confidence: number;
    description: string;
}

// Configurable thresholds for motion evaluation
const MOVEMENT_THRESHOLDS = {
    VELOCITY_THRESHOLD: 0.05,
    HIGH_VELOCITY_THRESHOLD: 0.15,

    ACCELERATION_THRESHOLD: 0.02,
    HIGH_ACCELERATION_THRESHOLD: 0.05,

    POSE_THRESHOLD: 45,
    HIGH_POSE_THRESHOLD: 60,

    UNCONSCIOUSNESS_THRESHOLD: 5000,
    INITIALIZATION_FRAMES: 10,
    ACCIDENT_CONFIRMATION_FRAMES: 3,
};

export const useHeadTracking = (
    handleAlert: (message: string, type: "danger" | "warning") => void
) => {
    const [headPose, setHeadPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
    const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);

    const movementHistoryRef = useRef<MovementData[]>([]);
    const frameCountRef = useRef(0);
    const isInitializedRef = useRef(false);
    const accidentConfirmationCountRef = useRef(0);
    const lastAccidentTimeRef = useRef<number | null>(null);

    const MAX_HISTORY_LENGTH = 50;

    // Estimate head rotation (yaw, pitch, roll) using eye and nose landmarks
    const calculateHeadPose = (landmarks: FaceLandmark[]): HeadPose => {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const yaw = Math.atan2(rightEye.x - leftEye.x, rightEye.y - leftEye.y) * (180 / Math.PI);
        const pitch = Math.atan2(nose.y - (leftEye.y + rightEye.y) / 2, nose.z) * (180 / Math.PI);
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

        return { yaw, pitch, roll };
    };

    // Calculate motion between current and previous frame
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

        const velocity = {
            x: (currentPosition.x - last.position.x) / dt,
            y: (currentPosition.y - last.position.y) / dt,
            z: (currentPosition.z - last.position.z) / dt,
        };

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

    // Utility: Determine direction of movement from acceleration vector
    const getMovementDirection = (accel: FaceLandmark): string => {
        const { x, y, z } = accel;
        const abs = { x: Math.abs(x), y: Math.abs(y), z: Math.abs(z) };

        if (abs.z > abs.x && abs.z > abs.y) return z < 0 ? "forward" : "backward";
        if (abs.x > abs.y) return x > 0 ? "right" : "left";
        return y > 0 ? "up" : "down";
    };

    // Evaluate confidence based on motion magnitudes
    const calculateConfidence = (data: MovementData): number => {
        const { velocity, acceleration, pose } = data;

        const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);
        const accelMag = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
        const poseMax = Math.max(Math.abs(pose.yaw), Math.abs(pose.pitch), Math.abs(pose.roll));

        let confidence = 0;

        if (accelMag > MOVEMENT_THRESHOLDS.HIGH_ACCELERATION_THRESHOLD) {
            confidence += 0.4;
        } else if (accelMag > MOVEMENT_THRESHOLDS.ACCELERATION_THRESHOLD) {
            confidence += 0.2;
        }

        if (velocityMag > MOVEMENT_THRESHOLDS.HIGH_VELOCITY_THRESHOLD) {
            confidence += 0.3;
        } else if (velocityMag > MOVEMENT_THRESHOLDS.VELOCITY_THRESHOLD) {
            confidence += 0.1;
        }

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

    // Analyze movement and return classification pattern
    const analyzeMovementPattern = (data: MovementData): MovementPattern => {
        const confidence = calculateConfidence(data);
        const now = Date.now();

        if (lastAccidentTimeRef.current && now - lastAccidentTimeRef.current < 5000) {
            return {
                type: "normal",
                confidence: 0.98,
                description: "Head movement is within normal range.",
            };
        }

        if (confidence > 0.8) {
            accidentConfirmationCountRef.current++;
            if (
                accidentConfirmationCountRef.current >= MOVEMENT_THRESHOLDS.ACCIDENT_CONFIRMATION_FRAMES
            ) {
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

        if (confidence > 0.65) {
            return {
                type: "abnormal",
                confidence,
                description: "Abnormal head movement detected.",
            };
        }

        return {
            type: "normal",
            confidence: 0.98,
            description: "Head movement is within normal range.",
        };
    };

    /**
     * Main tracking function.
     * Should be called with the current nose landmark and the full landmark array per frame.
     */
    const detectSuddenMovements = (nose: FaceLandmark, landmarks: FaceLandmark[]) => {
        const now = Date.now();
        const data = calculateMovementData(nose, now, landmarks);

        if (!data) return;

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
        setMovementPattern(pattern);
        setHeadPose(data.pose);

        // Emit alerts based on pattern classification
        if (pattern.type === "accident" && pattern.confidence > 0.8) {
            handleAlert(pattern.description, "danger");
        } else if (pattern.type === "abnormal" && pattern.confidence > 0.65) {
            handleAlert("Warning: Abnormal head movement detected", "warning");
        }

        // Debug output
        console.log({
            velocity: data.velocity,
            acceleration: data.acceleration,
            pose: data.pose,
            confidence: pattern.confidence,
            type: pattern.type,
        });
    };

    return {
        headPose,
        movementPattern,
        detectSuddenMovements,
    };
};
