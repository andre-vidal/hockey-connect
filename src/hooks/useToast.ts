"use client";

import { useState, useCallback } from "react";

type ToastVariant = "default" | "destructive" | "success";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

let toastId = 0;

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function dispatch(action: { type: "add" | "remove"; toast?: Toast; id?: string }) {
  if (action.type === "add" && action.toast) {
    toasts = [...toasts, action.toast];
  } else if (action.type === "remove" && action.id) {
    toasts = toasts.filter((t) => t.id !== action.id);
  }
  listeners.forEach((l) => l(toasts));
}

export function toast({ title, description, variant = "default" }: Omit<Toast, "id">) {
  const id = String(++toastId);
  dispatch({ type: "add", toast: { id, title, description, variant } });
  setTimeout(() => dispatch({ type: "remove", id }), 5000);
}

export function useToast() {
  const [currentToasts, setToasts] = useState<Toast[]>(toasts);

  const subscribe = useCallback(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  useState(subscribe);

  return { toasts: currentToasts, toast };
}
