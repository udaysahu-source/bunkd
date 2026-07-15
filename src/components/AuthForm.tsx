"use client";
// File: src/components/AuthForm.tsx
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Mail, AlertCircle, RefreshCw, User, Eye, EyeOff, Check, X } from "lucide-react";
import FirebaseSetupGuide from "./FirebaseSetupGuide";

export default function AuthForm() {
  const { user, isFirebaseConfigured, showToast } = useStore();
  const router = useRouter();

  // Standard Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown Timer Effect for Password Reset Resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setEmailError(null);
    setPasswordError(null);
    setError(null);
  };

  const validateInputs = () => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setError(null);

    // Offline check
    if (typeof window !== "undefined" && !navigator.onLine) {
      setError("You appear to be offline. Please check your internet connection.");
      showToast("You appear to be offline. Please check your internet connection.", "error");
      return false;
    }

    if (!email.trim()) {
      setEmailError("Please enter your email address.");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Please enter a valid email address (e.g., name@domain.com).");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Please enter your password.");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    setError(null);

    if (!auth) {
      setError("Authentication service is not configured.");
      showToast("Authentication service is not configured.", "error");
      setLoading(false);
      return;
    }

    try {
      // Set persistence based on "Remember Me"
      await setPersistence(
        auth, 
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Account created successfully! Welcome to Bunkd.", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Logged in successfully! Welcome back.", "success");
      }
      router.replace("/");
    } catch (err) {
      console.error(err);
      const errorVal = err as Error & { code?: string };
      let friendlyMessage = "Authentication failed. Please try again.";

      if (errorVal.code === "auth/invalid-credential" || errorVal.code === "auth/user-not-found" || errorVal.code === "auth/wrong-password") {
        friendlyMessage = "Incorrect email or password.";
      } else if (errorVal.code === "auth/email-already-in-use") {
        friendlyMessage = "An account already exists with this email.";
      } else if (errorVal.code === "auth/weak-password") {
        friendlyMessage = "Password should be at least 6 characters.";
      } else if (errorVal.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (errorVal.code === "auth/user-disabled") {
        friendlyMessage = "This account has been disabled. Please contact support.";
      } else if (errorVal.code === "auth/network-request-failed") {
        friendlyMessage = "Network error. Please check your internet connection.";
      }

      setError(friendlyMessage);
      showToast(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);

    if (typeof window !== "undefined" && !navigator.onLine) {
      setError("You appear to be offline. Guest Mode requires a connection to initialize.");
      showToast("You appear to be offline.", "error");
      setLoading(false);
      return;
    }

    if (!auth) {
      setError("Authentication service is not configured.");
      showToast("Authentication service is not configured.", "error");
      setLoading(false);
      return;
    }

    try {
      // Guest mode session persistence
      await setPersistence(auth, browserSessionPersistence);
      await signInAnonymously(auth);
      showToast("Logged in as guest. Your data will be stored locally.", "info");
      router.replace("/");
    } catch (err) {
      console.error(err);
      setError("Failed to log in as guest. Please try again.");
      showToast("Failed to log in as guest.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password Submit Handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotEmailError(null);

    if (typeof window !== "undefined" && !navigator.onLine) {
      setForgotEmailError("You appear to be offline.");
      return;
    }

    if (!forgotEmail.trim()) {
      setForgotEmailError("Please enter your email address.");
      return;
    } else if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      setForgotEmailError("Please enter a valid email address.");
      return;
    }

    if (!auth) {
      setForgotEmailError("Authentication service is not configured.");
      return;
    }

    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSuccess(true);
      setResendCooldown(30);
      showToast("Password reset link sent successfully.", "success");
    } catch (err) {
      console.error(err);
      const errorVal = err as Error & { code?: string };
      let friendlyMessage = "Failed to send reset link. Please try again.";
      if (errorVal.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      } else if (errorVal.code === "auth/user-not-found") {
        friendlyMessage = "No account found with this email address.";
      }
      setForgotEmailError(friendlyMessage);
    } finally {
      setForgotLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(email); // Autofill with current email field input if any
    setForgotEmailError(null);
    setForgotSuccess(false);
    setShowForgotModal(true);
  };

  if (!isFirebaseConfigured) {
    return <FirebaseSetupGuide />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-bunkd-bg-dark p-4 transition-colors duration-300 relative overflow-hidden">
      {/* Decorative premium ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/5 dark:bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-purple-600/5 dark:bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.02)_0,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark shadow-2xl rounded-3xl p-8 flex flex-col items-center relative z-10 overflow-hidden"
      >
        <motion.div
          animate={{ scale: [0.95, 1] }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center text-center"
        >
          {/* Bunkd Logo */}
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-350" />
            <span className="text-3xl font-extrabold text-white tracking-tighter relative z-10">B</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent dark:to-zinc-400">
            Bunkd
          </h1>
          <p className="text-sm font-semibold tracking-wide text-purple-600 dark:text-purple-400 mt-1">
            Track Smart. Bunk Safe.
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-3 font-medium">
            {isSignUp ? "Create your account to start skipping safely" : "Sign in to access your dashboard"}
          </p>
        </motion.div>

        <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
          {/* Email Address Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2 pl-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="you@domain.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-bunkd-bg-dark/50 border focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-gray-900 dark:text-white text-sm transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 ${
                  emailError 
                    ? "border-red-500 dark:border-red-500/50" 
                    : "border-gray-200/50 dark:border-bunkd-border-dark"
                }`}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
              />
            </div>
            <AnimatePresence>
              {emailError && (
                <motion.p
                  id="email-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 dark:text-red-400 text-xs font-semibold mt-1.5 pl-1 flex items-center gap-1 overflow-hidden"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2 pl-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 rounded-xl bg-gray-50 dark:bg-bunkd-bg-dark/50 border focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-gray-900 dark:text-white text-sm transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-zinc-600 ${
                  passwordError 
                    ? "border-red-500 dark:border-red-500/50" 
                    : "border-gray-200/50 dark:border-bunkd-border-dark"
                }`}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={showPassword ? "visible" : "hidden"}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.div>
                </AnimatePresence>
              </button>
            </div>
            <AnimatePresence>
              {passwordError && (
                <motion.p
                  id="password-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-500 dark:text-red-400 text-xs font-semibold mt-1.5 pl-1 flex items-center gap-1 overflow-hidden"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pl-1 pt-1 select-none">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                  rememberMe 
                    ? "bg-purple-600 border-purple-600 dark:bg-purple-500 dark:border-purple-500" 
                    : "border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-bunkd-bg-dark"
                }`}>
                  <AnimatePresence>
                    {rememberMe && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.1 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors">
                Remember Me
              </span>
            </label>
          </div>

          {/* Main Error Alert */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-550/10 border border-red-200/50 dark:border-red-550/20 text-red-600 dark:text-red-400 text-xs font-semibold overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-500 dark:hover:to-purple-650 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              "Create Account"
            ) : (
              "Log In"
            )}
          </motion.button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6 w-full">
            <div className="border-t border-gray-200/50 dark:border-bunkd-border-dark w-full"></div>
            <span className="absolute bg-white dark:bg-bunkd-card-dark px-3.5 text-[9px] uppercase font-extrabold tracking-widest text-gray-400 dark:text-zinc-500">Or</span>
          </div>

          {/* Guest Button */}
          <motion.button
            type="button"
            onClick={handleGuestLogin}
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 bg-gray-150/40 hover:bg-gray-150/80 dark:bg-bunkd-bg-dark dark:hover:bg-bunkd-bg-secondary-dark/60 text-gray-800 dark:text-zinc-300 font-bold rounded-xl border border-gray-200/50 dark:border-bunkd-border-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <User className="w-4 h-4 text-purple-500" />
            <span>Continue as Guest</span>
          </motion.button>
        </form>

        {/* Forgot Password Button */}
        {!isSignUp && (
          <motion.button
            type="button"
            onClick={openForgotModal}
            whileHover={{ scale: 1.02 }}
            className="text-xs text-gray-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors mt-6 font-bold"
          >
            Forgot Password?
          </motion.button>
        )}

        {/* Toggle sign in / sign up */}
        <motion.button
          onClick={handleToggleMode}
          whileHover={{ scale: 1.02 }}
          className="text-xs text-gray-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-400 transition-colors mt-4 font-bold"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </motion.button>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!forgotLoading) setShowForgotModal(false);
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-sm bg-white dark:bg-bunkd-card-dark border border-gray-200/50 dark:border-bunkd-border-dark shadow-2xl rounded-3xl p-7 flex flex-col z-10"
            >
              {/* Close Button */}
              <button
                type="button"
                disabled={forgotLoading}
                onClick={() => setShowForgotModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-gray-400 hover:text-gray-650 hover:bg-gray-150/40 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Reset Password
              </h2>
              <p className="text-xs text-gray-650 dark:text-gray-400 mt-2 leading-relaxed font-medium">
                Enter your email address below. We'll send you a secure link to reset your password.
              </p>

              {forgotSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-2xl flex items-center justify-center mb-4">
                    <Check className="w-5 h-5 stroke-[2.5px]" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Password reset link sent successfully. Please check your inbox.
                  </p>
                  
                  {resendCooldown > 0 ? (
                    <span className="text-[10px] text-gray-500 dark:text-gray-500 mt-4 font-semibold">
                      Resend link in {resendCooldown}s
                    </span>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={handleForgotSubmit}
                      className="text-xs text-purple-600 dark:text-purple-400 font-bold hover:underline mt-4"
                      whileTap={{ scale: 0.95 }}
                    >
                      Resend reset link
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="mt-5 space-y-4" noValidate>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2 pl-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-550" />
                      <input
                        type="email"
                        required
                        disabled={forgotLoading}
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          if (forgotEmailError) setForgotEmailError(null);
                        }}
                        placeholder="you@domain.com"
                        className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-bunkd-bg-dark/50 border focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 focus:outline-none text-gray-900 dark:text-white text-sm transition-all duration-200 placeholder:text-gray-400 dark:placeholder:text-zinc-650 ${
                          forgotEmailError 
                            ? "border-red-500 dark:border-red-500/50" 
                            : "border-gray-200/50 dark:border-bunkd-border-dark"
                        }`}
                        aria-invalid={!!forgotEmailError}
                      />
                    </div>
                    <AnimatePresence>
                      {forgotEmailError && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-red-500 dark:text-red-400 text-xs font-semibold mt-1.5 pl-1 flex items-center gap-1 overflow-hidden"
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{forgotEmailError}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={forgotLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-500 dark:hover:to-purple-650 text-white font-bold rounded-xl shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                  >
                    {forgotLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
