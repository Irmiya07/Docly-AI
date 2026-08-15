import React, { useState, useRef, useEffect } from "react";
import { extractClauses } from "../api/clauseApi";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import StatCard from "../components/StatCard";
import { useWorkspace } from "../hooks/WorkspaceContext";

export default function Clause() {
  const { files: workspaceFiles } = useWorkspace();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [abortController, setAbortController] = useState(null);
  const timerIntervalRef = useRef(null);

  // Drawer Preview State
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

  const handleCancelExtraction = () => {
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
      await processExtraction(selected);
    }
  };

  const processExtraction = async (selectedFile) => {
    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);
    startTimer();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const data = await extractClauses(selectedFile, { signal: controller.signal });
      setResult(data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log("Extraction cancelled.");
        return;
      }
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Could not extract contract clauses. Make sure backend service is active."
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
    setResult(null);
    setFile({ name: docName });
    startTimer();
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const data = await extractClauses(docName, { signal: controller.signal });
      setResult(data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        console.log("Workspace document extraction cancelled.");
        return;
      }
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || `Could not extract clauses for ${docName}.`
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

  const clearResult = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);
    setSelectedClauseDetail(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Clause Extraction</h1>
          <p className="text-gray-500 mt-1">
            Extract and classify all legal clauses and commitments from a single contract context.
          </p>
        </div>
        {result && (
          <button
            onClick={clearResult}
            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250/80 px-4 py-2.5 rounded-xl transition-all duration-150 btn-3d shadow-3d-sm active:shadow-3d-active shrink-0 self-start sm:self-auto"
          >
            Clear Screen
          </button>
        )}
      </div>

      {!file && !result && !isLoading && (
        <div className="space-y-8 max-w-4xl mx-auto">
          {/* File Upload Zone */}
          <div
            onClick={triggerUploadClick}
            className="card-3d border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-white hover:border-blue-500 hover:shadow-3d-lg cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-md"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff"
            />
            <div className="flex flex-col items-center relative z-10">
              <div className="h-16 w-16 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-655 border border-blue-105 shadow-inner transition-transform group-hover:scale-110 duration-200">
                <svg xmlns="http://www.w3.org/2500/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625c0-1.125-.504-1.125-1.125-1.125h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-805">Select Contract Document</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1.5 mb-6">Upload agreement file to analyze and extract categories (Max 15MB)</p>
              <span className="text-xs bg-blue-600 hover:bg-blue-550 shadow-3d-sm active:shadow-3d-active font-extrabold rounded-xl text-white px-5 py-2.75 transition-all outline-none btn-3d">
                Browse System Files
              </span>
            </div>
          </div>

          {/* Workspace Suggestions Grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-px bg-slate-205 flex-1"></span>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest px-2">Select Workspace Documents</span>
              <span className="h-px bg-slate-205 flex-1"></span>
            </div>

            {workspaceFiles?.length === 0 ? (
              <div className="text-center p-8 bg-white border border-slate-200/85 rounded-2xl text-xs font-bold text-slate-400 shadow-inner">
                No active workspace documents. Upload documents in the Sidebar first.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {workspaceFiles.map((doc, idx) => (
                  <div
                    key={idx}
                    onClick={() => loadWorkspaceDoc(doc.name)}
                    className="card-3d bg-white p-5 rounded-2xl border border-gray-150 hover:border-blue-500 shadow-3d-sm hover:shadow-3d-md cursor-pointer transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-105 px-2 py-0.5 rounded-full uppercase">
                        Workspace Doc
                      </span>
                      <h4 className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors text-sm break-all pt-1">
                        {doc.name}
                      </h4>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        Size: {doc.size || 'Unknown'}. Extract all clauses from this contract.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-650 flex items-center gap-1 mt-4 group-hover:translate-x-1 duration-150 transition-transform">
                      Extract Clauses
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

      {/* Loading component */}
      {isLoading && (
        <div className="space-y-6 max-w-4xl mx-auto py-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="font-bold text-slate-700 text-sm md:text-base">Extracting legal clauses from agreement...</span>
              </div>
              <p className="text-xs font-semibold text-slate-400">Offloading to model. Average time is 5-20 seconds.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-slate-250 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 font-mono shadow-inner">
                Elapsed: {timerSeconds}s
              </div>
              <button
                onClick={handleCancelExtraction}
                className="text-xs font-bold text-rose-650 bg-rose-50 hover:bg-rose-100 border border-rose-250/80 px-4 py-2.5 rounded-xl transition-all duration-150"
              >
                Cancel Process
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <ErrorState
          title="Extraction Failed"
          message={errorMessage}
          onRetry={() => file && processExtraction(file)}
          retryLabel="Retry Extraction"
        />
      )}

      {!isLoading && !errorMessage && result && (
        <div className="space-y-8 animate-fade-in">
          {/* File Indicator */}
          <div className="flex items-center gap-2 text-xs bg-blue-50/50 border border-blue-100/50 py-2.5 px-4 rounded-xl max-w-fit font-bold text-blue-805 shadow-sm">
            <span className="truncate">Analyzing Document: {file?.name || "Workspace Contract"}</span>
          </div>

          {/* Aggregate counts */}
          <div className="max-w-md">
            <StatCard
              title="Total Clauses Extracted"
              value={result.total_clauses || result.clauses?.length || 0}
              description="Click any clause row below to view full content"
              badgeValue="AI Classified"
              badgeType="success"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6 text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625c0-1.125-.504-1.125-1.125-1.125h-1.5" />
                </svg>
              }
            />
          </div>

          {/* Results display */}
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-950 text-lg">Extracted Agreement Components</h3>
                <p className="text-xs text-gray-400 mt-0.5">Categorized legal terms and provisions.</p>
              </div>
            </div>

            {!result.clauses || result.clauses.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-450">No clauses identified in this document.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                      <th className="px-6 py-4 w-48">Clause Category</th>
                      <th className="px-6 py-4 w-48">Title</th>
                      <th className="px-6 py-4">Excerpt Expose (Click highlights detail)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                    {result.clauses.map((c, i) => (
                      <tr
                        key={i}
                        onClick={() => setSelectedClauseDetail(c)}
                        className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md uppercase">
                            {c.category || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 capitalize">{c.title || "Other Clause"}</td>
                        <td className="px-6 py-4 text-gray-600 truncate max-w-xl">{c.content || c.text || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-out Drawer */}
      {selectedClauseDetail && (
        <div className="fixed inset-0 z-50 flex justify-end items-end md:items-stretch">
          <div
            onClick={() => setSelectedClauseDetail(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-lg bg-white h-[92vh] md:h-full mt-auto md:mt-0 shadow-2xl p-6 md:p-8 overflow-y-auto z-10 flex flex-col justify-between rounded-t-3xl md:rounded-t-none md:rounded-l-3xl animate-scale-up">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-150 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {selectedClauseDetail.category || "General"}
                  </span>
                  <h3 className="font-extrabold text-gray-950 text-lg capitalize mt-2">
                    {selectedClauseDetail.title || "Clause Detail"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedClauseDetail(null)}
                  className="text-gray-400 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5 text-xs md:text-sm">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Extracted Provisions content</span>
                  <p className="text-gray-705 bg-gray-50 border border-gray-150 p-4 rounded-xl mt-1.5 leading-relaxed font-semibold italic select-text">
                    "{selectedClauseDetail.content || selectedClauseDetail.text}"
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 mt-8">
              <button
                onClick={() => setSelectedClauseDetail(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors"
              >
                Close Clause Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
