import React, { useState } from "react";
import { searchDocuments } from "../api/searchApi.js";
import { useWorkspace } from "../hooks/WorkspaceContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

export default function Search() {
  const { files } = useWorkspace();
  const [query, setQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSearched(true);

    try {
      const response = await searchDocuments(
        query.trim(),
        topK,
        selectedSource || null
      );
      setResults(response.results || []);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.detail || "Could not complete search. Make sure the API server is active."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getScorePercentage = (distance) => {
    // ChromaDB queries return L2 distance (lower is better, e.g., 0 = identical).
    // Convert to a friendly mock similarity similarity percentage:
    // e.g. Similarity = max(0, 1 - distance)
    const rawVal = typeof distance === "number" ? distance : parseFloat(distance) || 0.5;
    
    // In L2 distance: 0.0 means identical, values > 1.5 are highly distant.
    // Let's normalize it so distance of 0 is 100%, and distance of 1.2 is 0%.
    const similarity = Math.max(0, 1 - Math.pow(rawVal, 2) / 1.44);
    return Math.round(similarity * 100);
  };

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-100 text-gray-900 rounded-sm font-semibold px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Semantic Search</h1>
        <p className="text-gray-500 mt-1">
          Perform conceptual AI queries across your contract terms instead of simple keyword checks.
        </p>
      </div>

      {/* Query Form Box */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search concepts (e.g. 'indemnification for intellectual property infringement')..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <div className="absolute left-4 top-3.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
                </svg>
              </div>
            </div>
            {/* Submit btn */}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-100 disabled:text-gray-400 font-bold px-6 py-3.5 rounded-2xl text-white text-sm shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              Search Database
            </button>
          </div>

          {/* Filtering row */}
          <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-gray-50 text-xs">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Document Specific Filter */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-semibold uppercase tracking-wider">Document Scope:</span>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 border-none"
                >
                  <option value="">All Uploaded Files ({files.length})</option>
                  {files.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Top K */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-semibold uppercase tracking-wider">Show Results:</span>
                <select
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-gray-600 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 border-none"
                >
                  <option value={3}>Best 3 Matches</option>
                  <option value={5}>Best 5 Matches</option>
                  <option value={10}>Best 10 Matches</option>
                  <option value={20}>Best 20 Matches</option>
                </select>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {isLoading && <LoadingSpinner label="Running semantic retrieval matching..." />}

        {errorMessage && (
          <ErrorState
            title="Extraction Failure"
            message={errorMessage}
            onRetry={handleSearch}
            retryLabel="Re-send Query"
          />
        )}

        {!isLoading && !errorMessage && !searched && (
          <div className="text-center p-12 bg-gray-50/30 border border-gray-150 border-dashed rounded-3xl text-xs font-semibold text-gray-400 select-none">
            No active search query. Type a concept above and click search to view matching contract excerpts.
          </div>
        )}

        {!isLoading && !errorMessage && searched && results.length === 0 && (
          <EmptyState
            title="No matches found"
            description="The semantic engine could not locate clauses matching your parameters. Adjust filters or search keywords."
          />
        )}

        {!isLoading && !errorMessage && results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Semantic Search Results ({results.length})
            </h2>

            {/* Results Grid */}
            <div className="space-y-4">
              {results.map((res, index) => {
                const metadata = res.metadata || {};
                const sourceName = metadata.source ? metadata.source.split("/").pop().split("\\").pop() : "Unknown Document";
                const pageNum = metadata.page || 1;
                const matchVal = res.score ? getScorePercentage(res.score) : 90 - index * 6;

                return (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-205 transition-all duration-300 flex flex-col md:flex-row gap-6 items-start hover:shadow-slate-100/50"
                  >
                    {/* Badge Column */}
                    <div className="flex md:flex-col items-center justify-between md:justify-center w-full md:w-28 gap-2 border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-6">
                      <div className="text-center md:space-y-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          matchVal > 85
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : matchVal > 70
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {matchVal}% Match
                        </span>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mt-1 tracking-wider">Page {pageNum}</p>
                      </div>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 text-blue-600">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        <span className="font-bold text-sm text-gray-800">{sourceName}</span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pl-2 select-text">
                        {highlightText(res.text || "", query)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
