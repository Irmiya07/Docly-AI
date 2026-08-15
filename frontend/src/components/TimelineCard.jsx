import React from "react";

export default function TimelineCard({ date, title, description, isLast = false, idx = 0 }) {
  const getBadgeColor = (i) => {
    const colors = [
      "bg-indigo-600 text-white shadow-[0_3px_0_0_#4338ca]",
      "bg-purple-600 text-white shadow-[0_3px_0_0_#6b21a8]",
      "bg-pink-650 text-white shadow-[0_3px_0_0_#9d174d]",
      "bg-amber-600 text-white shadow-[0_3px_0_0_#b45309]",
      "bg-emerald-600 text-white shadow-[0_3px_0_0_#047857]"
    ];
    return colors[i % colors.length];
  };

  return (
    <div className="flex gap-6 relative">
      {/* Connector Line */}
      {!isLast && (
        <span className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200" aria-hidden="true"></span>
      )}

      {/* Circle dot and date indicator */}
      <div className="flex flex-col items-center">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-extrabold text-sm shrink-0 z-10 ${getBadgeColor(idx)}`}>
          {idx + 1}
        </div>
      </div>

      {/* Main card box details */}
      <div className="card-3d bg-white p-5 rounded-2xl border border-slate-200/80 shadow-3d-sm hover:shadow-3d-md active:shadow-3d-active flex-1 space-y-3 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="font-extrabold text-slate-800 text-sm md:text-base">{title || "Milestone Event"}</h4>
          {date && (
            <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2.5 py-0.75 rounded-full uppercase shrink-0 w-fit tracking-wider shadow-sm">
              {date}
            </span>
          )}
        </div>
        {description && <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">{description}</p>}
      </div>
    </div>
  );
}

