import React, { useState, useEffect, useRef } from "react";

export default function FloatingDoc3D() {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef(null);

  // Handle cursor-based 3D rotation
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    // Calculate cursor location relative to center of component (range -1 to 1)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    // Convert to rotation angles (limit to Max 15 degrees)
    setRotate({
      x: -y * 22,
      y: x * 22,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Support prefers-reduced-motion fallback
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (prefersReducedMotion) {
    return (
      <div className="relative w-72 h-96 bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 flex flex-col justify-between">
        <div>
          <div className="h-6 w-1/3 bg-indigo-100 rounded-md mb-6"></div>
          <div className="space-y-3">
            <div className="h-3 bg-slate-100 rounded-full w-full"></div>
            <div className="h-3 bg-slate-100 rounded-full w-5/6"></div>
            <div className="h-3 bg-slate-100 rounded-full w-4/5"></div>
            <div className="h-3 bg-slate-100 rounded-full w-11/12"></div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="h-4 w-12 bg-slate-100 rounded-md"></div>
          <div className="h-8 w-16 bg-indigo-600 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full max-w-sm h-[400px] flex items-center justify-center select-none"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      {/* Glow Backdrop */}
      <div 
        className={`absolute w-64 h-80 rounded-3xl bg-indigo-500/10 blur-3xl transition-opacity duration-500 pointer-events-none ${
          isHovered ? "opacity-100" : "opacity-60"
        }`}
      ></div>

      {/* Floating 3D Document Container */}
      <div 
        className="w-72 h-96 bg-white rounded-2xl border border-slate-200/80 shadow-[0_15px_30px_rgba(15,23,42,0.08)] p-6 flex flex-col justify-between relative transition-all duration-300 ease-out animate-float cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(${isHovered ? "20px" : "0px"})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovered 
            ? "0 25px 50px -12px rgba(79, 70, 229, 0.25), 0 0 20px rgba(79, 70, 229, 0.1)"
            : "0 15px 30px rgba(15,23,42,0.08)"
        }}
      >
        {/* Glowing border outline effect */}
        <div 
          className="absolute inset-0 border border-indigo-500/0 rounded-2xl transition-colors duration-300 pointer-events-none"
          style={{
            borderColor: isHovered ? "rgba(79, 70, 229, 0.15)" : "transparent"
          }}
        ></div>

        {/* AI Scanning Sweeper Bar */}
        <div 
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-60 pointer-events-none"
          style={{
            animation: "scan 3.5s linear infinite",
            top: "0%"
          }}
        >
          {/* Scan shadow glow */}
          <div className="absolute inset-0 bg-indigo-500/15 blur-md h-8 -translate-y-4"></div>
        </div>

        {/* CSS Keyframes for Scan animation inline support */}
        <style>{`
          @keyframes scan {
            0% { top: 0%; opacity: 0; }
            5% { opacity: 0.8; }
            95% { opacity: 0.8; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>

        {/* Document Header details */}
        <div className="space-y-4" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">LEGAL CONTRACT</span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">v2.4</span>
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none pt-2">SERVICE_AGREEMENT.pdf</h4>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit Index Category #8</p>
          </div>

          {/* Text Placeholder Lines */}
          <div className="space-y-2.5 pt-3">
            <div className="h-1.5 bg-slate-100 rounded-full w-full"></div>
            <div className="h-1.5 bg-slate-100 rounded-full w-4/5"></div>
            <div className="h-1.5 bg-slate-100 rounded-full w-11/12"></div>
            <div className="h-1.5 bg-gradient-to-r from-red-200 to-red-100 rounded-full w-3/4 relative group" title="Red warning line">
              {/* Highlight critical risks */}
              <div className="absolute -left-1 -top-1 w-3.5 h-3.5 bg-red-500/20 rounded-full animate-ping"></div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full w-6/7"></div>
            <div className="h-1.5 bg-gradient-to-r from-indigo-200 to-indigo-150 rounded-full w-2/3"></div>
          </div>
        </div>

        {/* Floating Abstract details representation */}
        <div 
          className="border-t border-slate-100 pt-4 flex items-center justify-between mt-6"
          style={{ transform: "translateZ(20px)" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest">Workspace secure</span>
          </div>
          <span className="text-[10px] font-bold text-indigo-650 flex items-center gap-0.5">
            Audit Term
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="h-3 w-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        </div>

        {/* Particle Points */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute h-1.5 w-1.5 rounded-full bg-indigo-500/30 top-1/4 left-1/3 animate-ping"></div>
          <div className="absolute h-1 w-1 rounded-full bg-indigo-500/40 bottom-1/3 right-1/4 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
