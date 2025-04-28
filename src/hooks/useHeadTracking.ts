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
    VELOCITY_THRESHOLD: 0.05,
    ACCELERATION_THRESHOLD: 0.01,
    POSE_THRESHOLD: 45,
    UNCONSCIOUSNESS_THRESHOLD: 5000,
    INITIALIZATION_FRAMES: 10,
};

export const useHeadTracking = (
    handleAlert: (message: string, type: "danger" | "warning") => void
) => {
    const [headPose, setHeadPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
    const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);
    const movementHistoryRef = useRef<MovementData[]>([]);
    const frameCountRef = useRef(0);
    const isInitializedRef = useRef(false);
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

    const analyzeMovementPattern = (data: MovementData): MovementPattern => {
        const { velocity, pose } = data;

        const velocityMag = Math.hypot(velocity.x, velocity.y, velocity.z);
        const poseMax = Math.max(Math.abs(pose.yaw), Math.abs(pose.pitch), Math.abs(pose.roll));

        if (velocityMag > MOVEMENT_THRESHOLDS.VELOCITY_THRESHOLD) {
            return {
                type: "abnormal",
                confidence: 0.75,
                description: "Abnormal head movement velocity detected.",
            };
        }

        if (poseMax > MOVEMENT_THRESHOLDS.POSE_THRESHOLD) {
            return {
                type: "abnormal",
                confidence: 0.6,
                description: "Excessive head rotation detected.",
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

        if (!isInitializedRef.current) {
            frameCountRef.current++;
            if (frameCountRef.current < MOVEMENT_THRESHOLDS.INITIALIZATION_FRAMES) {
                movementHistoryRef.current = [...movementHistoryRef.current, data];
                return;
            }
            isInitializedRef.current = true;
            console.log("Head tracking initialized");
        }

        movementHistoryRef.current = [...movementHistoryRef.current.slice(-MAX_HISTORY_LENGTH + 1), data];

        const pattern = analyzeMovementPattern(data);
        setMovementPattern(pattern);
        setHeadPose(data.pose);

        if (pattern.type === "abnormal") {
            handleAlert(pattern.description, "warning");
        }
    };

    return {
        headPose,
        movementPattern,
        detectSuddenMovements,
    };
};
