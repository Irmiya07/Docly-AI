import { useState, useRef, useEffect } from "react";
import { generateReport } from "../api/reportApi";
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
  
  // Custom cancellation states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [abortController, setAbortController] = useState(null);
  const timerIntervalRef = useRef(null);

  // Drawer / Modal Preview State
  const [selectedClauseDetail, setSelectedClauseDetail] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    setTimerSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleCancelAudit = () => {
    if (abortController) {
      abortController.abort();
    }
    stopTimer();
    setIsLoading(false);
    setFile(null);
    setAbortController(null);
  };

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
    startTimer();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const data = await generateReport(selectedFile, { signal: controller.signal });
      setReport(data);
      setActiveTab("summary");
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log("Audit cancelled by user.");
        return;
      }
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Could not generate contract compliance report. Run backend server first."
      );
    } finally {
      setIsLoading(false);
      stopTimer();
      setAbortController(null);
    }
  };

  const loadWorkspaceDoc = async (docName) => {
    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);
    setFile({ name: docName });
    startTimer();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const data = await generateReport(docName, { signal: controller.signal });
      setReport(data);
      setActiveTab("summary");
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log("Workspace document audit cancelled.");
        return;
      }
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || `Could not generate report for ${docName}.`
      );
    } finally {
      setIsLoading(false);
      stopTimer();
      setAbortController(null);
    }
  };

  const triggerUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const clearReport = () => {
    setFile(null);
    setReport(null);
    setErrorMessage(null);
    setSelectedClauseDetail(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8 animate-slide-up relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Contract Audit Report</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Perform exhaustive legal reviews on a single contract including summary, items list, and risk mitigations.
          </p>
        </div>
        {report && (
          <button
            onClick={clearReport}
            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250/80 px-4 py-2.5 rounded-xl transition-all duration-150 btn-3d shadow-3d-sm active:shadow-3d-active shrink-0"
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
            className="card-3d border border-slate-300 border-dashed rounded-3xl p-12 text-center bg-white hover:border-indigo-500 hover:shadow-3d-lg cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-md"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff"
            />
            <div className="flex flex-col items-center relative z-10">
              <div className="h-16 w-16 mb-6 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-650 border border-indigo-105 shadow-inner transition-transform group-hover:scale-110 duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-800">Select Contract Document</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1.5 mb-6">Upload legal document file to analyze clauses & risks (Max 15MB)</p>
              <span className="text-xs bg-indigo-600 hover:bg-indigo-550 shadow-3d-sm active:shadow-3d-active font-extrabold rounded-xl text-white px-5 py-2.75 transition-all btn-3d">
                Browse System Files
              </span>
            </div>
          </div>

          {/* Workspace Suggestions Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-px bg-slate-200 flex-1"></span>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-2">Select from Workspace Documents</span>
              <span className="h-px bg-slate-200 flex-1"></span>
            </div>

            {workspaceFiles?.length === 0 ? (
              <div className="text-center p-8 bg-white border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-400 shadow-inner">
                No active workspace documents. Please upload documents in the Sidebar first, then select them here.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {workspaceFiles.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => loadWorkspaceDoc(doc.name)}
                    className="card-3d bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-500 shadow-3d-sm hover:shadow-3d-md cursor-pointer transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-105 px-2 py-0.5 rounded-full uppercase">
                        Workspace Doc
                      </span>
                      <h4 className="font-extrabold text-slate-700 group-hover:text-indigo-600 transition-colors text-sm break-all pt-1">
                        {doc.name}
                      </h4>
                      <p className="text-xs font-medium text-slate-450 leading-relaxed">
                        Size: {doc.size || 'Unknown'}. Generate a compliance audit report on this workspace file.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mt-4 group-hover:translate-x-1 duration-150 transition-transform">
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

      {/* Enhanced Multi-line Skeleton Loader with Cancellation */}
      {isLoading && (
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-3d-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="font-extrabold text-slate-700 text-sm md:text-base">Auditing agreement, identifying clauses & risks...</span>
              </div>
              <p className="text-xs font-semibold text-slate-400">Running advanced extraction model. Average time is 10-30 seconds.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-slate-250 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 font-mono shadow-inner">
                Elapsed: {timerSeconds}s
              </div>
              <button
                onClick={handleCancelAudit}
                className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250/80 px-4 py-2.5 rounded-xl transition-all duration-150 btn-3d shadow-3d-sm active:shadow-3d-active"
              >
                Cancel Audit
              </button>
            </div>
          </div>

          <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-3d-sm animate-pulse">
            <div className="h-6 w-1/4 bg-slate-250 rounded-lg"></div>
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-slate-200 rounded-lg w-full"></div>
              <div className="h-4 bg-slate-200 rounded-lg w-11/12"></div>
              <div className="h-4 bg-slate-200 rounded-lg w-10/12"></div>
              <div className="h-4 bg-slate-200 rounded-lg w-5/6"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="h-24 bg-slate-100 rounded-2xl border border-slate-200/50"></div>
              <div className="h-24 bg-slate-100 rounded-2xl border border-slate-200/50"></div>
              <div className="h-24 bg-slate-100 rounded-2xl border border-slate-200/50"></div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <ErrorState
          title="Analysis Failed"
          message={errorMessage}
          onRetry={() => file && processReport(file)}
          retryLabel="Retry Analysis"
        />
      )}

      {!isLoading && !errorMessage && report && (
        <div className="space-y-8 animate-slide-up">
          {/* File Indicator */}
          <div className="flex items-center gap-2 text-xs bg-indigo-50/50 border border-indigo-100/50 py-2.5 px-4 rounded-xl max-w-fit font-bold text-indigo-805 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
            </svg>
            <span className="truncate">Analyzing: {file?.name || "Preloaded Template"}</span>
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

          {/* Navigation Tabs - Swipable/Horizontally scrollable on mobile */}
          <div className="border-b border-slate-200 flex gap-6 text-xs md:text-sm font-bold overflow-x-auto whitespace-nowrap hide-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
            {["summary", "clauses", "risks", "timeline"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 border-b-2 capitalize transition-all duration-150 flex-shrink-0 cursor-pointer ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
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
              <div className="space-y-6">
                {/* 3D hover metrics grid card */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Clauses metric card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-indigo-500 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Clauses Spot</span>
                      <h4 className="font-extrabold text-slate-800 text-2xl mt-1">
                        {report.summary?.total_clauses ?? report.clauses?.length ?? "Not available"}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 mt-2 font-medium">Identified clauses</span>
                  </div>

                  {/* Risks metric card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-red-500 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="text-[10px] font-bold text-red-505 uppercase tracking-wider block">Risk Factors</span>
                      <h4 className="font-extrabold text-slate-800 text-2xl mt-1">
                        {report.summary?.total_risks ?? report.risks?.length ?? "Not available"}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 mt-2 font-medium">Audit flags</span>
                  </div>

                  {/* Timeline metric card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-500 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-505 uppercase tracking-wider block">Timeline Points</span>
                      <h4 className="font-extrabold text-slate-800 text-2xl mt-1">
                        {report.summary?.timeline_events ?? report.timeline?.length ?? "Not available"}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 mt-2 font-medium">Agreement events</span>
                  </div>

                  {/* calculated overall risk level card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-amber-500 transition-all duration-300 flex flex-col justify-between group">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Risk Level</span>
                      <h4 className="font-extrabold text-slate-800 text-xl mt-1.5 flex items-center gap-1.5">
                        {report.risks && report.risks.length > 0 ? (
                          report.risks.some(r => r.risk_level?.toLowerCase() === 'high' || r.level?.toLowerCase() === 'high') ? (
                            <span className="text-red-600 font-extrabold">🚨 High</span>
                          ) : (
                            <span className="text-amber-600 font-extrabold">⚠️ Medium</span>
                          )
                        ) : (
                          <span className="text-emerald-600 font-extrabold">✓ Low</span>
                        )}
                      </h4>
                    </div>
                    <span className="text-xs text-slate-400 mt-2 font-medium">AI assessment</span>
                  </div>
                </div>

                {/* Additional sections in Summary tab */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text">
                  {/* Left Column: Important Findings */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-805 text-base border-b border-gray-100 pb-2">Important Findings</h3>
                    {!report.risks || report.risks.length === 0 ? (
                      <p className="text-stone-400 text-xs italic font-semibold">No warnings or risk factors were identified. Not available.</p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {report.risks.slice(0, 3).map((risk, idx) => (
                          <div key={idx} className="p-3 bg-red-50/30 border border-red-100 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-red-700">Flag [{idx + 1}]</span>
                              <span className="text-[9px] font-extrabold bg-red-105 text-red-650 px-2 py-0.5 rounded-full capitalize">
                                {risk.risk_level || risk.level || "Low"}
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs capitalize">{risk.clause_text || risk.text || "Other Risk"}</h5>
                            <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">{risk.description || ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Contract Overview */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                    <h3 className="font-extrabold text-slate-805 text-base border-b border-gray-100 pb-2">Contract Timeline Highlights</h3>
                    {!report.timeline || report.timeline.length === 0 ? (
                      <p className="text-stone-400 text-xs italic font-semibold">No deadlines or events extracted. Not available.</p>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {report.timeline.slice(0, 3).map((evt, idx) => (
                          <div key={idx} className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-xl space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase font-bold text-indigo-700">Milestone [{idx + 1}]</span>
                              <span className="text-[9px] font-mono font-bold text-slate-400">{evt.date || "N/A"}</span>
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs">{evt.event || "Event"}</h5>
                            <p className="text-slate-555 text-[11px] leading-relaxed line-clamp-2">{evt.description || ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legacy text area wrapper for compatibility */}
                {report.executive_summary && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2 select-text">
                    <h3 className="font-extrabold text-slate-800 text-base">Executive Analysis Summary</h3>
                    <p className="text-slate-655 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {report.executive_summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Clauses */}
            {activeTab === "clauses" && (
              <div className="bg-white border border-slate-200/80 rounded-3xl shadow-3d-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-extrabold text-slate-800 text-lg">Classified Agreement Clauses</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">Click any row clause to preview full extraction details and insights drawer.</p>
                </div>
                {!report.clauses || report.clauses.length === 0 ? (
                  <div className="p-12 text-center text-xs font-bold text-slate-400">No clauses identified in this document.</div>
                ) : (
                  <>
                    {/* PC/Tablet Grid Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-4 w-44">Type</th>
                            <th className="px-6 py-4 w-28">Section No.</th>
                            <th className="px-6 py-4">Analyzed Excerpt (Click row to detail preview)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-xs font-semibold">
                          {report.clauses.map((c, i) => (
                            <tr
                              key={i}
                              onClick={() => setSelectedClauseDetail(c)}
                              className="hover:bg-indigo-50/20 active:bg-indigo-50/50 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4 font-bold text-slate-800 capitalize">{c.type || "Other"}</td>
                              <td className="px-6 py-4 font-bold text-slate-400">{c.section || "N/A"}</td>
                              <td className="px-6 py-4 text-slate-655 leading-relaxed truncate max-w-xl">{c.text || c.content || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Row Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {report.clauses.map((c, i) => (
                        <div
                          key={i}
                          onClick={() => setSelectedClauseDetail(c)}
                          className="p-5 hover:bg-indigo-50/10 active:bg-indigo-50/30 transition-colors cursor-pointer space-y-2 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-800 text-xs capitalize">{c.type || "Other"}</span>
                            <span className="text-[10px] bg-slate-50 border border-slate-200 rounded-full font-bold px-2 py-0.5 text-slate-500">
                              Sec: {c.section || "N/A"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-3">
                            {c.text || c.content || ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Risks */}
            {activeTab === "risks" && (
              <div className="space-y-6 max-w-4xl">
                {!report.risks || report.risks.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 text-xs font-semibold text-slate-500 shadow-3d-sm select-none">
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
              <div className="space-y-8 max-w-3xl pr-2 py-2">
                {!report.timeline || report.timeline.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-xs font-semibold text-slate-400">
                    No timeline dates extracted.
                  </div>
                ) : (
                  <div className="ml-1 space-y-6">
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

      {/* Clause Detail Slide-out Drawer / Adapts to Full-Screen bottom sheet on mobile screens */}
      {selectedClauseDetail && (
        <div className="fixed inset-0 z-50 flex justify-end items-end md:items-stretch">
          {/* Backdrop screen background opacity shade */}
          <div
            onClick={() => setSelectedClauseDetail(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer / Bottom sheet panel box container */}
          <div className="relative w-full max-w-lg bg-white h-[92vh] md:h-full mt-auto md:mt-0 shadow-2xl p-6 md:p-8 overflow-y-auto z-10 flex flex-col justify-between rounded-t-3xl md:rounded-t-none md:rounded-l-3xl animate-slide-up md:animate-slide-in">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Clause Details
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-lg capitalize mt-2">
                    {selectedClauseDetail.type} Clause
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedClauseDetail(null)}
                  className="text-slate-400 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5 text-xs md:text-sm">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Document Section Reference</span>
                  <p className="text-slate-700 font-extrabold mt-1">Section {selectedClauseDetail.section || "N/A"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Extracted Text Content</span>
                  <p className="text-slate-600 bg-slate-50 border border-slate-150 p-4 rounded-xl mt-1.5 leading-relaxed font-semibold italic select-text shadow-inner">
                    "{selectedClauseDetail.text || selectedClauseDetail.content}"
                  </p>
                </div>

                <div className="bg-indigo-50/40 border border-indigo-105 p-4 rounded-xl space-y-1 my-2">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Legal Analysis Recommendation</span>
                  <p className="text-slate-705 font-medium leading-relaxed text-xs">
                    Verify that the scope of this {selectedClauseDetail.type.toLowerCase()} clause conforms with your standard operating procedures and liability frameworks. Look for exclusions or capping limits.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 mt-8">
              <button
                onClick={() => setSelectedClauseDetail(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs transition-colors btn-3d shadow-3d-md"
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
