
import { useState, useRef } from "react";
import { timeline } from "../api/timelineApi.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import ErrorState from "../components/ErrorState.jsx";
import TimelineCard from "../components/TimelineCard.jsx";
import { useWorkspace } from "../hooks/WorkspaceContext";

export default function Timeline() {
  const { files: workspaceFiles } = useWorkspace();

  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const fileInputRef = useRef(null);

  // =========================================================
  // FILE UPLOAD
  // =========================================================

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);

    await processTimeline(selectedFile);
  };

  // =========================================================
  // PROCESS UPLOADED FILE
  // =========================================================

  const processTimeline = async (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const data = await timeline(selectedFile);

      setResult(data);
    } catch (err) {
      console.error("Timeline extraction error:", err);

      setErrorMessage(
        err.response?.data?.detail ||
          "Could not extract contract commitments and milestones. Verify that the backend server is active."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // LOAD WORKSPACE DOCUMENT
  // =========================================================

  const loadWorkspaceDoc = async (docName) => {
    if (!docName) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResult(null);

    setFile({
      name: docName,
    });

    try {
      const data = await timeline(docName);

      setResult(data);
    } catch (err) {
      console.error("Workspace timeline error:", err);

      setErrorMessage(
        err.response?.data?.detail ||
          `Could not extract timeline for ${docName}.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================
  // OPEN FILE SELECTOR
  // =========================================================

  const triggerUploadClick = () => {
    fileInputRef.current?.click();
  };

  // =========================================================
  // CLEAR RESULT
  // =========================================================

  const clearTimeline = () => {
    setFile(null);
    setResult(null);
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // EVENTS
  // =========================================================

  const events = Array.isArray(result?.timeline)
    ? result.timeline
    : [];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Timeline Extraction
          </h1>

          <p className="text-gray-500 mt-1">
            Extract renewal dates, delivery deadlines, and binding term
            triggers chronologically.
          </p>
        </div>

        {file && (
          <button
            type="button"
            onClick={clearTimeline}
            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-250/80 px-4 py-2.5 rounded-xl transition-all duration-150 btn-3d shadow-3d-sm active:shadow-3d-active shrink-0 self-start sm:self-auto"
          >
            Clear Sheet
          </button>
        )}

      </div>

      {/* =====================================================
          INITIAL UPLOAD SCREEN
      ====================================================== */}

      {!file && !result && !isLoading && (

        <div className="space-y-8 max-w-4xl mx-auto">

          {/* Upload Box */}

          <div
            onClick={triggerUploadClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                triggerUploadClick();
              }
            }}
            className="card-3d border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center bg-white hover:border-blue-500 hover:shadow-3d-lg cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-md"
          >

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.docx"
            />

            <div className="flex flex-col items-center">

              {/* Icon */}

              <div className="h-16 w-16 mb-6 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-8 w-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>

              </div>

              <h3 className="text-lg font-bold text-gray-900">
                Upload Legal Document
              </h3>

              <p className="text-sm text-gray-400 mt-1 mb-5">
                Identify dates, events, and descriptions in a vertical
                sequence
              </p>

              <span className="text-xs bg-blue-600 hover:bg-blue-550 shadow-3d-sm active:shadow-3d-active font-extrabold rounded-xl text-white px-5 py-2.75 transition-all btn-3d">
                Browse System Files
              </span>

            </div>
          </div>

          {/* =================================================
              WORKSPACE DOCUMENTS
          ================================================== */}

          <div className="space-y-4">

            <div className="flex items-center gap-2">

              <span className="h-px bg-gray-200 flex-1"></span>

              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">
                Select from Workspace Documents
              </span>

              <span className="h-px bg-gray-200 flex-1"></span>

            </div>

            {!workspaceFiles || workspaceFiles.length === 0 ? (

              <div className="text-center p-8 bg-white border border-gray-150 rounded-2xl text-xs text-gray-400">
                No active workspace documents. Please upload documents in
                the Sidebar first, then select them here.
              </div>

            ) : (

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {workspaceFiles.map((doc, idx) => (

                  <div
                    key={doc.name || idx}
                    onClick={() => loadWorkspaceDoc(doc.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        loadWorkspaceDoc(doc.name);
                      }
                    }}
                    className="card-3d bg-white p-5 rounded-2xl border border-gray-150 hover:border-blue-500 shadow-3d-sm hover:shadow-3d-md cursor-pointer transition-all duration-300 flex flex-col justify-between group"
                  >

                    <div className="space-y-2">

                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                        Workspace Doc
                      </span>

                      <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm break-all pt-1">
                        {doc.name}
                      </h4>

                      <p className="text-xs text-gray-550 leading-relaxed">
                        Size: {doc.size || "Unknown"}. Extract timelines
                        and deadlines for this workspace document.
                      </p>

                    </div>

                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">

                      Extract Timeline

                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className="h-3 w-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m8.25 4.5 7.5 7.5-7.5 7.5"
                        />
                      </svg>

                    </span>

                  </div>

                ))}

              </div>

            )}

          </div>

        </div>

      )}

      {/* =====================================================
          LOADING
      ====================================================== */}

      {isLoading && (
        <LoadingSpinner
          label="Extracting timeline dates and key operations..."
        />
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

      {!isLoading && errorMessage && (

        <ErrorState
          title="Timeline Extraction Failed"
          message={errorMessage}
          onRetry={() => {
            if (file) {
              processTimeline(file);
            }
          }}
          retryLabel="Retry Extraction"
        />

      )}

      {/* =====================================================
          RESULTS
      ====================================================== */}

      {!isLoading && !errorMessage && result && (

        <div className="space-y-6 max-w-3xl ml-2 py-4">

          {/* Document Information */}

          <div className="bg-white p-5 border border-gray-100 rounded-2xl shadow-xs flex items-center gap-3">

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5 text-blue-600"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625c0-1.125-.504-1.125-1.125-1.125h-1.5m-7.5-3.375V3c0-.621.504-1.125 1.125-1.125h5.625c.621 0 1.125.504 1.125 1.125v3.375m-7.5 0H7.5m9 0h1.5m-10.5 3H7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>

            <div>

              <p className="text-xs text-gray-400 font-semibold uppercase">
                Analyzed Document
              </p>

              <h2 className="text-sm font-bold text-gray-990">
                {result.document || file?.name || "Unknown document"}
              </h2>

            </div>

          </div>

          {/* =================================================
              NO EVENTS
          ================================================== */}

          {events.length === 0 ? (

            <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-gray-100 rounded-2xl shadow-xs">

              <div className="h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-7 w-7 text-blue-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>

              </div>

              <h3 className="text-lg font-bold text-gray-900">
                No milestones captured
              </h3>

              <p className="text-sm text-gray-500 mt-2 max-w-md">
                The AI contract analyzer could not identify chronologically
                indexed deadlines within this contract.
              </p>

            </div>

          ) : (

            /* =================================================
               TIMELINE
            ================================================== */

            <div className="relative mt-8 space-y-6">

              {events.map((evt, idx) => (

                <TimelineCard
                  key={`${evt.date || "event"}-${idx}`}
                  idx={idx}
                  date={evt.date || "Date not specified"}
                  title={evt.event || evt.title || "Untitled event"}
                  description={
                    evt.description ||
                    "No description available."
                  }
                  isLast={idx === events.length - 1}
                />

              ))}

            </div>

          )}

        </div>

      )}

    </div>
  );
}

