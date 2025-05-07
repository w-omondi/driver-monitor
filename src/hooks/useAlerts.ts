/**
 * useAlerts Hook
 * 
 * A custom hook that manages the alert system for the driver monitoring application.
 * Handles alert display, sound notifications, and external alert distribution.
 * Implements cooldown periods to prevent alert spam and manages different types
 * of alerts (danger and warning) with distinct behaviors.
 * 
 * @param addAlert - Callback function to add alerts to the global alert list
 * @returns {Object} Alert management functions and state
 */

import { useEffect, useRef, useState } from "react";

/**
 * Interface for alert data structure
 * @property message - The alert message to display
 * @property type - The severity level of the alert ('danger' or 'warning')
 */
interface Alert {
    message: string;
    type: "danger" | "warning" | null;
}

export const useAlerts = (addAlert: (message: string, type: "danger" | "warning") => void) => {
    // Alert state management
    const [currentAlert, setCurrentAlert] = useState<Alert>({ message: "", type: null });
    const [isAlertActive, setIsAlertActive] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    // Timestamps for cooldown management
    const lastAlertTimeRef = useRef(Date.now());
    const lastDangerAlertTimeRef = useRef(Date.now());
    const lastWarningAlertTimeRef = useRef(Date.now());

    // Cooldown periods for different alert types
    const DANGER_ALERT_COOLDOWN = 5000;  // 5 seconds for danger alerts
    const WARNING_ALERT_COOLDOWN = 10000; // 10 seconds for warning alerts

    // Audio elements for different alert types
    const drowsinessAlarmRef = useRef<HTMLAudioElement | null>(null);
    const warningBeepRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio elements
    useEffect(() => {
        // Create audio elements
        drowsinessAlarmRef.current = new Audio("/sounds/alarm.wav");
        warningBeepRef.current = new Audio("/sounds/warning.wav");

        // Configure audio elements
        if (drowsinessAlarmRef.current) {
            drowsinessAlarmRef.current.loop = true; // Danger alarm loops until stopped
        }
        if (warningBeepRef.current) {
            warningBeepRef.current.loop = false; // Warning beep plays once
        }

        // Cleanup audio elements on unmount
        return () => {
            if (drowsinessAlarmRef.current) {
                drowsinessAlarmRef.current.pause();
            }
            if (warningBeepRef.current) {
                warningBeepRef.current.pause();
            }
        };
    }, []);

    /**
     * Handles alert creation and distribution
     * Implements cooldown periods, plays appropriate sounds, and sends external alerts
     * 
     * @param message - The alert message
     * @param type - The type of alert ('danger' or 'warning')
     */
    const handleAlert = async (message: string, type: "danger" | "warning") => {
        const now = Date.now();
        const lastAlertTime = type === "danger" ? lastDangerAlertTimeRef.current : lastWarningAlertTimeRef.current;
        const cooldown = type === "danger" ? DANGER_ALERT_COOLDOWN : WARNING_ALERT_COOLDOWN;

        // Check cooldown period
        if (now - lastAlertTime < cooldown) {
            console.log(`Alert suppressed due to cooldown period (${type})`);
            return;
        }

        // Update last alert timestamps
        if (type === "danger") {
            lastDangerAlertTimeRef.current = now;
        } else {
            lastWarningAlertTimeRef.current = now;
        }
        lastAlertTimeRef.current = now;

        // Set current alert state
        setCurrentAlert({ message, type });
        setIsAlertActive(true);

        // Clear alert after 5 seconds
        setTimeout(() => {
            setCurrentAlert({ message: "", type: null });
            setIsAlertActive(false);
        }, 5000);

        // Play appropriate sound based on alert type
        if (type === "danger") {
            if (drowsinessAlarmRef.current && isSoundEnabled) {
                try {
                    await drowsinessAlarmRef.current.play();
                    // Stop alarm after 5 seconds
                    setTimeout(() => {
                        if (drowsinessAlarmRef.current) {
                            drowsinessAlarmRef.current.pause();
                            drowsinessAlarmRef.current.currentTime = 0;
                        }
                    }, 5000);
                } catch (error) {
                    console.error("Failed to play alarm sound:", error);
                }
            }
        } else {
            if (warningBeepRef.current && isSoundEnabled) {
                try {
                    warningBeepRef.current.currentTime = 0;
                    await warningBeepRef.current.play();
                } catch (error) {
                    console.error("Failed to play warning sound:", error);
                }
            }
        }

        // Send external alerts via API
        try {
            await fetch("/api/send-alert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    channels: ["sms", "whatsapp"],
                    recipients: [],
                }),
            });
        } catch (error) {
            console.error("Failed to send alert:", error);
        }

        // Add alert to global alert list
        addAlert(message, type);
    };

    /**
     * Toggles sound notifications on/off
     * Updates sound state and mutes/unmutes audio elements
     */
    const toggleSound = () => {
        setIsSoundEnabled(!isSoundEnabled);
        if (!isSoundEnabled) {
            if (drowsinessAlarmRef.current) {
                drowsinessAlarmRef.current.muted = false;
            }
            if (warningBeepRef.current) {
                warningBeepRef.current.muted = false;
            }
        } else {
            if (drowsinessAlarmRef.current) {
                drowsinessAlarmRef.current.muted = true;
            }
            if (warningBeepRef.current) {
                warningBeepRef.current.muted = true;
            }
        }
    };

    return {
        currentAlert,
        isAlertActive,
        isSoundEnabled,
        handleAlert,
        toggleSound,
    };
}; 