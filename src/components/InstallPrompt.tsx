"use client";
// File: src/components/InstallPrompt.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setTimeout(() => {
        setIsInstalled(true);
      }, 0);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 left-4 right-4 max-w-sm mx-auto bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark rounded-2xl shadow-xl p-4 z-50 sm:top-6 sm:left-6 sm:right-6"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex-shrink-0 mt-0.5"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                <Download className="w-5 h-5 text-white" />
              </div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Install Bunkd
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Get quick access to track your attendance
              </p>
            </div>

            <motion.button
              onClick={handleDismiss}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-bunkd-bg-dark transition-all"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="flex gap-2 mt-3 sm:gap-3">
            <motion.button
              onClick={handleDismiss}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-bunkd-bg-dark hover:bg-gray-200 dark:hover:bg-bunkd-bg-secondary-dark rounded-lg transition-all"
            >
              Not Now
            </motion.button>
            <motion.button
              onClick={handleInstall}
              whileTap={{ scale: 0.95 }}
              className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg shadow-md transition-all flex items-center justify-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
