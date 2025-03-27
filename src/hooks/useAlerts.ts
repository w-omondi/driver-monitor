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
    const ALERT_COOLDOWN = 30000; // 30 seconds cooldown between alerts
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
        if (now - lastAlertTimeRef.current < ALERT_COOLDOWN) {
            console.log("Alert suppressed due to cooldown period");
            return;
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