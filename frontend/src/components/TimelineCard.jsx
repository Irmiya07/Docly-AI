import React from "react";

export default function TimelineCard({ date, title, description, isLast = false, idx = 0 }) {
  const getBadgeColor = (i) => {
    const colors = [
      "bg-blue-500 text-white shadow-blue-100",
      "bg-purple-500 text-white shadow-purple-100",
      "bg-pink-500 text-white shadow-pink-100",
      "bg-amber-500 text-white shadow-amber-100",
      "bg-emerald-500 text-white shadow-emerald-100"
    ];
    return colors[i % colors.length];
  };

  return (
    <div className="flex gap-6 relative">
      {/* Connector Line */}
      {!isLast && (
        <span className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gray-150" aria-hidden="true"></span>
      )}

      {/* Circle dot and date indicator */}
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs shadow-md shrink-0 z-10 ${getBadgeColor(idx)}`}>
          {idx + 1}
        </div>
      </div>

      {/* Main card box details */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex-1 space-y-2 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h4 className="font-bold text-gray-990 text-sm md:text-base">{title || "Milestone Event"}</h4>
          {date && (
            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full uppercase shrink-0 w-fit">
              {date}
            </span>
          )}
        </div>
        {description && <p className="text-gray-500 text-xs md:text-sm leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}
