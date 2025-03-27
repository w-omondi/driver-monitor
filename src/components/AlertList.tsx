"use client";

import { useMonitoring } from "@/contexts/MonitoringContext";
import { useEffect, useState } from "react";

export default function AlertList() {
  const { alerts, clearAlert, clearAllAlerts, clearExpiredAlerts } =
    useMonitoring();
  const [, setUpdateTrigger] = useState(0);

  // Update the component every second to show accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setUpdateTrigger((prev) => prev + 1);
      clearExpiredAlerts();
    }, 1000);

    return () => clearInterval(interval);
  }, [clearExpiredAlerts]);

  const getTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;
    if (remaining <= 0) return "Expired";

    const seconds = Math.ceil(remaining / 1000);
    return `${seconds}s remaining`;
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">No alerts</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Alerts ({alerts.length})</h2>
        <button
          onClick={clearAllAlerts}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Clear All
        </button>
      </div>
      <div className="h-[300px] overflow-y-auto space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-lg flex justify-between items-start ${
              alert.type === "danger"
                ? "bg-red-100 border border-red-200"
                : alert.type === "warning"
                ? "bg-yellow-100 border border-yellow-200"
                : "bg-green-100 border border-green-200"
            }`}
          >
            <div className="flex-grow">
              <p
                className={`${
                  alert.type === "danger"
                    ? "text-red-800"
                    : alert.type === "warning"
                    ? "text-yellow-800"
                    : "text-green-800"
                }`}
              >
                {alert.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {getTimeRemaining(alert.expiresAt)}
              </p>
            </div>
            <button
              onClick={() => clearAlert(alert.id)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
