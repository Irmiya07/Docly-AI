import React, { useState } from "react";
import { useWorkspace } from "../hooks/WorkspaceContext.jsx";
import StatCard from "../components/StatCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { files, getStats, removeFile } = useWorkspace();
  const stats = getStats();
  const navigate = useNavigate();

  // State to manage document preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  const formatDate = (isoStr) => {
    if (!isoStr) return "N/A";
    const date = new Date(isoStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileBadgeColor = (mimeType) => {
    if (!mimeType) return "bg-gray-50 text-gray-700 border-gray-100";
    if (mimeType.includes("pdf")) return "bg-red-50 text-red-700 border-red-100";
    if (mimeType.includes("word") || mimeType.includes("officedocument")) return "bg-blue-50 text-blue-700 border-blue-100";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const getFileFormatLabel = (mimeType) => {
    if (!mimeType) return "DOC";
    if (mimeType.includes("pdf")) return "PDF";
    if (mimeType.includes("word") || mimeType.includes("document")) return "DOCX";
    return "TXT";
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Monitor your legal document uploads, clause extraction, risks, and timelines.
        </p>
      </div>

      {/* Grid of Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Documents"
          value={stats.totalDocs}
          badgeValue={`${stats.totalDocs > 0 ? "Active" : "None"}`}
          badgeType="info"
          description="Uploaded contracts in database"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
        />
        <StatCard
          title="Extracted Clauses"
          value={stats.totalClauses}
          badgeValue="AI Analyzed"
          badgeType="success"
          description="Distinct contract terms categorized"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.03 0 1.9.693 2.166 1.638m-7.377 12.481-3.75-3.75m0 0 3.75-3.75m-3.75 3.75h16.5" />
            </svg>
          }
        />
        <StatCard
          title="Identified Risks"
          value={stats.totalRisks}
          badgeValue={stats.totalRisks > 0 ? "Review Needed" : "Secured"}
          badgeType={stats.totalRisks > 0 ? "warning" : "success"}
          description="High & Medium severity risks"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
        <StatCard
          title="Timeline Events"
          value={stats.totalEvents}
          badgeValue="Milestones"
          badgeType="info"
          description="Important expiration & renewal dates"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        />
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Uploaded Documents</h2>
            <p className="text-sm text-gray-400 mt-0.5">Files currently processed. Click any row to preview contents summary.</p>
          </div>
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-50 px-3.5 py-2 rounded-xl transition-colors border border-blue-100"
          >
            Upload New
          </Link>
        </div>

        {files.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No documents yet"
              description="Upload your legal contracts or agreements to begin utilizing automatic AI audits, risk evaluation, and timeline sheets."
              actionLabel="Upload Files"
              onAction={() => navigate("/upload")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Document Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">File Size</th>
                  <th className="px-6 py-4">Upload Time</th>
                  <th className="px-6 py-4">Analysis Results</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {files.map((file) => (
                  <tr
                    key={file.name}
                    onClick={() => setPreviewDoc(file)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-gray-900 truncate max-w-xs md:max-w-md">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${getFileBadgeColor(file.type)}`}>
                        {getFileFormatLabel(file.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{file.size}</td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(file.uploadedAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <span className="text-xs bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {file.clauses} Clauses
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${file.risks > 0 ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
                          {file.risks} Risks
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => removeFile(file.name)}
                        className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete from workspace"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Blur backdrop */}
          <div
            onClick={() => setPreviewDoc(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          ></div>

          {/* Modal Panel */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 z-10 border border-gray-150 animate-scale-up space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${getFileBadgeColor(previewDoc.type)}`}>
                  {getFileFormatLabel(previewDoc.type)} File
                </span>
                <h3 className="font-extrabold text-gray-900 text-lg md:text-xl break-all">
                  {previewDoc.name}
                </h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-gray-900 p-1 bg-gray-50 border border-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Document Abstract details */}
            <div className="space-y-4 text-xs md:text-sm">
              <div className="bg-blue-50/20 border border-blue-100/50 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Contract Abstract Summary</span>
                <p className="text-gray-700 leading-relaxed leading-medium select-text">
                  This document contains key corporate terms. Automatic analysis has successfully cataloged a total of {previewDoc.clauses} clause categories, with {previewDoc.risks} flagged compliance warnings requiring remediation. Action dates are chronologically indexed.
                </p>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-400">File size</span>
                  <p className="font-bold text-gray-900 mt-0.5">{previewDoc.size}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-400">Processed</span>
                  <p className="font-bold text-gray-900 mt-0.5">{formatDate(previewDoc.uploadedAt)}</p>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  navigate("/report");
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-3 rounded-xl text-white text-xs shadow-sm transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                Compliance Review
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  navigate("/timeline");
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 hover:text-white font-bold py-3 rounded-xl text-slate-200 text-xs transition-all text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                Track Deadlines
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
