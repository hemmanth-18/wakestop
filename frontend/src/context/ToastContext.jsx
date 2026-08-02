import { createContext, useContext, useState, useCallback } from "react";
import { CheckIcon, AlertIcon } from "../components/Icons";

const ToastContext = createContext(undefined);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl border transition-all transform animate-bounce-short cursor-pointer ${
              toast.type === "error"
                ? "bg-night-950/95 border-alert-500 text-alert-500 shadow-[0_0_20px_rgba(255,46,85,0.25)]"
                : "bg-night-950/95 border-neon-cyan text-white shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold ${
                toast.type === "error" ? "bg-alert-500/20 text-alert-500" : "bg-neon-cyan/20 text-neon-cyan"
              }`}
            >
              {toast.type === "error" ? <AlertIcon size={18} /> : <CheckIcon size={18} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                {toast.type === "error" ? "Notification Error" : "Success"}
              </p>
              <p className="mt-0.5 text-xs sm:text-sm font-medium leading-snug break-words">
                {toast.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
