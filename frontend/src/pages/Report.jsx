import React, { useState, useRef } from "react";
import { generateReport } from "../api/reportApi";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import StatCard from "../components/StatCard";
import RiskCard from "../components/RiskCard";
import TimelineCard from "../components/TimelineCard";
import { useWorkspace } from "../hooks/WorkspaceContext";

export default function Report() {
  const { files: workspaceFiles } = useWorkspace();
  const [file, setFile] = useState(null);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  
  // Drawer / Modal Preview State
  const [selectedClauseDetail, setSelectedClauseDetail] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      await processReport(selected);
    }
  };

  const processReport = async (selectedFile) => {
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);

    try {
      const data = await generateReport(selectedFile);
      setReport(data);
      setActiveTab("summary");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Could not generate contract compliance report. Run backend server first."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkspaceDoc = async (docName) => {
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);
    setFile({ name: docName });

    try {
      const data = await generateReport(docName);
      setReport(data);
      setActiveTab("summary");
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || `Could not generate report for ${docName}.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current.click();
  };

  const clearReport = () => {
    setFile(null);
    setReport(null);
    setErrorMessage(null);
    setSelectedClauseDetail(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Contract Audit Report</h1>
          <p className="text-gray-500 mt-1">
            Perform exhaustive legal reviews on a single contract including summary, items list, and risk mitigations.
          </p>
        </div>
        {report && (
          <button
            onClick={clearReport}
            className="text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-150 px-3.5 py-2 rounded-xl transition-colors shrink-0"
          >
            Clear Analysis
          </button>
        )}
      </div>

      {!file && !report && !isLoading && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* File Upload Zone */}
          <div
            onClick={triggerUploadClick}
            className="border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50/20 cursor-pointer transition-all duration-300"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx"
            />
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Select Contract Document</h3>
              <p className="text-sm text-gray-400 mt-1 mb-5">Upload a PDF or DOCX file to analyze clauses & risks</p>
              <span className="text-xs bg-blue-600 hover:bg-blue-500 shadow-sm font-semibold rounded-xl text-white px-4 py-2.5 transition-colors">
                Browse System Files
              </span>
            </div>
          </div>

          {/* Workspace Suggestions Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-px bg-gray-200 flex-1"></span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Select from Workspace Documents</span>
              <span className="h-px bg-gray-200 flex-1"></span>
            </div>

            {workspaceFiles?.length === 0 ? (
              <div className="text-center p-8 bg-white border border-gray-150 rounded-2xl text-xs text-gray-400">
                No active workspace documents. Please upload documents in the Sidebar first, then select them here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {workspaceFiles.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => loadWorkspaceDoc(doc.name)}
                    className="bg-white p-5 rounded-2xl border border-gray-150 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                        Workspace Doc
                      </span>
                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm break-all pt-1">
                        {doc.name}
                      </h4>
                      <p className="text-xs text-gray-550 leading-relaxed">
                        Size: {doc.size || 'Unknown'}. Generate a compliance audit report on this workspace file.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                      Audit Document
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-3 w-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner label="Auditing agreement, identifying clauses & risks..." />}

      {errorMessage && (
        <ErrorState
          title="Analysis Failed"
          message={errorMessage}
          onRetry={() => file && processReport(file)}
          retryLabel="Retry Analysis"
        />
      )}

      {!isLoading && !errorMessage && report && (
        <div className="space-y-8 animate-fade-in">
          {/* File Indicator */}
          <div className="flex items-center gap-2 text-xs bg-blue-50/50 border border-blue-100/50 py-2.5 px-4 rounded-xl max-w-fit font-semibold text-blue-800">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
            </svg>
            <span>Analyzing: {file?.name || "Preloaded Template"}</span>
          </div>

          {/* Top Aggregates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              title="Clauses cataloged"
              value={report.summary?.total_clauses || report.clauses?.length || 0}
              description="Click clauses below for previews"
              badgeValue="Report term"
              badgeType="info"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
                </svg>
              }
            />
            <StatCard
              title="Warning Flags"
              value={report.summary?.total_risks || report.risks?.length || 0}
              description="Compliance issues spotted"
              badgeValue="AI Flagged"
              badgeType="warning"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374" />
                </svg>
              }
            />
            <StatCard
              title="Key Deadlines"
              value={report.summary?.timeline_events || report.timeline?.length || 0}
              description="Chronological triggers"
              badgeValue="Commitments"
              badgeType="success"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0" />
                </svg>
              }
            />
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-150 flex gap-6 text-sm font-semibold">
            {["summary", "clauses", "risks", "timeline"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 border-b-2 capitalize transition-colors ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab === "risks" ? "Risks Audit" : tab === "timeline" ? "Deadlines & Timeline" : tab}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          <div className="space-y-6">
            
            {/* Tab: Summary */}
            {activeTab === "summary" && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Executive Analysis Summary</h3>
                <p className="text-gray-650 text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {report.executive_summary || "No summary was generated for this contract. Select the Clauses or Risks tab to audit contents."}
                </p>
              </div>
            )}

            {/* Tab: Clauses */}
            {activeTab === "clauses" && (
              <div className="bg-white border border-gray-100 rounded-3xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h3 className="font-bold text-gray-900 text-lg">Classified Agreement Clauses</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Click any row clause to preview full extraction details and insights drawer.</p>
                </div>
                {!report.clauses || report.clauses.length === 0 ? (
                  <div className="p-12 text-center text-sm text-gray-400">No clauses identified.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-50">
                          <th className="px-6 py-4 w-40">Type</th>
                          <th className="px-6 py-4 w-28">Section No.</th>
                          <th className="px-6 py-4">Analyzed Excerpt (Click row to detail preview)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                        {report.clauses.map((c, i) => (
                          <tr
                            key={i}
                            onClick={() => setSelectedClauseDetail(c)}
                            className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 font-bold text-gray-950 capitalize">{c.type || "Other"}</td>
                            <td className="px-6 py-4 font-semibold text-gray-500">{c.section || "N/A"}</td>
                            <td className="px-6 py-4 text-gray-600 leading-relaxed truncate max-w-xl">{c.text || c.content || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Risks */}
            {activeTab === "risks" && (
              <div className="space-y-4 max-w-4xl">
                {!report.risks || report.risks.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-gray-105 text-sm text-gray-400 hover:border-slate-200">
                    <span className="text-emerald-700 font-bold block mb-1">✓ No Legal Risks Identified</span>
                    This document appears to conform standard safety compliance terms.
                  </div>
                ) : (
                  report.risks.map((risk, i) => (
                    <RiskCard
                      key={i}
                      riskLevel={risk.risk_level || risk.level || "low"}
                      clauseText={risk.clause_text || risk.text || ""}
                      description={risk.description || ""}
                      remediation={risk.remediation || risk.remedy || ""}
                    />
                  ))
                )}
              </div>
            )}

            {/* Tab: Timeline */}
            {activeTab === "timeline" && (
              <div className="space-y-8 max-w-3xl pr-4 py-4">
                {!report.timeline || report.timeline.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-sm text-gray-450">
                    No timeline dates extracted.
                  </div>
                ) : (
                  <div className="ml-2 space-y-6">
                    {report.timeline.map((evt, i) => (
                      <TimelineCard
                        key={i}
                        idx={i}
                        date={evt.date || ""}
                        title={evt.event || ""}
                        description={evt.description || ""}
                        isLast={i === report.timeline.length - 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Clause Detail Slide-out Drawer */}
      {selectedClauseDetail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedClauseDetail(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto z-10 flex flex-col justify-between animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                    Clause Details
                  </span>
                  <h3 className="font-extrabold text-gray-900 text-lg capitalize mt-1.5">
                    {selectedClauseDetail.type} Clause
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedClauseDetail(null)}
                  className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-xs md:text-sm">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Document Section Reference</span>
                  <p className="text-gray-900 font-bold mt-0.5">Section {selectedClauseDetail.section || "N/A"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Extracted Text Content</span>
                  <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-xl mt-1 leading-relaxed italic select-text">
                    "{selectedClauseDetail.text || selectedClauseDetail.content}"
                  </p>
                </div>

                <div className="bg-blue-50/30 border border-blue-100 p-4 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Legal Analysis Recommendation</span>
                  <p className="text-gray-800 leading-relaxed">
                    Verify that the scope of this {selectedClauseDetail.type.toLowerCase()} clause conforms with your standard operating procedures and liability frameworks. Look for exclusions or capping limits.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-8">
              <button
                onClick={() => setSelectedClauseDetail(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                Close Drawer Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
