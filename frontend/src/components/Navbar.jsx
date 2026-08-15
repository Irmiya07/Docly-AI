
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onToggleSidebar }) {
  const { user, isGuest, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return "LC";
    return name
      .split(/[\s_-]+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-100 bg-white px-4 md:px-6 shadow-xs">
      
      {/* Brand & Left Burger Toggle Menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-xl border border-gray-100 md:hidden block focus:outline-none transition-colors"
          aria-label="Toggle Navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200 shrink-0">
            <img src="./src/assets/artificial-intelligence.png" alt="Docly Logo" className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-gray-900 text-base md:text-lg tracking-tight leading-none">Docly</span>
            {isGuest ? (
              <span className="rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-700 uppercase tracking-wider scale-90">
                Guest Mode
              </span>
            ) : (
              <span className="rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider scale-90">
                Workspace
              </span>
            )}
          </div>
        </div>
      </div>

      {/* User Information & Logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right leading-tight">
              <div className="flex items-center gap-1.5 justify-end">
                <p className="text-xs font-bold text-gray-900 truncate max-w-28 capitalize">{user.username}</p>
              </div>
              <p className="text-[10px] text-gray-400 font-medium truncate max-w-40">{user.email}</p>
            </div>
            
            {/* Avatar Initials Bubble */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50/80 border border-blue-100 font-bold text-blue-700 text-xs shadow-xs shrink-0 select-none uppercase">
              {getInitials(user.username)}
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="text-gray-400 hover:text-red-650 hover:bg-red-50 p-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4.5 w-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6.75 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

