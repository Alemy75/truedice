"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * Shared modal shell using `.modal-backdrop` + `.modal` CSS classes
 * from app/globals.css (mirrors the original Claude Design dice mockup behaviour).
 *
 * Renders via React Portal to <body> so the modal escapes any ancestor
 * containing block. The nav has `backdrop-filter: blur(5px)` which
 * creates a containing block for fixed-positioned descendants — without
 * the portal, `.modal-backdrop { position: fixed }` would be anchored
 * to the nav instead of the viewport.
 *
 * - Backdrop click → close
 * - ESC → close
 * - Body scroll locked while open
 */
export function Modal({ open, onClose, ariaLabel, children }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`modal-backdrop ${open ? "open" : ""}`}
      onClick={(e) => {
        // Close only when the click ends on the backdrop itself, not on the
        // modal box or any descendant. Using onClick (not onMouseDown) so a
        // text-selection drag that starts in the input and ends outside the
        // modal doesn't accidentally close it.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden={!open}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
