import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = {
    success: (description: string, title?: string) =>
      addToast({ title, description, variant: "success" }),
    error: (description: string, title?: string) =>
      addToast({ title, description, variant: "destructive" }),
    warning: (description: string, title?: string) =>
      addToast({ title, description, variant: "warning" }),
    info: (description: string, title?: string) =>
      addToast({ title, description, variant: "info" }),
    default: (description: string, title?: string) =>
      addToast({ title, description, variant: "default" }),
  };

  return {
    toasts,
    toast,
    removeToast,
  };
}
