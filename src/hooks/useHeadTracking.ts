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

// Fine-tuned thresholds for accident detection
const MOVEMENT_THRESHOLDS = {
    // Velocity thresholds (units per second)
    VELOCITY_THRESHOLD: 0.05,
    HIGH_VELOCITY_THRESHOLD: 0.15,

    // Acceleration thresholds (units per second squared)
    ACCELERATION_THRESHOLD: 0.02,
    HIGH_ACCELERATION_THRESHOLD: 0.05,

    // Pose thresholds (degrees)
    POSE_THRESHOLD: 45,
    HIGH_POSE_THRESHOLD: 60,

    // Timing thresholds (milliseconds)
    UNCONSCIOUSNESS_THRESHOLD: 5000,
    INITIALIZATION_FRAMES: 10,
    ACCIDENT_CONFIRMATION_FRAMES: 3, // Number of consecutive frames needed to confirm accident
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

    const calculateHeadPose = (landmarks: FaceLandmark[]): HeadPose => {
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const yaw = Math.atan2(rightEye.x - leftEye.x, rightEye.y - leftEye.y) * (180 / Math.PI);
        const pitch = Math.atan2(nose.y - (leftEye.y + rightEye.y) / 2, nose.z) * (180 / Math.PI);
        const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

        return { yaw, pitch, roll };
    };

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
        const dt = (currentTime - last.timestamp) / 1000; // convert ms to seconds

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

    const calculateConfidence = (data: MovementData): number => {
        const { velocity, acceleration, pose } = data;

        // Calculate magnitudes
        const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);
        const accelMag = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
        const poseMax = Math.max(Math.abs(pose.yaw), Math.abs(pose.pitch), Math.abs(pose.roll));

        // Initialize confidence score
        let confidence = 0;

        // Check for sudden acceleration (highest weight)
        if (accelMag > MOVEMENT_THRESHOLDS.HIGH_ACCELERATION_THRESHOLD) {
            confidence += 0.4;
        } else if (accelMag > MOVEMENT_THRESHOLDS.ACCELERATION_THRESHOLD) {
            confidence += 0.2;
        }

        // Check for high velocity (medium weight)
        if (velocityMag > MOVEMENT_THRESHOLDS.HIGH_VELOCITY_THRESHOLD) {
            confidence += 0.3;
        } else if (velocityMag > MOVEMENT_THRESHOLDS.VELOCITY_THRESHOLD) {
            confidence += 0.1;
        }

        // Check for extreme head rotation (low weight)
        if (poseMax > MOVEMENT_THRESHOLDS.HIGH_POSE_THRESHOLD) {
            confidence += 0.2;
        } else if (poseMax > MOVEMENT_THRESHOLDS.POSE_THRESHOLD) {
            confidence += 0.1;
        }

        return Math.min(confidence, 1); // Cap at 1.0
    };

    const analyzeMovementPattern = (data: MovementData): MovementPattern => {
        const confidence = calculateConfidence(data);
        const now = Date.now();

        // Check if we're in a cooldown period after a previous accident
        if (lastAccidentTimeRef.current && now - lastAccidentTimeRef.current < 5000) {
            return {
                type: "normal",
                confidence: 0.98,
                description: "Head movement is within normal range.",
            };
        }

        // High confidence accident detection
        if (confidence > 0.8) {
            accidentConfirmationCountRef.current++;

            if (accidentConfirmationCountRef.current >= MOVEMENT_THRESHOLDS.ACCIDENT_CONFIRMATION_FRAMES) {
                lastAccidentTimeRef.current = now;
                return {
                    type: "accident",
                    confidence: confidence,
                    description: "Possible collision detected due to sudden movement.",
                };
            }
        } else {
            // Reset accident confirmation counter if confidence drops
            accidentConfirmationCountRef.current = 0;
        }

        // Abnormal movement detection
        if (confidence > 0.5) {
            return {
                type: "abnormal",
                confidence: confidence,
                description: "Abnormal head movement detected.",
            };
        }

        return {
            type: "normal",
            confidence: 0.98,
            description: "Head movement is within normal range.",
        };
    };

    const detectSuddenMovements = (nose: FaceLandmark, landmarks: FaceLandmark[]) => {
        const now = Date.now();
        const data = calculateMovementData(nose, now, landmarks);

        if (!data) return;

        // Initialize movement history
        if (!isInitializedRef.current) {
            frameCountRef.current++;
            if (frameCountRef.current < MOVEMENT_THRESHOLDS.INITIALIZATION_FRAMES) {
                movementHistoryRef.current = [...movementHistoryRef.current, data];
                return;
            }
            isInitializedRef.current = true;
            console.log("Head tracking initialized");
        }

        // Only process movements if we have enough history
        if (movementHistoryRef.current.length < 2) {
            movementHistoryRef.current = [...movementHistoryRef.current, data];
            return;
        }

        movementHistoryRef.current = [...movementHistoryRef.current.slice(-MAX_HISTORY_LENGTH + 1), data];

        const pattern = analyzeMovementPattern(data);
        setMovementPattern(pattern);
        setHeadPose(data.pose);

        // Handle alerts based on pattern type and confidence
        if (pattern.type === "accident" && pattern.confidence > 0.8) {
            handleAlert("Danger: Possible collision detected!", "danger");
        } else if (pattern.type === "abnormal" && pattern.confidence > 0.5) {
            handleAlert("Warning: Abnormal head movement detected", "warning");
        }
    };

    return {
        headPose,
        movementPattern,
        detectSuddenMovements,
    };
};
