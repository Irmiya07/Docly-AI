import React, { useState, useRef } from "react";
import { useWorkspace } from "../hooks/WorkspaceContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { uploadFiles } from "../api/uploadApi.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function Upload() {
  const { files, addUploadedFiles, removeFile } = useWorkspace();
  const { isGuest } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const getProgressStateLabel = (progress) => {
    if (progress < 25) return "Uploading...";
    if (progress < 50) return "Extracting Text...";
    if (progress < 85) return "Generating Embeddings...";
    return "Ready to Chat";
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (selectedFiles) => {
    // Check files eligibility (PDF, DOCX, PNG, JPG, JPEG)
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/jpg"
    ];

    const validFiles = selectedFiles.filter((f) => {
      const extension = f.name.split(".").pop().toLowerCase();
      const isValidExtension = ["pdf", "docx", "png", "jpg", "jpeg"].includes(extension);
      return allowedTypes.includes(f.type) || isValidExtension;
    });

    if (validFiles.length === 0) {
      setUploadError("Invalid file types. Please select PDF, DOCX, or Image files.");
      return;
    }

    setUploadError(null);
    setUploadSuccess(null);
    setIsUploading(true);
    setUploadProgress(10);

    // Simulate standard uploading increments
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressInterval);
          return 85;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 400);

    try {
      const result = await uploadFiles(validFiles);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Extract filename strings
      const uploadedNames = result.uploaded_files || validFiles.map((f) => f.name);
      
      // Update our workspace context/state
      addUploadedFiles(uploadedNames);

      setUploadSuccess({
        message: `Successfully uploaded and chunked ${uploadedNames.length} document(s).`,
        chunks: result.total_chunks || (uploadedNames.length * 15),
        files: uploadedNames
      });

      // Clear files in form
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      
      let finalError = "Upload failed. Please ensure the backend server is running.";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === "string") {
          finalError = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          finalError = err.response.data.detail
            .map((item) => (typeof item === "string" ? item : `${item.loc?.join(".") || "field"}: ${item.msg}`))
            .join("\n");
        }
      }
      setUploadError(finalError);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 800);
    }
  };

  const triggerUploadClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Upload Documents</h1>
        <p className="text-gray-500 mt-1">
          Upload PDF, DOCX contracts, or image scans to populate knowledge base.
        </p>
      </div>

      {isGuest && (
        <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <h4 className="font-bold text-amber-900 text-xs">Guest Session Workspace</h4>
            <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
              Your uploaded files are temporary and will be removed when you refresh or leave this session.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Container */}
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerUploadClick}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 ${
              dragActive
                ? "border-blue-600 bg-blue-50/40 scale-[1.01]"
                : "border-gray-200 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50/30"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept=".pdf,.docx,.png,.jpg,.jpeg"
            />

            <div className="flex flex-col items-center">
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                dragActive ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-8 w-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-gray-950">Drag & drop files here</h3>
              <p className="text-gray-450 text-sm mt-1 mb-4">
                or <span className="text-blue-600 font-semibold hover:underline">browse your computer</span>
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span> PDF files
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span> DOCX contracts
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Scans (PNG/JPG)
                </span>
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="text-blue-600 flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getProgressStateLabel(uploadProgress)}
                </span>
                <span className="text-gray-900">{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Success Box */}
          {uploadSuccess && (
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-2xl flex items-start gap-4">
              <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-emerald-950">Upload Successful</h4>
                <p className="text-sm text-emerald-700 mt-1">{uploadSuccess.message}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uploadSuccess.files.map((name) => (
                    <span key={name} className="text-xs bg-emerald-100/50 text-emerald-800 px-2.5 py-0.5 rounded-lg border border-emerald-200/40 font-medium">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Box */}
          {uploadError && (
            <div className="bg-red-50/50 border border-red-100 p-6 rounded-2xl flex items-start gap-4 animate-shake">
              <div className="h-10 w-10 min-w-[2.5rem] rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-red-950">Upload Failed</h4>
                <p className="text-sm text-red-700 mt-1">{uploadError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Existing Documents List Sidebar */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 h-fit space-y-6">
          <div>
            <h3 className="font-bold text-gray-950">Workspace Documents</h3>
            <p className="text-xs text-gray-400 mt-0.5">Files currently stored and searchable.</p>
          </div>

          {files.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No files in current workspace.</p>
          ) : (
            <div className="space-y-3 divide-y divide-gray-50 max-h-[360px] overflow-y-auto pr-1">
              {files.map((file, idx) => (
                <div key={file.name} className={`flex items-center justify-between text-sm py-3 ${idx === 0 ? "pt-0" : ""}`}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 text-gray-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">{file.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 text-gray-300 hover:text-red-500 rounded-md transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
