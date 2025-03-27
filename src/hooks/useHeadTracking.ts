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

const MOVEMENT_THRESHOLDS = {
    VELOCITY_THRESHOLD: 30,
    ACCELERATION_THRESHOLD: 15,
    POSE_THRESHOLD: 45,
    UNCONSCIOUSNESS_THRESHOLD: 5000,
    NORMAL_MOVEMENT_PATTERN: {
        MAX_VELOCITY: 20,
        MAX_ACCELERATION: 10,
        MAX_POSE_CHANGE: 30,
    },
};

export const useHeadTracking = (handleAlert: (message: string, type: "danger" | "warning") => void) => {
    const [headPose, setHeadPose] = useState<HeadPose>({
        yaw: 0,
        pitch: 0,
        roll: 0,
    });
    const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);
    const movementHistoryRef = useRef<MovementData[]>([]);
    const previousNosePositionRef = useRef<FaceLandmark | null>(null);
    const unconsciousnessStartTimeRef = useRef<number | null>(null);
    const MAX_HISTORY_LENGTH = 50;

    const calculateHeadPose = (landmarks: FaceLandmark[]): HeadPose => {
        const nose = landmarks[5];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        const yaw = Math.atan2(rightEye.x - leftEye.x, rightEye.y - leftEye.y) * (180 / Math.PI);
        const pitch = Math.atan2(
            nose.y - (leftEye.y + rightEye.y) / 2,
            nose.x - (leftEye.x + rightEye.x) / 2
        ) * (180 / Math.PI);
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

        const lastData = history[history.length - 1];
        const timeDiff = currentTime - lastData.timestamp;

        if (timeDiff === 0) return null;

        const velocity = {
            x: (currentPosition.x - lastData.position.x) / timeDiff,
            y: (currentPosition.y - lastData.position.y) / timeDiff,
            z: (currentPosition.z - lastData.position.z) / timeDiff,
        };

        const acceleration = {
            x: (velocity.x - lastData.velocity.x) / timeDiff,
            y: (velocity.y - lastData.velocity.y) / timeDiff,
            z: (velocity.z - lastData.velocity.z) / timeDiff,
        };

        return {
            timestamp: currentTime,
            position: currentPosition,
            velocity,
            acceleration,
            pose: calculateHeadPose(landmarks),
        };
    };

    const analyzeMovementPattern = (movementData: MovementData): MovementPattern => {
        const { velocity, acceleration, pose } = movementData;

        const velocityMagnitude = Math.sqrt(
            Math.pow(velocity.x, 2) + Math.pow(velocity.y, 2) + Math.pow(velocity.z, 2)
        );
        const accelerationMagnitude = Math.sqrt(
            Math.pow(acceleration.x, 2) + Math.pow(acceleration.y, 2) + Math.pow(acceleration.z, 2)
        );

        const poseChange = Math.max(
            Math.abs(pose.yaw),
            Math.abs(pose.pitch),
            Math.abs(pose.roll)
        );

        if (accelerationMagnitude > MOVEMENT_THRESHOLDS.ACCELERATION_THRESHOLD) {
            return {
                type: "accident",
                confidence: 0.9,
                description: "Sudden acceleration detected - possible collision",
            };
        }

        if (velocityMagnitude > MOVEMENT_THRESHOLDS.VELOCITY_THRESHOLD) {
            return {
                type: "abnormal",
                confidence: 0.7,
                description: "Unusual head movement detected",
            };
        }

        if (poseChange > MOVEMENT_THRESHOLDS.POSE_THRESHOLD) {
            return {
                type: "abnormal",
                confidence: 0.6,
                description: "Excessive head rotation detected",
            };
        }

        return {
            type: "normal",
            confidence: 0.9,
            description: "Normal head movement",
        };
    };

    const detectSuddenMovements = (nose: FaceLandmark, landmarks: FaceLandmark[]) => {
        const now = Date.now();
        const movementData = calculateMovementData(nose, now, landmarks);

        if (!movementData) return;

        movementHistoryRef.current = [
            ...movementHistoryRef.current.slice(-MAX_HISTORY_LENGTH + 1),
            movementData,
        ];

        const pattern = analyzeMovementPattern(movementData);
        setMovementPattern(pattern);
        setHeadPose(movementData.pose);

        if (pattern.type === "accident") {
            handleAlert(pattern.description, "danger");
        } else if (pattern.type === "abnormal") {
            handleAlert(pattern.description, "warning");
        }

        if (pattern.type === "accident" || pattern.type === "abnormal") {
            if (!unconsciousnessStartTimeRef.current) {
                unconsciousnessStartTimeRef.current = now;
            } else if (
                now - unconsciousnessStartTimeRef.current >
                MOVEMENT_THRESHOLDS.UNCONSCIOUSNESS_THRESHOLD
            ) {
                handleAlert(
                    "Warning: Possible unconsciousness detected after sudden movement!",
                    "danger"
                );
            }
        } else {
            unconsciousnessStartTimeRef.current = null;
        }

        previousNosePositionRef.current = nose;
    };

    return {
        headPose,
        movementPattern,
        detectSuddenMovements,
    };
}; 