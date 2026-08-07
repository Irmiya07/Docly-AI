import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { token, isGuest } = useAuth();

  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch documents for authenticated users.
   * Guest users keep documents only in memory.
   */
  const fetchDocuments = useCallback(async () => {
    if (!token || isGuest) {
      setFiles([]);
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.get("/upload/");

      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [token, isGuest]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /**
   * Add uploaded files
   */
  const addUploadedFiles = (fileNames) => {
    if (isGuest) {
      const uploaded = fileNames.map((name) => {
        const size = Math.floor(Math.random() * 200) + 50;

        return {
          id: crypto.randomUUID(),
          name,
          size: `${size} KB`,
          uploadedAt: new Date().toISOString(),
          clauses: 0,
          risks: 0,
          events: 0,
          type: name.endsWith(".pdf")
            ? "application/pdf"
            : "image/*",
        };
      });

      setFiles((prev) => {
        const existing = prev.filter(
          (file) =>
            !uploaded.some((u) => u.name === file.name)
        );

        return [...uploaded, ...existing];
      });

      return;
    }

    fetchDocuments();
  };

  /**
   * Workspace statistics
   */
  const getStats = () => {
    return files.reduce(
      (stats, file) => {
        stats.totalDocs++;

        stats.totalClauses += file.clauses || 0;
        stats.totalRisks += file.risks || 0;
        stats.totalEvents += file.events || 0;

        return stats;
      },
      {
        totalDocs: 0,
        totalClauses: 0,
        totalRisks: 0,
        totalEvents: 0,
      }
    );
  };

  /**
   * Remove one file
   */
  const removeFile = async (name) => {
    if (isGuest) {
      setFiles((prev) =>
        prev.filter((file) => file.name !== name)
      );
      return;
    }

    try {
      await api.delete(`/upload/${encodeURIComponent(name)}`);

      setFiles((prev) =>
        prev.filter((file) => file.name !== name)
      );
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  /**
   * Clear workspace
   */
  const clearWorkspace = async () => {
    if (isGuest) {
      setFiles([]);
      return;
    }

    try {
      await api.delete("/upload/clear");
    } catch (error) {
      console.error("Failed to clear workspace:", error);
    }

    setFiles([]);
  };

  const value = {
    files,
    isLoading,
    addUploadedFiles,
    removeFile,
    clearWorkspace,
    refreshDocuments: fetchDocuments,
    getStats,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside WorkspaceProvider."
    );
  }

  return context;
}