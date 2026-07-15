"use client";
// File: src/app/login/page.tsx
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../../store/useStore";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const AuthForm = dynamic(() => import("@/components/AuthForm"), { ssr: false });

export default function LoginPage() {
  const { user, authLoading, isFirebaseConfigured, initialize } = useStore();
  const router = useRouter();

  useEffect(() => {
    const cleanup = initialize();
    return () => cleanup();
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && user && isFirebaseConfigured) {
      console.log("login/page.tsx: User authenticated, redirecting to /");
      router.replace("/");
    }
  }, [user, authLoading, isFirebaseConfigured, router]);

  if (authLoading || (user && isFirebaseConfigured)) {
    return (
      <div className="min-h-screen bg-white dark:bg-bunkd-bg-dark flex flex-col items-center justify-center transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.95, 1, 0.95], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <div className="w-5 h-5 bg-white rounded-lg" />
          </motion.div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"
          >
            Verifying Session
          </motion.span>
        </motion.div>
      </div>
    );
  }

  return <AuthForm />;
}
