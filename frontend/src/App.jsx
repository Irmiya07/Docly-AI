import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Chat from "./pages/Chat";
import Search from "./pages/Search";
import Report from "./pages/Report";
import Compare from "./pages/Compare";
import Timeline from "./pages/Timeline";
import LoginSignup from "./pages/LoginSignup";
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner label="Restoring session authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginSignup />;
  }

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={isGuest ? <Navigate to="/chat" replace /> : <Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="chat" element={<Chat />} />
        <Route path="search" element={<Search />} />
        <Route path="report" element={<Report />} />
        <Route path="compare" element={<Compare />} />
        <Route path="timeline" element={<Timeline />} />
      </Route>
    </Routes>
  );
}

export default App;