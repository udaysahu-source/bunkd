"use client";
// File: src/app/promo/page.tsx
import React, { useEffect, useState, useRef } from "react";
import { useStore } from "@/store/useStore";
import Dashboard from "@/components/Dashboard";
import Calendar from "@/components/Calendar";
import Settings from "@/components/Settings";
import { LayoutDashboard, CalendarDays, Settings as SettingsIcon } from "lucide-react";
import gsap from "gsap";

// Setup types for window and document elements
declare global {
  interface Window {
    __promoTimeline?: gsap.core.Timeline;
  }
}

export default function PromoPage() {
  const [activeView, setActiveView] = useState<"dashboard" | "calendar" | "settings">("dashboard");
  const [showLogoScreen, setShowLogoScreen] = useState(true);
  const [showEndScreen, setShowEndScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const logoScreenRef = useRef<HTMLDivElement>(null);
  const endScreenRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const particles = React.useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      size: (i * 7 % 3) + 1,
      left: (i * 17) % 100,
      top: (i * 23) % 100,
      delay: (i * 3) % 10,
      duration: (i * 5 % 15) + 10,
    }));
  }, []);

  // Setup Responsive 16:9 scaling
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const targetWidth = 1920;
      const targetHeight = 1080;
      const scaleX = window.innerWidth / targetWidth;
      const scaleY = window.innerHeight / targetHeight;
      const scale = Math.min(scaleX, scaleY);
      containerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Initialize Store with Showcase Mock Data and Actions
  useEffect(() => {
    // Generate dates: 18 days ago up to yesterday
    const mockRecords = [];
    const startOffset = 18;
    for (let i = startOffset; i > 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const docId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      mockRecords.push({
        id: docId,
        dateTimestamp: d.getTime(),
        attendedLectures: 2,
        totalLectures: 2,
        isHoliday: false,
      });
    }

    const mockMetrics = {
      attended: 36,
      total: 36,
      percentage: 100.0,
      safeBunks: 12,
      neededLectures: 0,
    };

    // Override the store state
    useStore.setState({
      isInitialized: true,
      authLoading: false,
      settingsLoading: false,
      recordsLoading: false,
      isFirebaseConfigured: true,
      user: {
        email: "showcase@bunkd.app",
        uid: "showcase-uid",
        isAnonymous: false,
      } as unknown as import("firebase/auth").User,
      settings: {
        cycleStartDay: 1,
        targetPercentage: 75,
      },
      records: mockRecords,
      overallMetrics: mockMetrics,
      cycleMetrics: mockMetrics,
      
      // Override store actions so they run local-only mock updates
      initialize: () => () => {},
      updateSettings: async (cycleStartDay, targetPercentage) => {
        const attended = 36;
        const total = 36;
        const safeBunks = Math.floor((100 * attended - targetPercentage * total) / targetPercentage);
        const updatedMetrics = {
          attended,
          total,
          percentage: 100.0,
          safeBunks: safeBunks < 0 ? 0 : safeBunks,
          neededLectures: 0,
        };

        useStore.setState({
          settings: { cycleStartDay, targetPercentage },
          overallMetrics: updatedMetrics,
          cycleMetrics: updatedMetrics,
        });
      },
      logAttendance: async (date, attended, total, isHoliday) => {
        // Mock logging locally
        const state = useStore.getState();
        const docId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const newRecord = {
          id: docId,
          dateTimestamp: date.getTime(),
          attendedLectures: isHoliday ? 0 : attended,
          totalLectures: isHoliday ? 0 : total,
          isHoliday,
        };
        const updatedRecords = [...state.records.filter(r => r.id !== docId), newRecord];
        updatedRecords.sort((a, b) => a.dateTimestamp - b.dateTimestamp);

        // Recalculate
        const target = state.settings?.targetPercentage ?? 75;
        const activeRecords = updatedRecords.filter(r => !r.isHoliday);
        let totalAttended = 0;
        let totalTotal = 0;
        for (const r of activeRecords) {
          totalAttended += r.attendedLectures;
          totalTotal += r.totalLectures;
        }
        const percentage = totalTotal === 0 ? 0.0 : Math.round((totalAttended / totalTotal) * 10000) / 100;
        const safeBunks = totalTotal === 0 ? 0 : Math.floor((100 * totalAttended - target * totalTotal) / target);
        const newMetrics = {
          attended: totalAttended,
          total: totalTotal,
          percentage,
          safeBunks: safeBunks < 0 ? 0 : safeBunks,
          neededLectures: 0,
        };

        useStore.setState({
          records: updatedRecords,
          overallMetrics: newMetrics,
          cycleMetrics: newMetrics,
        });
      },
      toggleHoliday: async (date) => {
        // Mock toggling holiday status locally
        const state = useStore.getState();
        const docId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const existing = state.records.find(r => r.id === docId);

        let updatedRecord;
        if (existing) {
          updatedRecord = {
            ...existing,
            isHoliday: !existing.isHoliday,
            attendedLectures: !existing.isHoliday ? 0 : 2,
            totalLectures: !existing.isHoliday ? 0 : 2,
          };
        } else {
          updatedRecord = {
            id: docId,
            dateTimestamp: date.getTime(),
            attendedLectures: 0,
            totalLectures: 0,
            isHoliday: true,
          };
        }

        const updatedRecords = state.records.map(r => r.id === docId ? updatedRecord : r);
        
        // Recalculate metrics
        const target = state.settings?.targetPercentage ?? 75;
        const activeRecords = updatedRecords.filter(r => !r.isHoliday);
        let totalAttended = 0;
        let totalTotal = 0;
        for (const r of activeRecords) {
          totalAttended += r.attendedLectures;
          totalTotal += r.totalLectures;
        }
        const percentage = totalTotal === 0 ? 0.0 : Math.round((totalAttended / totalTotal) * 10000) / 100;
        const safeBunks = totalTotal === 0 ? 0 : Math.floor((100 * totalAttended - target * totalTotal) / target);
        const newMetrics = {
          attended: totalAttended,
          total: totalTotal,
          percentage,
          safeBunks: safeBunks < 0 ? 0 : safeBunks,
          neededLectures: 0,
        };

        useStore.setState({
          records: updatedRecords,
          overallMetrics: newMetrics,
          cycleMetrics: newMetrics,
        });
      },
      deleteRecord: async () => {},
    });
  }, []);

  // GSAP Cinematic Timeline Orchestra
  useEffect(() => {
    if (!cameraRef.current || !phoneRef.current) return;

    // Timeline Setup
    const timeline = gsap.timeline({
      onUpdate: () => {
        if (progressBarRef.current) {
          progressBarRef.current.style.width = `${timeline.progress() * 100}%`;
        }
      }
    });

    // Make timeline globally referenceable for debug/interaction
    window.__promoTimeline = timeline;

    // ──────────────────────────────────────────
    // INITIAL STATE
    // ──────────────────────────────────────────
    timeline.set(logoScreenRef.current, { opacity: 0, scale: 0.95 });
    timeline.set(endScreenRef.current, { opacity: 0, scale: 0.95 });
    timeline.set(phoneRef.current, { opacity: 0, scale: 0.3, z: -500 });
    timeline.set(cameraRef.current, {
      "--cam-x": "0px",
      "--cam-y": "0px",
      "--cam-z": "-300px",
      "--cam-rx": "20deg",
      "--cam-ry": "-35deg",
      "--cam-rz": "0deg",
      "--cam-blur": "6px",
    });

    // ──────────────────────────────────────────
    // PHASE 1: 0–2 s (Logo Intro)
    // ──────────────────────────────────────────
    timeline
      .to(logoScreenRef.current, { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" })
      .to({}, { duration: 1.2 }) // Hold logo screen
      .to(logoScreenRef.current, { opacity: 0, scale: 1.05, duration: 0.6, ease: "power2.inOut" })
      .call(() => setShowLogoScreen(false));

    // ──────────────────────────────────────────
    // PHASE 2: 2–5 s (Dashboard App Intro & Phone Floating)
    // ──────────────────────────────────────────
    timeline
      .to(phoneRef.current, { opacity: 1, scale: 0.95, duration: 1.5, ease: "power3.out" }, "-=0.3")
      .to(cameraRef.current, {
        "--cam-z": "-50px",
        "--cam-rx": "12deg",
        "--cam-ry": "-18deg",
        "--cam-blur": "0px",
        duration: 2.2,
        ease: "power2.out",
      }, "-=1.5");

    // ──────────────────────────────────────────
    // PHASE 3: 5–8 s (Macro zoom on Attendance Ring & entries)
    // ──────────────────────────────────────────
    timeline
      .to(cameraRef.current, {
        "--cam-x": "-40px",
        "--cam-y": "100px",
        "--cam-z": "200px",
        "--cam-rx": "15deg",
        "--cam-ry": "8deg",
        duration: 3.0,
        ease: "power3.inOut",
      });

    // ──────────────────────────────────────────
    // PHASE 4: 8–11 s (Calendar Day Selection & Holiday Modal)
    // ──────────────────────────────────────────
    timeline
      .call(() => {
        // Transition to Calendar
        setActiveView("calendar");
      })
      .to(cameraRef.current, {
        "--cam-x": "0px",
        "--cam-y": "-10px",
        "--cam-z": "50px",
        "--cam-rx": "6deg",
        "--cam-ry": "0deg",
        duration: 1.2,
        ease: "power2.out",
      })
      .call(() => {
        // Auto select a calendar day programmatically after tab opens
        setTimeout(() => {
          // Find button matching 15th of the month
          const gridButtons = Array.from(document.querySelectorAll("button.aspect-square")) as HTMLButtonElement[];
          const targetDayBtn = gridButtons.find(btn => {
            const span = btn.querySelector("span");
            return span && span.textContent?.trim() === "15";
          });
          if (targetDayBtn) {
            targetDayBtn.click();
            
            // Toggle the Holiday switch in the modal
            setTimeout(() => {
              const checkbox = document.querySelector("input[type='checkbox']") as HTMLInputElement | null;
              if (checkbox) {
                checkbox.click();
                
                // Close modal after change propagates
                setTimeout(() => {
                  const saveBtn = document.querySelector("form button[type='submit']") as HTMLButtonElement | null;
                  if (saveBtn) {
                    saveBtn.click();
                  } else {
                    // fallback modal close
                    const closeBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("✕")) as HTMLButtonElement | undefined;
                    if (closeBtn) closeBtn.click();
                  }
                }, 850);
              }
            }, 850);
          }
        }, 300);
      })
      .to({}, { duration: 2.2 }); // Hold for modal interaction

    // ──────────────────────────────────────────
    // PHASE 5: 11–14 s (Settings Target Percentage Adjustment)
    // ──────────────────────────────────────────
    timeline
      .call(() => {
        setActiveView("settings");
      })
      .to(cameraRef.current, {
        "--cam-x": "20px",
        "--cam-y": "-80px",
        "--cam-z": "100px",
        "--cam-rx": "14deg",
        "--cam-ry": "-14deg",
        duration: 1.2,
        ease: "power2.inOut",
      })
      .call(() => {
        setTimeout(() => {
          // Select settings target input
          const targetInput = document.querySelector("input[type='number']");
          if (targetInput) {
            (targetInput as HTMLInputElement).value = "80";
            targetInput.dispatchEvent(new Event("input", { bubbles: true }));
            targetInput.dispatchEvent(new Event("change", { bubbles: true }));

            // Save settings
            setTimeout(() => {
              const saveBtn = Array.from(document.querySelectorAll("button")).find(
                b => b.textContent?.includes("Save Preferences")
              );
              if (saveBtn) {
                (saveBtn as HTMLButtonElement).click();

                // Swap back to dashboard to witness metrics recalculating
                setTimeout(() => {
                  setActiveView("dashboard");
                }, 1000);
              }
            }, 600);
          }
        }, 400);
      })
      .to({}, { duration: 2.2 }); // Hold settings interactions

    // ──────────────────────────────────────────
    // PHASE 6: 14–18 s (Phone rotate flat, Tags and Outro)
    // ──────────────────────────────────────────
    timeline
      .call(() => {
        setShowEndScreen(true);
      })
      .to(cameraRef.current, {
        "--cam-x": "-220px",
        "--cam-y": "0px",
        "--cam-z": "-80px",
        "--cam-rx": "0deg",
        "--cam-ry": "0deg",
        "--cam-rz": "0deg",
        duration: 1.5,
        ease: "power3.inOut",
      })
      .to(endScreenRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1.0,
        ease: "power2.out",
      }, "-=0.8")
      .to({}, { duration: 2.0 }) // Hold outro info
      .to(phoneRef.current, { opacity: 0, scale: 0.9, duration: 0.6, ease: "power2.in" })
      .to(endScreenRef.current, { opacity: 0, scale: 0.95, duration: 0.6, ease: "power2.in" }, "-=0.6");

    return () => {
      timeline.kill();
    };
  }, []);

  // Helper renderer
  const renderComponent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "calendar":
        return <Calendar />;
      case "settings":
        return <Settings />;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#020205] text-white flex items-center justify-center overflow-hidden relative select-none">
      {/* Dynamic Studio background grids & glowing radial orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Animated main glowing orb */}
        <div className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-purple-600/20 to-violet-900/10 blur-[130px] rounded-full animate-pulse duration-[8000ms]" />
        
        {/* Rim lighting backdrops */}
        <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-500/[0.04] blur-[110px] rounded-full" />
        <div className="absolute top-[-100px] left-[20%] w-[600px] h-[600px] bg-purple-500/[0.05] blur-[120px] rounded-full" />

        {/* Elegant mesh grid dots overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_#020205_80%),_linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(255,255,255,0.015)_1px,_transparent_1px)] bg-[size:100%_100%,_48px_48px,_48px_48px] opacity-75" />

        {/* CSS Floating studio particles */}
        {particles.map((pt) => (
          <div
            key={pt.id}
            className="absolute bg-purple-400 rounded-full pointer-events-none opacity-0"
            style={{
              width: `${pt.size}px`,
              height: `${pt.size}px`,
              left: `${pt.left}%`,
              top: `${pt.top}%`,
              filter: "blur(0.5px)",
              animation: `float-particle ${pt.duration}s infinite linear`,
              animationDelay: `${pt.delay}s`,
            }}
          />
        ))}
      </div>

      <style jsx global>{`
        @keyframes float-particle {
          0% { transform: translateY(100px) translateX(0); opacity: 0; }
          15% { opacity: 0.35; }
          85% { opacity: 0.35; }
          100% { transform: translateY(-400px) translateX(80px); opacity: 0; }
        }
        .custom-scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hidden {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Responsive 1920x1080 Viewport Canvas */}
      <div
        ref={containerRef}
        className="w-[1920px] h-[1080px] absolute top-1/2 left-1/2 shrink-0 z-10 origin-center pointer-events-auto"
        style={{
          transform: "translate(-50%, -50%) scale(1)",
        }}
      >
        {/* ── STAGE VIEWPORTS ── */}

        {/* 1. Introductory Screen (0–2 s) */}
        {showLogoScreen && (
          <div
            ref={logoScreenRef}
            className="absolute inset-0 flex flex-col items-center justify-center text-center z-50 pointer-events-none"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[30px] flex items-center justify-center shadow-[0_20px_50px_rgba(139,92,246,0.3)] border border-white/10 glow-purple mb-8">
              <span className="text-white font-extrabold text-5xl">B</span>
            </div>
            <h1 className="text-6xl font-black tracking-tight text-white mb-4">Bunkd</h1>
            <p className="text-2xl text-zinc-400 font-medium tracking-wide">Never Guess Attendance.</p>
          </div>
        )}

        {/* 2. Floating 3D Phone App Screen Container */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div
            ref={cameraRef}
            className="perspective-container"
            style={{
              perspective: "1200px",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              ref={phoneRef}
              className="camera-rig transition-all"
              style={{
                transformStyle: "preserve-3d",
                transform: "translate3d(var(--cam-x), var(--cam-y), var(--cam-z)) rotateX(var(--cam-rx)) rotateY(var(--cam-ry)) rotateZ(var(--cam-rz))",
                filter: "blur(var(--cam-blur))",
              }}
            >
              {/* Premium 3D Phone Shell Layout */}
              <div className="relative" style={{ transformStyle: "preserve-3d" }}>
                
                {/* 3D Sides Thickness layers */}
                <div className="absolute inset-0 rounded-[50px] border-[1px] border-white/5 bg-[#0e0e15] pointer-events-none" style={{ transform: "translate3d(0, 0, -2px)" }} />
                <div className="absolute inset-0 rounded-[50px] border-[1px] border-white/5 bg-[#0a0a0f] pointer-events-none" style={{ transform: "translate3d(0, 0, -4px)" }} />
                <div className="absolute inset-0 rounded-[50px] border-[1px] border-white/5 bg-[#07070b] pointer-events-none" style={{ transform: "translate3d(0, 0, -6px)" }} />
                <div className="absolute inset-0 rounded-[50px] border-[1px] border-white/5 bg-[#030305] pointer-events-none shadow-[0_30px_70px_rgba(0,0,0,0.85)]" style={{ transform: "translate3d(0, 0, -8px)" }} />

                {/* Main Phone Body */}
                <div className="w-[390px] h-[844px] rounded-[52px] border-[11px] border-[#0a0a0e] bg-[#050508] relative overflow-hidden flex flex-col select-none ring-1 ring-white/10">
                  
                  {/* Status Bar / Dynamic Island Notch */}
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-50 flex items-center justify-between px-3 pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                    <div className="w-10 h-1 bg-zinc-950 rounded-full" />
                  </div>

                  {/* Dynamic Gloss Reflected Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.0] via-white/[0.03] to-white/[0.12] pointer-events-none z-45" />

                  {/* App Navigation Header */}
                  <header className="sticky top-0 bg-[#050508]/80 backdrop-blur-md border-b border-white/[0.05] z-40 shrink-0 select-none">
                    <div className="px-4 h-14 flex items-center justify-between pt-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-xs">B</span>
                        </div>
                        <span className="font-bold text-sm tracking-tight text-white">Bunkd</span>
                      </div>
                      <span className="text-[9px] font-semibold text-zinc-400 bg-white/[0.03] border border-white/[0.04] px-2.5 py-1 rounded-full max-w-[120px] truncate">
                        showcase@bunkd.app
                      </span>
                    </div>
                  </header>

                  {/* Render Mocked Component viewport */}
                  <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 relative z-10 custom-scrollbar-hidden">
                    {renderComponent()}
                  </div>

                  {/* Glass Bottom Navigation mimicking original Nav */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 pb-5 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none z-50">
                    <nav className="glass-nav rounded-2xl p-1 flex items-center justify-between pointer-events-auto relative">
                      {/* Dashboard Tab */}
                      <button className={`flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all ${activeView === "dashboard" ? "text-purple-400 font-bold" : "text-zinc-500"}`}>
                        {activeView === "dashboard" && (
                          <div
                            className="absolute inset-0 rounded-xl -z-10"
                            style={{
                              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                              border: "1px solid rgba(139, 92, 246, 0.25)",
                              boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                            }}
                          />
                        )}
                        <LayoutDashboard className="w-4 h-4" />
                        <span className="text-[8px] mt-1.5 tracking-wider uppercase">Dashboard</span>
                      </button>

                      {/* Calendar Tab */}
                      <button className={`flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all ${activeView === "calendar" ? "text-purple-400 font-bold" : "text-zinc-500"}`}>
                        {activeView === "calendar" && (
                          <div
                            className="absolute inset-0 rounded-xl -z-10"
                            style={{
                              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                              border: "1px solid rgba(139, 92, 246, 0.25)",
                              boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                            }}
                          />
                        )}
                        <CalendarDays className="w-4 h-4" />
                        <span className="text-[8px] mt-1.5 tracking-wider uppercase">Calendar</span>
                      </button>

                      {/* Settings Tab */}
                      <button className={`flex-1 flex flex-col items-center py-2.5 rounded-xl relative transition-all ${activeView === "settings" ? "text-purple-400 font-bold" : "text-zinc-500"}`}>
                        {activeView === "settings" && (
                          <div
                            className="absolute inset-0 rounded-xl -z-10"
                            style={{
                              background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08))",
                              border: "1px solid rgba(139, 92, 246, 0.25)",
                              boxShadow: "0 0 24px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                            }}
                          />
                        )}
                        <SettingsIcon className="w-4 h-4" />
                        <span className="text-[8px] mt-1.5 tracking-wider uppercase">Settings</span>
                      </button>
                    </nav>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Outro Screen (14–18 s) */}
        {showEndScreen && (
          <div
            ref={endScreenRef}
            className="absolute top-1/2 left-[56%] -translate-y-1/2 w-[700px] h-[500px] flex flex-col justify-center items-start z-30 pointer-events-none pl-8"
          >
            {/* Title Tagline */}
            <h2 className="text-7xl font-black tracking-tight text-white mb-6 leading-tight">
              Track.
              <br />
              Plan.
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Bunk Smart.
              </span>
            </h2>
            
            {/* Launch Website Domain details */}
            <p className="text-2xl text-zinc-400 font-semibold tracking-wide mb-1 flex items-center gap-2">
              <span>Launch Website:</span>
              <span className="text-white border-b border-purple-500/40 pb-0.5 font-bold">
                bunkd-eight.vercel.app
              </span>
            </p>
            <p className="text-sm text-zinc-650 font-bold uppercase tracking-widest mt-1">Available Now</p>
          </div>
        )}

        {/* Playback timeline progress bar (extremely subtle and neat) */}
        <div className="absolute bottom-12 left-12 right-12 h-1.5 bg-white/[0.04] rounded-full overflow-hidden z-40 pointer-events-auto flex items-center">
          <div
            ref={progressBarRef}
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
            style={{ width: "0%" }}
          />
        </div>
      </div>
    </div>
  );
}
