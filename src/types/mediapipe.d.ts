declare module '@mediapipe/tasks-vision' {
    interface Landmark {
        x: number;
        y: number;
        z: number;
    }

    export class DrawingUtils {
        constructor(context: CanvasRenderingContext2D);
        drawConnectors(landmarks: Landmark[], connections: [number, number][], options: { color: string; lineWidth?: number }): void;
    }

    export class FaceLandmarker {
        static createFromOptions(filesetResolver: FilesetResolver, options: FaceLandmarkerOptions): Promise<FaceLandmarker>;
        static FACE_LANDMARKS_TESSELATION: [number, number][];
        static FACE_LANDMARKS_RIGHT_EYE: [number, number][];
        static FACE_LANDMARKS_RIGHT_EYEBROW: [number, number][];
        static FACE_LANDMARKS_LEFT_EYE: [number, number][];
        static FACE_LANDMARKS_LEFT_EYEBROW: [number, number][];
        static FACE_LANDMARKS_FACE_OVAL: [number, number][];
        static FACE_LANDMARKS_LIPS: [number, number][];
        detectForVideo(video: HTMLVideoElement, timestamp: number): {
            faceLandmarks: Landmark[][],
            faceBlendshapes: { categoryName: string; score: number }[][]
        };
    }

    export class FilesetResolver {
        static forVisionTasks(baseUrl: string): Promise<FilesetResolver>;
    }

    interface FaceLandmarkerOptions {
        baseOptions: {
            modelAssetPath: string;
            delegate: string;
        };
        outputFaceBlendshapes: boolean;
        runningMode: "IMAGE" | "VIDEO";
        numFaces: number;
    }
} 