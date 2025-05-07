# Driver Monitoring System

A real-time driver monitoring system that uses computer vision to detect drowsiness, fatigue, and potential accidents. The system uses facial landmarks to track eye movements, head pose, and sudden movements to ensure driver safety.

## Features

### Real-time Monitoring

- **Eye Tracking**: Detects drowsiness and fatigue by monitoring:
  - Eye closure duration
  - Blink frequency
  - Eye aspect ratio (EAR)
- **Head Tracking**: Monitors head movements and poses:
  - Sudden movements detection
  - Abnormal head poses
  - Potential accident detection
- **Alert System**: Provides real-time alerts for:
  - Drowsiness warnings
  - Fatigue detection
  - Sudden movements
  - Camera access issues

### Technical Features

- Real-time video processing
- Face landmark detection
- Movement pattern analysis
- Configurable alert thresholds
- Automatic alert cleanup
- Sound notifications
- External alert distribution

## Technology Stack

### Core Technologies

- **React**: Frontend framework
- **TypeScript**: Type-safe JavaScript
- **MediaPipe**: Face landmark detection
- **Canvas API**: Real-time video rendering
- **WebRTC**: Camera access and video streaming

### Key Libraries

- `@mediapipe/tasks-vision`: Face landmark detection
- `@mediapipe/drawing_utils`: Face mesh visualization
- `react`: UI components and state management
- `typescript`: Type definitions and interfaces

## Architecture

### Components

1. **DriverMonitor**: Main monitoring component
2. **StatusBar**: System status display
3. **Alert**: Individual alert component
4. **AlertList**: Alert history management
5. **StatusIndicators**: System status indicators

### Hooks

1. **useFaceLandmarker**: MediaPipe model initialization
2. **useAlerts**: Alert system management
3. **useEyeTracking**: Eye movement analysis
4. **useHeadTracking**: Head movement analysis
5. **useVideoCanvas**: Video processing and rendering

### Context

- **MonitoringContext**: Global state management for:
  - Monitoring status
  - Alert system
  - Alert history

## How It Works

### Face Detection

1. Camera stream is captured using WebRTC
2. MediaPipe Face Landmarker processes each frame
3. 468 facial landmarks are detected in real-time
4. Face mesh is rendered on canvas for visualization

### Drowsiness Detection

1. Eye Aspect Ratio (EAR) is calculated for both eyes
2. Blink patterns are analyzed for frequency
3. Extended eye closure is detected
4. Alerts are triggered based on thresholds:
   - Warning: Excessive blinking
   - Danger: Extended eye closure

### Head Movement Analysis

1. Head pose angles are calculated (yaw, pitch, roll)
2. Movement velocity and acceleration are analyzed
3. Movement patterns are classified:
   - Normal: Regular head movements
   - Abnormal: Sudden or unusual movements
   - Accident: Potential impact detection

### Alert System

1. Alerts are created with severity levels:
   - Warning: Non-critical issues
   - Danger: Critical safety concerns
   - Success: System status updates
2. Alerts have configurable durations
3. Automatic cleanup of expired alerts
4. Sound notifications for different alert types
5. External alert distribution via API

## Configuration

### Alert Settings

- Maximum alerts: 50
- Default alert duration: 10 seconds
- Alert cleanup interval: 1 minute

### Detection Thresholds

- Eye closure: 1.5 seconds
- Blink cooldown: 300ms
- Excessive blinks: 15 per minute
- Movement velocity: 0.08-0.18
- Movement acceleration: 0.05-0.08
- Head pose angles: 55°-80°

## Development Requirements

- **Node.js**: Version 18.x or higher
- **Yarn**: Version 1.22.x or higher
- **Git**: For version control
- **Code Editor**: VS Code recommended with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

## Getting Started

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Start the development server:

   ```bash
   yarn dev
   ```

3. Access the application at `http://localhost:3000`

## Requirements

- Modern web browser with WebRTC support
- Camera access
- Minimum 720p camera resolution
- Good lighting conditions
- Stable internet connection

## Security

- Camera access is requested explicitly
- No video data is stored
- Alerts are processed locally
- External alerts require API configuration

## Performance

- GPU-accelerated face detection
- Configurable FPS (default: 10 FPS)
- Efficient alert management
- Automatic resource cleanup
