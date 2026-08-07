import React from "react";

export default function ComparisonTable({ modified = [], added = [], removed = [] }) {
  const getBadgeStyle = (status) => {
    if (status === "modified") return "bg-amber-50 text-amber-700 border-amber-100";
    if (status === "added") return "bg-green-50 text-green-700 border-green-100";
    return "bg-red-50 text-red-700 border-red-100";
  };

  const allItems = [
    ...added.map((c) => ({ title: c.title || c.type, status: "added", detail: c.text || c.content, impact: "New obligation introduced." })),
    ...modified.map((c) => ({ title: c.title || c.type, status: "modified", detail: c.diff || c.text, impact: c.impact || "Governing terms altered." })),
    ...removed.map((c) => ({ title: c.title || c.type, status: "removed", detail: c.text || c.content, impact: "Pre-existing clause omitted." }))
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-950 text-lg">Detailed Comparison Audits</h3>
          <p className="text-xs text-gray-400 mt-0.5">Categorized legal modifications side-by-side.</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
            {added.length} Added
          </span>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
            {modified.length} Modified
          </span>
          <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
            {removed.length} Omitted
          </span>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="p-12 text-center text-sm text-gray-450">No clauses added, modified, or omitted detected.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4 w-48">Clause Target</th>
                <th className="px-6 py-4 w-28">Status</th>
                <th className="px-6 py-4">Detailed Change</th>
                <th className="px-6 py-4 w-64">Legal Impact Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
              {allItems.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/20 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 capitalize">{item.title}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${getBadgeStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-sans leading-relaxed whitespace-pre-wrap">{item.detail}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium leading-relaxed">{item.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
