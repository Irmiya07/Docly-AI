import React from "react";

export default function StatCard({ title, value, icon, description, badgeValue, badgeType = "info" }) {
  const badgeColors = {
    success: "bg-green-50 text-green-700 border-green-100",
    warning: "bg-yellow-50 text-yellow-700 border-yellow-100",
    danger: "bg-red-50 text-red-700 border-red-100",
    info: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex items-start justify-between hover:shadow-md transition-shadow duration-300">
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900 tracking-tight">{value}</span>
          {badgeValue && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeColors[badgeType]}`}>
              {badgeValue}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      {icon && (
        <div className="h-12 w-12 rounded-xl bg-blue-50/50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      )}
    </div>
  );
}
