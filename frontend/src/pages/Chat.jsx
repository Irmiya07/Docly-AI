import React, { useState, useRef, useEffect } from "react";
import { askQuestion } from "../api/chatApi";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

const PRESET_QUESTIONS = [
  "What is the limitation of liability in these contracts?",
  "Are there any automatic renewal clauses?",
  "What is the notice period for contract termination?",
  "Which document governs the services terms?"
];

export default function Chat() {
  const { isGuest } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: "greeting",
      role: "assistant",
      content: "Hello! I am Docly, your AI Legal Assistant. Ask me questions about the clauses, terms, or risks in your uploaded contracts.",
      citations: []
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCitationClick = (msgId) => {
    setActiveMessageId(msgId);
    setSidebarOpen(true);
  };

  const askModel = async (prompt) => {
    setIsLoading(true);
    try {
      const response = await askQuestion(prompt);
      const assistantMessage = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: response.answer || "I parsed the indexing database but couldn't locate specific references matching your inquiry.",
        citations: response.citations || []
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (assistantMessage.citations && assistantMessage.citations.length > 0) {
        setActiveMessageId(assistantMessage.id);
        setSidebarOpen(true);
      }
    } catch (error) {
      console.error(error);
      const errorMessage = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: "Error: I encountered a failure querying the server. Please verify your backend server is active.",
        isError: true,
        citations: []
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    // Add User Message
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: userText
    };

    setMessages((prev) => [...prev, userMessage]);
    await askModel(userText);
  };

  const handleRegenerate = async () => {
    if (isLoading) return;
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return;

    const lastPrompt = userMessages[userMessages.length - 1].content;

    // Pop the last assistant message
    setMessages((prev) => {
      const truncated = [...prev];
      if (truncated[truncated.length - 1].role === "assistant") {
        truncated.pop();
      }
      return truncated;
    });

    await askModel(lastPrompt);
  };

  const parseInlineMarkdown = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-gray-905">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="bg-gray-100 border border-gray-200 text-red-650 font-mono text-xs px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-bold text-gray-900 mt-2 mb-1">{line.substring(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-extrabold text-gray-900 mt-3 mb-1.5">{line.substring(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-lg font-black text-gray-950 mt-4 mb-2">{line.substring(2)}</h2>;
      }

      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <ul key={idx} className="list-disc pl-5 my-1 text-sm text-gray-700">
            <li>{parseInlineMarkdown(line.substring(2))}</li>
          </ul>
        );
      }

      if (/^\d+\.\s/.test(line)) {
        const dotIndex = line.indexOf(". ") + 2;
        return (
          <ol key={idx} className="list-decimal pl-5 my-1 text-sm text-gray-700">
            <li>{parseInlineMarkdown(line.substring(dotIndex))}</li>
          </ol>
        );
      }

      if (line.trim() === "") return <div key={idx} className="h-2"></div>;
      return <p key={idx} className="text-sm text-gray-700 leading-relaxed mb-1.5">{parseInlineMarkdown(line)}</p>;
    });
  };

  const activeMessage = messages.find((m) => m.id === activeMessageId);
  const activeCitations = activeMessage?.citations || [];
  const canRegenerate = messages.length > 1 && !isLoading;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-3xl border border-gray-100 bg-white shadow-xs overflow-hidden">
      
      {/* Sidebar Threads (Left) */}
      <div className="w-80 border-r border-gray-100 p-6 flex flex-col justify-between hidden md:flex">
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-gray-900">AI Assistant Guidelines</h3>
            <p className="text-xs text-gray-400 mt-1">
              Ask queries about liability caps, governing laws, milestones, indemnity, or force majeure.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Suggested Queries</h4>
            <div className="space-y-2">
              {PRESET_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left p-3 rounded-xl border border-gray-100 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all text-ellipsis overflow-hidden cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex gap-2.5 items-center">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          <span className="text-xs font-semibold text-gray-500">FastAPI Agent Online</span>
        </div>
      </div>

      {/* Main Chat Screen (Middle/Right) */}
      <div className="flex-1 flex flex-col justify-between bg-gray-50/30">
        
        {/* Guest Session Banner Warning */}
        {isGuest && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex items-center justify-between text-xs text-amber-800 font-semibold select-none shrink-0">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Guest Session Workspace - uploaded files will be removed on refresh or sign out.</span>
            </div>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          {messages.map((message, index) => {
            const isUser = message.role === "user";
            const isLastMessage = index === messages.length - 1;

            return (
              <div
                key={message.id}
                className={`flex gap-4 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm ${
                  isUser ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-white border border-gray-100 text-blue-600"
                }`}>
                  {isUser ? "U" : "AI"}
                </div>

                {/* Bubble content */}
                <div className="space-y-1.5 max-w-xl">
                  <div className={`p-4 rounded-2xl shadow-xs text-sm leading-relaxed relative group ${
                    isUser
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : message.isError
                      ? "bg-red-50 border border-red-100 text-red-700 rounded-tl-none"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                  }`}>
                    {isUser ? (
                      <p className="whitespace-pre-line">{message.content}</p>
                    ) : (
                      <div className="markdown-body">
                        {renderMarkdown(message.content)}
                      </div>
                    )}
                    
                    {/* Render Inline Citation Pills */}
                    {!isUser && message.citations && message.citations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-gray-400 font-bold block">Sources:</span>
                        {message.citations.map((cit, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCitationClick(message.id)}
                            className="bg-blue-50/80 hover:bg-blue-105 border border-blue-100 text-blue-700 font-semibold text-[10px] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                          >
                            [{idx + 1}] {cit.source.split("/").pop().split("\\").pop()}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Copy and Regenerate overlay controls on AI bubble hover */}
                    {!isUser && !message.isError && (
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-blue-600 rounded-lg p-1 text-gray-400 cursor-pointer shadow-xs transition-colors"
                          title="Copy content"
                        >
                          {copiedId === message.id ? (
                            <span className="text-[9px] font-bold px-1 text-emerald-600">Copied!</span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.25m1.5-.75h9.75c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H6.75a1.125 1.125 0 0 1-1.125-1.125V3.75m0 0A1.125 1.125 0 0 1 6.75 2.625h6.5A1.125 1.125 0 0 1 14.25 3.75v3" />
                            </svg>
                          )}
                        </button>
                        {isLastMessage && canRegenerate && (
                          <button
                            onClick={handleRegenerate}
                            className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:text-blue-600 rounded-lg p-1 text-gray-400 cursor-pointer shadow-xs transition-colors animate-pulse"
                            title="Regenerate answer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] text-gray-400 font-medium px-1 block ${isUser ? "text-right" : "text-left"}`}>
                    {isUser ? "Sent" : "AI Model"}
                  </span>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-4 max-w-3xl mr-auto">
              <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center font-bold text-sm bg-white border border-gray-100 text-blue-600">
                AI
              </div>
              <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-xs rounded-tl-none">
                <div className="flex gap-1.5 items-center">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase animate-pulse">Formulating answer</span>
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 bg-white flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type a legal query (e.g. 'Summarize termination requirements')..."
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-gray-100 disabled:text-gray-400 px-5 py-3 text-white font-bold text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            Ask AI
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>

      {/* Citations Pane (Right) */}
      {sidebarOpen && activeCitations.length > 0 && (
        <div className="w-80 border-l border-gray-100 p-6 flex flex-col justify-between h-full bg-white relative animate-slide-in shrink-0">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900">Citations & References</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-gray-900 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-16rem)] pr-1">
              {activeCitations.map((c, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 uppercase">Source [{idx + 1}]</span>
                    <span className="text-[10px] font-semibold text-gray-400">Page {c.page || "N/A"}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 truncate">
                    {c.source.split("/").pop().split("\\").pop()}
                  </h4>
                  <p className="text-xs text-gray-500 italic leading-relaxed border-l-2 border-blue-400 pl-2">
                    "{c.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
