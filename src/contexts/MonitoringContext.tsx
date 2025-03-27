"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface Alert {
  id: string;
  message: string;
  type: "warning" | "danger" | "success";
  timestamp: number;
  expiresAt: number;
}

interface MonitoringContextType {
  isMonitoring: boolean;
  setIsMonitoring: (value: boolean) => void;
  alerts: Alert[];
  addAlert: (message: string, type: Alert["type"], duration?: number) => void;
  clearAlert: (id: string) => void;
  clearAllAlerts: () => void;
  clearExpiredAlerts: () => void;
}

const MonitoringContext = createContext<MonitoringContextType | undefined>(
  undefined
);

const MAX_ALERTS = 50;
const DEFAULT_ALERT_DURATION = 10000; // 10 seconds

export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (
    message: string,
    type: Alert["type"],
    duration = DEFAULT_ALERT_DURATION
  ) => {
    const now = Date.now();
    const newAlert: Alert = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: now,
      expiresAt: now + duration,
    };

    setAlerts((prev) => {
      // Remove expired alerts
      const activeAlerts = prev.filter((alert) => alert.expiresAt > now);

      // Add new alert
      const updatedAlerts = [...activeAlerts, newAlert];

      // Keep only the most recent MAX_ALERTS
      return updatedAlerts.slice(-MAX_ALERTS);
    });
  };

  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const clearExpiredAlerts = () => {
    const now = Date.now();
    setAlerts((prev) => prev.filter((alert) => alert.expiresAt > now));
  };

  // Auto-cleanup expired alerts every minute
  useEffect(() => {
    const cleanupInterval = setInterval(clearExpiredAlerts, 60000);
    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <MonitoringContext.Provider
      value={{
        isMonitoring,
        setIsMonitoring,
        alerts,
        addAlert,
        clearAlert,
        clearAllAlerts,
        clearExpiredAlerts,
      }}
    >
      {children}
    </MonitoringContext.Provider>
  );
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
}
