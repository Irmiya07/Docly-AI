import React, { useState, useRef } from "react";
import { compareDocs } from "../api/compareApi.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ComparisonTable from "../components/ComparisonTable.jsx";
import StatCard from "../components/StatCard.jsx";
import { useWorkspace } from "../hooks/WorkspaceContext";

export default function Compare() {
  const { files: workspaceFiles } = useWorkspace();
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const file1Ref = useRef(null);
  const file2Ref = useRef(null);

  const handleFileChange = (e, index) => {
    if (e.target.files && e.target.files[0]) {
      const fileObj = e.target.files[0];
      if (index === 1) setFile1(fileObj);
      else setFile2(fileObj);
    }
  };

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!file1 || !file2) return;

    setIsLoading(true);
    setErrorMessage(null);
    setComparison(null);

    // If both are mock database items
    if (file1.isMock && file2.isMock) {
      setTimeout(() => {
        // Generate simulated comparison results
        const mockResult = getMockComparison(file1.name, file2.name);
        setComparison(mockResult);
        setIsLoading(false);
      }, 700);
      return;
    }

    try {
      const param1 = file1.isWorkspace ? file1.name : file1;
      const param2 = file2.isWorkspace ? file2.name : file2;
      const data = await compareDocs(param1, param2);
      setComparison(data.comparison_results || data);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Could not complete document comparison. Make sure the API server exists."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getMockComparison = (name1, name2) => {
    if (name1 === name2) {
      return {
        added_clauses: [],
        modified_clauses: [],
        removed_clauses: []
      };
    }
    return {
      added_clauses: [
        { type: "Governing Law Clarification", text: "In the event of litigation arising, the parties agree that state venues of New York shall have exclusive jurisdiction.", impact: "Limits jurisdictional disputes." }
      ],
      modified_clauses: [
        { type: "Limitation of Liability Capping limit", diff: "- Provider limits maximum damages to $50,000.\n+ Provider limits liability to three times (3x) the fees paid in the past 12 months.", impact: "Greatly expands total legal indemnity liability." }
      ],
      removed_clauses: [
        { type: "Automatic Termination Renewal Clause", text: "The contract auto-renews for consecutive one-year terms unless either party gives 60 days notice prior to renewal.", impact: "Obligation terminates at expiration date instead of auto-renewing." }
      ]
    };
  };

  const selectWorkspaceDoc = (name, index) => {
    const workspaceFileObj = { name, isWorkspace: true };
    if (index === 1) setFile1(workspaceFileObj);
    else setFile2(workspaceFileObj);
  };

  const selectMockDoc = (name, index) => {
    const mockFileObj = { name, isMock: true };
    if (index === 1) setFile1(mockFileObj);
    else setFile2(mockFileObj);
  };

  const clearCompare = () => {
    setFile1(null);
    setFile2(null);
    setComparison(null);
    setErrorMessage(null);
    if (file1Ref.current) file1Ref.current.value = "";
    if (file2Ref.current) file2Ref.current.value = "";
  };

  const ad = comparison?.added_clauses || comparison?.added || [];
  const md = comparison?.modified_clauses || comparison?.modified || [];
  const rd = comparison?.removed_clauses || comparison?.removed || [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Compare Contracts</h1>
          <p className="text-gray-500 mt-1">
            Audit delta modifications between two versions of an agreement side-by-side.
          </p>
        </div>
        {(file1 || file2 || comparison) && (
          <button
            onClick={clearCompare}
            className="text-xs font-bold text-red-650 bg-red-50 hover:bg-red-100 border border-red-150 px-3.5 py-2 rounded-xl transition-colors shrink-0"
          >
            Reset Form
          </button>
        )}
      </div>

      {!comparison && !isLoading && (
        <form onSubmit={handleCompare} className="space-y-8 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1 (Base File) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-950 text-sm md:text-base">Original Document (v1)</h3>
              
              {/* Uploader */}
              <div
                onClick={() => file1Ref.current.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  file1 && !file1.isMock ? "border-blue-500 bg-blue-50/20" : "border-gray-200 hover:border-blue-500"
                }`}
              >
                <input
                  type="file"
                  ref={file1Ref}
                  onChange={(e) => handleFileChange(e, 1)}
                  className="hidden"
                  accept=".pdf,.docx"
                />
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2.5 ${
                    file1 && !file1.isMock ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625c0-1.125-.504-1.125-1.125-1.125h-1.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  {file1 && !file1.isMock ? (
                    <div className="max-w-[200px] overflow-hidden">
                      <p className="font-bold text-xs text-gray-900 truncate" title={file1.name}>{file1.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Click to replace file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-xs text-gray-800">Upload Base Contract</p>
                      <p className="text-[10px] text-gray-450 mt-0.5">PDF or DOCX</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2 pt-2 border-t border-gray-50">
                <span className="text-[9px] font-bold text-gray-400 Heart-icon uppercase tracking-widest block">Select Workspace Document:</span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {workspaceFiles?.length === 0 ? (
                    <span className="text-[10px] text-gray-450 italic">No workspace documents. Upload files to sidebar first.</span>
                  ) : (
                    workspaceFiles.map((doc) => (
                      <button
                        key={doc.name}
                        type="button"
                        onClick={() => selectWorkspaceDoc(doc.name, 1)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs border font-medium transition-all truncate ${
                          file1 && file1.name === doc.name
                            ? "bg-blue-50 border-blue-500 text-blue-755 font-bold"
                            : "border-gray-150 hover:bg-gray-50 text-gray-700"
                        }`}
                        title={doc.name}
                      >
                        {doc.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Box 2 (Revised File) */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-950 text-sm md:text-base">Modified Document (v2)</h3>
              
              {/* Uploader */}
              <div
                onClick={() => file2Ref.current.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                  file2 && !file2.isMock ? "border-blue-500 bg-blue-50/20" : "border-gray-200 hover:border-blue-500"
                }`}
              >
                <input
                  type="file"
                  ref={file2Ref}
                  onChange={(e) => handleFileChange(e, 2)}
                  className="hidden"
                  accept=".pdf,.docx"
                />
                <div className="flex flex-col items-center">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2.5 ${
                    file2 && !file2.isMock ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625c0-1.125-.504-1.125-1.125-1.125h-1.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  {file2 && !file2.isMock ? (
                    <div className="max-w-[200px] overflow-hidden">
                      <p className="font-bold text-xs text-gray-900 truncate" title={file2.name}>{file2.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Click to replace file</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-xs text-gray-800">Upload Revised Contract</p>
                      <p className="text-[10px] text-gray-450 mt-0.5">PDF or DOCX</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2 pt-2 border-t border-gray-50">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Select Workspace Document:</span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {workspaceFiles?.length === 0 ? (
                    <span className="text-[10px] text-gray-450 italic">No workspace documents. Upload files to sidebar first.</span>
                  ) : (
                    workspaceFiles.map((doc) => (
                      <button
                        key={doc.name}
                        type="button"
                        onClick={() => selectWorkspaceDoc(doc.name, 2)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs border font-medium transition-all truncate ${
                          file2 && file2.name === doc.name
                            ? "bg-blue-50 border-blue-500 text-blue-755 font-bold"
                            : "border-gray-150 hover:bg-gray-50 text-gray-700"
                        }`}
                        title={doc.name}
                      >
                        {doc.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>

          <div className="text-center pt-2">
            <button
              type="submit"
              disabled={!file1 || !file2}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-150 disabled:text-gray-405 font-bold px-8 py-3.5 rounded-2xl text-white text-sm shadow-sm transition-colors cursor-pointer"
            >
              Run Version Comparison
            </button>
          </div>
        </form>
      )}

      {isLoading && <LoadingSpinner label="Auditing clause differences, detecting modifications..." />}

      {errorMessage && (
        <ErrorState
          title="Comparison Failed"
          message={errorMessage}
          onRetry={handleCompare}
          retryLabel="Retry Analysis"
        />
      )}

      {!isLoading && !errorMessage && comparison && (
        <div className="space-y-8 animate-fade-in animate-fade-in-down">
          {/* File Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-150 py-2 px-3 rounded-lg font-medium text-gray-700">
              <span className="font-bold text-gray-400">v1:</span> {file1?.name}
            </div>
            <div className="flex items-center gap-1.5 text-xs bg-blue-50/50 border border-blue-100 py-2 px-3 rounded-lg font-semibold text-blue-800">
              <span className="font-bold text-blue-400">v2:</span> {file2?.name}
            </div>
          </div>

          {/* Top Aggregates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
            <StatCard
              title="Added Clauses"
              value={ad.length}
              description="New requirements inserted"
              badgeValue="Audit Delta"
              badgeType="success"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-emerald-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
            />
            <StatCard
              title="Modified Clauses"
              value={md.length}
              description=" Wording edits cataloged"
              badgeValue="AI Flagged"
              badgeType="warning"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-amber-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
              }
            />
            <StatCard
              title="Omitted Clauses"
              value={rd.length}
              description="Sections deleted/removed"
              badgeValue="Review Alert"
              badgeType="danger"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 text-red-650">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              }
            />
          </div>

          <div className="max-w-6xl">
            <ComparisonTable modified={md} added={ad} removed={rd} />
          </div>
        </div>
      )}
    </div>
  );
}
