"use client";
// File: src/components/GlobalToast.tsx
import React, { useEffect } from "react";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export default function GlobalToast() {
  const { toast, hideToast } = useStore();

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  return (
    <AnimatePresence>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-55 px-4 w-full max-w-sm pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-xl transition-all duration-300 ${
              toast.type === "success"
                ? "bg-white/90 dark:bg-zinc-900/90 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : toast.type === "error"
                ? "bg-white/90 dark:bg-zinc-900/90 border-red-500/20 text-red-650 dark:text-red-400"
                : "bg-white/90 dark:bg-zinc-900/90 border-purple-500/20 text-purple-650 dark:text-purple-400"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-purple-500 dark:text-purple-450 shrink-0" />
            )}

            <span className="text-xs font-semibold leading-relaxed tracking-tight text-gray-800 dark:text-zinc-200 flex-1">
              {toast.message}
            </span>

            <button
              onClick={hideToast}
              className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-gray-650 dark:hover:text-zinc-300 transition-colors"
              aria-label="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
