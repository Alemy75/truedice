"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: number;
  message: string;
  description?: string;
  variant: ToastVariant;
  /** Etherscan link or similar — rendered as small "View ↗" link at the bottom */
  link?: { href: string; label: string };
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_TIMEOUT_MS = 5_000;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after timeout (errors stay longer).
    const timeout = toast.variant === "error" ? 8_000 : DEFAULT_TIMEOUT_MS;
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeout);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="toast-stack" aria-live="polite" aria-atomic="false">
            {toasts.map((t) => (
              <ToastCard key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className={`toast toast-${toast.variant}`} role="status">
      <div className="toast-body">
        <div className="toast-title">{toast.message}</div>
        {toast.description && (
          <div className="toast-desc">{toast.description}</div>
        )}
        {toast.link && (
          <a
            className="toast-link"
            href={toast.link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {toast.link.label} ↗
          </a>
        )}
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
