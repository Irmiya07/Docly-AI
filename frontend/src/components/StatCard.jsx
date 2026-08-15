import React from "react";

export default function StatCard({ title, value, icon, description, badgeValue, badgeType = "info" }) {
  const badgeColors = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    info: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  return (
    <div className="card-3d bg-white p-6 rounded-2xl border border-slate-200/80 shadow-3d-sm hover:shadow-3d-md active:shadow-3d-active flex items-start justify-between transition-all duration-300">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{value}</span>
          {badgeValue && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm uppercase ${badgeColors[badgeType]}`}>
              {badgeValue}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-slate-500 font-medium">{description}</p>}
      </div>
      {icon && (
        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-indigo-600 border border-slate-100 shadow-inner shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}

