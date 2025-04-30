import { useEffect, useRef, useState } from "react";

interface Alert {
    message: string;
    type: "danger" | "warning" | null;
}

export const useAlerts = (addAlert: (message: string, type: "danger" | "warning") => void) => {
    const [currentAlert, setCurrentAlert] = useState<Alert>({ message: "", type: null });
    const [isAlertActive, setIsAlertActive] = useState(false);
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);
    const lastAlertTimeRef = useRef(Date.now());
    const lastDangerAlertTimeRef = useRef(Date.now());
    const lastWarningAlertTimeRef = useRef(Date.now());

    // Different cooldown periods for different alert types
    const DANGER_ALERT_COOLDOWN = 5000; // 5 seconds for danger alerts
    const WARNING_ALERT_COOLDOWN = 10000; // 10 seconds for warning alerts
    const drowsinessAlarmRef = useRef<HTMLAudioElement | null>(null);
    const warningBeepRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Create audio elements
        drowsinessAlarmRef.current = new Audio("/sounds/alarm.wav");
        warningBeepRef.current = new Audio("/sounds/warning.wav");

        // Configure audio elements
        if (drowsinessAlarmRef.current) {
            drowsinessAlarmRef.current.loop = true;
        }
        if (warningBeepRef.current) {
            warningBeepRef.current.loop = false;
        }

        // Cleanup
        return () => {
            if (drowsinessAlarmRef.current) {
                drowsinessAlarmRef.current.pause();
            }
            if (warningBeepRef.current) {
                warningBeepRef.current.pause();
            }
        };
    }, []);

    const handleAlert = async (message: string, type: "danger" | "warning") => {
        const now = Date.now();
        const lastAlertTime = type === "danger" ? lastDangerAlertTimeRef.current : lastWarningAlertTimeRef.current;
        const cooldown = type === "danger" ? DANGER_ALERT_COOLDOWN : WARNING_ALERT_COOLDOWN;

        if (now - lastAlertTime < cooldown) {
            console.log(`Alert suppressed due to cooldown period (${type})`);
            return;
        }

        // Update the appropriate last alert time
        if (type === "danger") {
            lastDangerAlertTimeRef.current = now;
        } else {
            lastWarningAlertTimeRef.current = now;
        }

        lastAlertTimeRef.current = now;
        setCurrentAlert({ message, type });
        setIsAlertActive(true);

        // Clear alert message after 5 seconds
        setTimeout(() => {
            setCurrentAlert({ message: "", type: null });
            setIsAlertActive(false);
        }, 5000);

        // Sound alert
        if (type === "danger") {
            if (drowsinessAlarmRef.current && isSoundEnabled) {
                try {
                    await drowsinessAlarmRef.current.play();
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

        // External alerts
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

        addAlert(message, type);
    };

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