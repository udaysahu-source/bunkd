"use client";
// File: src/components/FirebaseSetupGuide.tsx
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Terminal, HelpCircle } from "lucide-react";

export default function FirebaseSetupGuide() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xl rounded-3xl p-8 flex flex-col items-center"
      >
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/20 text-amber-600 dark:text-amber-500 rounded-2xl flex items-center justify-center mb-5 shadow-xs">
          <AlertCircle className="w-6 h-6" />
        </div>
        
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white text-center">
          Firebase Setup Required
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center leading-relaxed">
          Bunkd is powered by Firebase for secure authentication and offline-first database synchronization.
        </p>

        <div className="w-full mt-6 space-y-4 text-xs">
          <div className="bg-zinc-100 dark:bg-zinc-850 p-4 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30 space-y-3">
            <span className="font-bold text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Configure Environment:
            </span>
            <ol className="list-decimal list-inside space-y-2.5 pl-1 text-zinc-600 dark:text-zinc-400 font-medium">
              <li>
                Create a <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-300">.env</code> file in your project root:
                <div className="mt-1 pl-4 text-xs text-zinc-400">
                  You can duplicate the <code className="font-semibold text-zinc-500">.env.template</code> file.
                </div>
              </li>
              <li>
                Fill in your web client credentials from your Firebase Console.
              </li>
              <li>
                Restart your local dev server:
                <div className="mt-1 pl-4">
                  Run <code className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-300">npm run dev</code> in the terminal.
                </div>
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 bg-zinc-50 dark:bg-zinc-850/50 rounded-xl border border-zinc-200/20 dark:border-zinc-700/10 text-zinc-450 dark:text-zinc-500 text-xs leading-relaxed">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              If you already created the `.env` file, please make sure the variables are prefixed with `NEXT_PUBLIC_` (e.g. `NEXT_PUBLIC_FIREBASE_API_KEY`) so they are exposed to the client bundle.
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
