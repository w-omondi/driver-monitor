import React from "react";

interface AlertProps {
  message: string;
  type: "danger" | "warning" | null;
  isActive: boolean;
}

export const Alert: React.FC<AlertProps> = ({ message, type, isActive }) => {
  if (!message) return null;

  return (
    <>
      <div
        className={`absolute top-1/2 md:top-1/4 left-1/2 transform -translate-x-1/2 
        px-6 py-3 rounded-lg text-white text-xl font-bold
        ${
          type === "danger"
            ? "bg-red-500/80 animate-bounce"
            : "bg-yellow-500/80 animate-pulse"
        } backdrop-blur-sm`}
      >
        <div className="flex items-center gap-2">
          {type === "danger" ? "⚠️" : "⚡"}
          {message}
        </div>
      </div>

      {isActive && (
        <div
          className={`absolute inset-0 animate-pulse border-8 
          ${type === "danger" ? "border-red-500" : "border-yellow-500"}`}
        />
      )}
    </>
  );
};
