/**
 * Alert Component
 *
 * A visual alert component that displays warning or danger messages to the driver.
 * Features animated notifications with different styles based on alert type and
 * includes a pulsing border effect when active.
 */

import React from "react";

/**
 * Props interface for the Alert component
 * @property message - The alert message to display
 * @property type - The type of alert ('danger' or 'warning')
 * @property isActive - Whether the alert is currently active
 */
interface AlertProps {
  message: string;
  type: "danger" | "warning" | null;
  isActive: boolean;
}

export const Alert: React.FC<AlertProps> = ({ message, type, isActive }) => {
  // Don't render anything if there's no message
  if (!message) return null;

  return (
    <>
      {/* Main alert message container */}
      <div
        className={`absolute top-1/2 md:top-1/4 left-1/2 transform -translate-x-1/2 
        px-6 py-3 rounded-lg text-white text-xl font-bold
        ${
          type === "danger"
            ? "bg-red-500/80 animate-bounce" // Danger alerts bounce
            : "bg-yellow-500/80 animate-pulse" // Warning alerts pulse
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2">
          {/* Alert icon based on type */}
          {type === "danger" ? "⚠️" : "⚡"}
          {message}
        </div>
      </div>

      {/* Pulsing border effect when alert is active */}
      {isActive && (
        <div
          className={`absolute inset-0 animate-pulse border-8 
          ${type === "danger" ? "border-red-500" : "border-yellow-500"}`}
        />
      )}
    </>
  );
};
