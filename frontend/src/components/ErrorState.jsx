
export default function ErrorState({ title = "Something went wrong", message = "An error occurred while loading this section.", onRetry, retryLabel = "Try Again" }) {
  const renderMessage = (msg) => {
    if (!msg) return "";
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) {
      return msg.map((item, idx) => (
        <span key={idx} className="block mt-1 first:mt-0 font-medium">
          {typeof item === "object"
            ? (item.msg || `${item.loc?.join(".") || "field"}: ${item.msg}` || JSON.stringify(item))
            : String(item)}
        </span>
      ));
    }
    if (typeof msg === "object") {
      if (msg.msg) return msg.msg;
      if (msg.detail) {
        return typeof msg.detail === "object" ? JSON.stringify(msg.detail) : String(msg.detail);
      }
      return JSON.stringify(msg);
    }
    return String(msg);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-red-100 rounded-2xl bg-red-50/30 max-w-md mx-auto my-6">
      <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      <div className="mt-1 text-sm text-red-750 max-w-xs">{renderMessage(message)}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
// Fix typo: make sure onRetry trigger works without referencing undefined onAction
