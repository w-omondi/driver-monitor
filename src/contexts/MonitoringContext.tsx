/**
 * MonitoringContext
 *
 * A React context that manages the global state for the driver monitoring system.
 * It handles monitoring status, alert management, and provides a centralized way
 * to manage alerts across the application.
 *
 * Features:
 * - Real-time monitoring state management
 * - Alert system with automatic expiration
 * - Alert history with size limits
 * - Automatic cleanup of expired alerts
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Represents an alert in the monitoring system
 * @property id - Unique identifier for the alert
 * @property message - Alert message to display
 * @property type - Alert severity level ('warning', 'danger', or 'success')
 * @property timestamp - When the alert was created
 * @property expiresAt - When the alert should be automatically removed
 */
interface Alert {
  id: string;
  message: string;
  type: "warning" | "danger" | "success";
  timestamp: number;
  expiresAt: number;
}

/**
 * Interface defining the shape of the monitoring context
 * Provides methods and state for monitoring control and alert management
 */
interface MonitoringContextType {
  isMonitoring: boolean;
  setIsMonitoring: (value: boolean) => void;
  alerts: Alert[];
  addAlert: (message: string, type: Alert["type"], duration?: number) => void;
  clearAlert: (id: string) => void;
  clearAllAlerts: () => void;
  clearExpiredAlerts: () => void;
}

// Create the context with undefined as initial value
const MonitoringContext = createContext<MonitoringContextType | undefined>(
  undefined
);

// Configuration constants
const MAX_ALERTS = 50; // Maximum number of alerts to keep in history
const DEFAULT_ALERT_DURATION = 10000; // Default alert duration in milliseconds (10 seconds)

/**
 * MonitoringProvider Component
 *
 * Provides monitoring context to its children components.
 * Manages the monitoring state and alert system.
 *
 * @param children - React components that will have access to the monitoring context
 */
export function MonitoringProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // State for monitoring status and alerts
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  /**
   * Adds a new alert to the system
   * Automatically manages alert history and expiration
   *
   * @param message - Alert message to display
   * @param type - Alert severity level
   * @param duration - How long the alert should stay visible (in milliseconds)
   */
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

  /**
   * Removes a specific alert by its ID
   * @param id - ID of the alert to remove
   */
  const clearAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  /**
   * Removes all alerts from the system
   */
  const clearAllAlerts = () => {
    setAlerts([]);
  };

  /**
   * Removes all expired alerts from the system
   * Called automatically every minute
   */
  const clearExpiredAlerts = () => {
    const now = Date.now();
    setAlerts((prev) => prev.filter((alert) => alert.expiresAt > now));
  };

  // Set up automatic cleanup of expired alerts
  useEffect(() => {
    const cleanupInterval = setInterval(clearExpiredAlerts, 60000); // Clean up every minute
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

/**
 * Custom hook to access the monitoring context
 * Must be used within a MonitoringProvider
 *
 * @returns The monitoring context
 * @throws Error if used outside of MonitoringProvider
 */
export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (context === undefined) {
    throw new Error("useMonitoring must be used within a MonitoringProvider");
  }
  return context;
}
