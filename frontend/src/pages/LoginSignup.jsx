import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function LoginSignup() {
  const { login, signup, continueAsGuest } = useAuth(); 
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (isLoginTab) {
        await login(username.trim(), password);
      } else {
        await signup(username.trim(), email.trim(), password);
        setSuccessMsg("Registration successful! You can now sign in.");
        setIsLoginTab(true);
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      let finalError = "Authentication request failed. Please check credentials or verify MongoDB database.";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === "string") {
          finalError = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          finalError = err.response.data.detail
            .map((item) => (typeof item === "string" ? item : `${item.loc?.join(".") || "field"}: ${item.msg}`))
            .join("\n");
        }
      }
      setErrorMsg(finalError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden select-none font-sans">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 p-8 rounded-3xl shadow-2xl relative z-10 space-y-6 animate-fade-in">
        
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-blue-600 items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-blue-500/20">
            D
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Docly AI</h1>
          <p className="text-slate-400 text-xs font-semibold">Legal Document Analysis & Audit Suite</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/40 text-xs font-bold text-slate-400">
          <button
            onClick={() => { setIsLoginTab(true); setErrorMsg(null); setShowPassword(false); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${isLoginTab ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:text-white"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setErrorMsg(null); setShowPassword(false); }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${!isLoginTab ? "bg-blue-600 text-white shadow-md shadow-blue-500/10" : "hover:text-white"}`}
          >
            Create Account
          </button>
        </div>

        {/* Message banners */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs p-3.5 rounded-xl leading-relaxed whitespace-pre-line animate-slide-in">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-350 text-xs p-3.5 rounded-xl leading-relaxed animate-slide-in">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. legal_counsel"
              className="w-full bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {!isLoginTab && (
            <div className="space-y-1.5 animate-fade-in">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firm.com"
                className="w-full bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700/80 pl-4 pr-10 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4.5 w-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.808 7.808 3.15 3.15m-3.15-3.15a3 3 0 1 1-4.243-4.243m4.242 4.242-9.621-9.621" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4.5 w-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLoginTab ? (
              "Sign In to Dashboard"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-700/60"></div>
          <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Or</span>
          <div className="flex-grow border-t border-slate-700/60"></div>
        </div>

        {/* Guest Button */}
        <button
          onClick={continueAsGuest}
          className="w-full bg-slate-700/50 hover:bg-slate-700 border border-slate-600/40 text-slate-350 hover:text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          Continue as Guest
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3" />
          </svg>
        </button>

      </div>
    </div>
  );
}
