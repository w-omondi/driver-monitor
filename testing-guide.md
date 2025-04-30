# Driver Monitoring System Testing Guide

This guide provides detailed instructions for testing both the accident detection and drowsiness detection features of the driver monitoring system.

## Table of Contents

- [Accident Detection Testing](#accident-detection-testing)
- [Drowsiness Detection Testing](#drowsiness-detection-testing)
- [General Testing Tips](#general-testing-tips)
- [Troubleshooting](#troubleshooting)

## Accident Detection Testing

### Basic Movement Testing

#### Normal Head Movements

- **Slow head turns**: Turn your head slowly left and right
- **Gentle nodding**: Nod your head up and down slowly
- **Slight tilting**: Tilt your head slightly to each side
- **Expected result**: No alerts should be triggered

#### Abnormal Movements

- **Quick head turns**: Turn your head quickly from side to side
- **Rapid nodding**: Nod your head up and down quickly
- **Sudden tilting**: Tilt your head suddenly to one side
- **Expected result**: "Warning: Abnormal head movement detected" alerts may appear

### Accident Simulation Testing

#### Sudden Acceleration (Primary Trigger)

- **Forward jerk**: Quickly move your head forward as if hitting the brakes
- **Backward jerk**: Quickly move your head backward as if accelerating
- **Side jerk**: Quickly move your head to the side as if swerving
- **Expected result**: "Danger: Possible collision detected!" alert should appear

#### Combined Movements (Higher Confidence)

- **Forward jerk + head rotation**: Move your head forward while rotating it
- **Side jerk + head tilt**: Move your head sideways while tilting it
- **Backward jerk + nodding**: Move your head backward while nodding
- **Expected result**: Higher confidence accident detection, more reliable alerts

### Accident Detection Testing Methodology

1. **Controlled Testing**

   - Start with the camera at eye level
   - Ensure good lighting for accurate face detection
   - Test each movement type 3-5 times
   - Record which movements trigger alerts
   - Note the confidence levels in the console logs

2. **Realistic Testing**
   - Simulate a sudden stop by moving your head forward quickly
   - Simulate a side impact by moving your head sideways suddenly
   - Simulate a rear impact by moving your head backward quickly
   - Test with different intensities of movement

## Drowsiness Detection Testing

### Eye Closure Testing

#### Normal Blinking

- **Regular blinking**: Blink normally at a comfortable rate
- **Expected result**: No alerts should be triggered

#### Extended Eye Closure

- **Brief eye closure**: Close your eyes for 1-2 seconds
- **Extended eye closure**: Close your eyes for 3+ seconds
- **Expected result**: "Danger: Eyes closed too long - possible drowsiness" alert should appear

#### Excessive Blinking

- **Rapid blinking**: Blink rapidly for 10-15 seconds
- **Expected result**: "Warning: Excessive blinking detected - possible fatigue" alert may appear

### Drowsiness Simulation Testing

#### Microsleep Simulation

- **Brief dozing**: Allow your eyes to close briefly as if dozing off
- **Head nodding**: Let your head nod forward slightly
- **Expected result**: Drowsiness alert should be triggered

#### Fatigue Simulation

- **Slow blinking**: Blink slowly and deliberately
- **Heavy eyelids**: Try to keep your eyes half-closed
- **Expected result**: Fatigue warning may be triggered

### Drowsiness Detection Testing Methodology

1. **Controlled Testing**

   - Ensure your face is well-lit and clearly visible
   - Test each eye closure pattern 3-5 times
   - Record the duration of eye closure before alerts
   - Note the EAR (Eye Aspect Ratio) values in the console

2. **Realistic Testing**
   - Simulate gradual drowsiness by slowly closing your eyes
   - Test with different lighting conditions
   - Try different head positions (looking down, looking up)
   - Test with and without glasses/contacts

## General Testing Tips

### Environment Setup

- Ensure good lighting (not too bright or too dim)
- Position the camera at eye level
- Minimize background distractions
- Test in a quiet environment

### Testing Sequence

1. Start with basic movements to establish baseline
2. Progress to more complex movements
3. Test edge cases and boundary conditions
4. Document all test results and observations

### Safety Considerations

- Test in a safe environment
- Avoid extreme movements that could cause discomfort
- Take breaks between testing sessions
- Don't test while driving or operating machinery

## Troubleshooting

### Common Issues

#### Accident Detection

- **False positives**: Adjust the `HIGH_ACCELERATION_THRESHOLD` (currently 0.05)
- **Missed detections**: Decrease the `ACCIDENT_CONFIRMATION_FRAMES` (currently 3)
- **Sensitivity issues**: Modify the confidence threshold (currently 0.7)

#### Drowsiness Detection

- **False positives**: Adjust the `EAR_THRESHOLD` (currently 0.3)
- **Missed detections**: Decrease the `CLOSED_EYES_DURATION` (currently 1500ms)
- **Blink detection issues**: Check the eye landmark detection accuracy

### Debugging Tips

- Watch the console logs for confidence scores and EAR values
- Note the number of confirmation frames needed
- Observe how the system responds to different movement patterns
- Check if the cooldown period is working correctly

### Fine-Tuning Parameters

#### Accident Detection

```javascript
const MOVEMENT_THRESHOLDS = {
  VELOCITY_THRESHOLD: 0.05,
  HIGH_VELOCITY_THRESHOLD: 0.15,
  ACCELERATION_THRESHOLD: 0.02,
  HIGH_ACCELERATION_THRESHOLD: 0.05,
  POSE_THRESHOLD: 45,
  HIGH_POSE_THRESHOLD: 60,
  ACCIDENT_CONFIRMATION_FRAMES: 3,
};
```

#### Drowsiness Detection

```javascript
const EAR_THRESHOLD = 0.3;
const CLOSED_EYES_DURATION = 1500;
const BLINK_COOLDOWN = 300;
const EXCESSIVE_BLINKS_THRESHOLD = 15;
const EXCESSIVE_BLINKS_WINDOW = 60000;
const DROWSINESS_WINDOW = 5000;
```

## Conclusion

This testing guide provides a comprehensive approach to evaluating both the accident detection and drowsiness detection features of the driver monitoring system. By following these testing procedures, you can ensure the system is functioning correctly and make necessary adjustments to improve its accuracy and reliability.

Remember to document your findings and share them with the development team for further refinement of the detection algorithms.
