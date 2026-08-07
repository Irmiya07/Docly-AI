import React from "react";

export default function RiskCard({ riskLevel, clauseText, description, remediation }) {
  const levelStyles = {
    high: {
      bg: "bg-red-50/50",
      border: "border-red-150",
      text: "text-red-900",
      badge: "bg-red-100 text-red-800 border-red-200",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-red-650">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
        </svg>
      )
    },
    medium: {
      bg: "bg-amber-50/50",
      border: "border-amber-150",
      text: "text-amber-900",
      badge: "bg-amber-100 text-amber-800 border-amber-250",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-amber-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      )
    },
    low: {
      bg: "bg-blue-50/40",
      border: "border-blue-100",
      text: "text-blue-900",
      badge: "bg-blue-105 text-blue-800 border-blue-200",
      icon: (
        <svg xmlns="http://www.w3.org/2500/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-blue-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      )
    }
  };

  const level = riskLevel ? riskLevel.toLowerCase() : "low";
  const style = levelStyles[level] || levelStyles.low;

  return (
    <div className={`p-6 rounded-2xl border ${style.border} ${style.bg} space-y-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {style.icon}
          <span className="font-bold text-sm text-gray-900 capitalize">{level} Risk Identified</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${style.badge} uppercase`}>
          {level} Severity
        </span>
      </div>

      <div className="space-y-3">
        {description && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Description</span>
            <p className="text-gray-700 text-xs md:text-sm mt-0.5">{description}</p>
          </div>
        )}

        {clauseText && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Risk Clause Excerpt</span>
            <p className="text-gray-500 text-xs italic bg-white/40 border border-gray-100 p-3 rounded-xl mt-1 leading-relaxed">
              "{clauseText}"
            </p>
          </div>
        )}

        {remediation && (
          <div className="bg-white/60 p-4 rounded-xl border border-gray-100 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
              </svg>
              AI Remedy Recommendation
            </span>
            <p className="text-gray-800 text-xs leading-relaxed">{remediation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
