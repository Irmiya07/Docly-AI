import React from "react";

export default function LoadingSpinner({ label = "Loading analysis..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 space-y-4">
      <div className="relative flex items-center justify-center">
        {/* Outer Ring */}
        <div className="h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
        {/* Pulsing inner dot */}
        <div className="absolute h-3 w-3 rounded-full bg-blue-600 animate-ping"></div>
      </div>
      {label && <p className="text-sm font-medium text-gray-500 animate-pulse">{label}</p>}
    </div>
  );
}
