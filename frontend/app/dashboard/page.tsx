"use client";

import { useState } from "react";
import { Sidebar } from "../../components/Sidebar";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // SVG parameters for Donut Chart
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  const lowBiasPercent = 68;
  const mediumBiasPercent = 22;
  const highBiasPercent = 10;

  const lowOffset = circumference;
  const lowStroke = (lowBiasPercent / 100) * circumference;
  
  const mediumOffset = circumference - lowStroke;
  const mediumStroke = (mediumBiasPercent / 100) * circumference;
  
  const highOffset = mediumOffset - mediumStroke;
  const highStroke = (highBiasPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-zinc-950 text-slate-100 font-sans">
      <div className="mx-auto grid max-w-[1480px] gap-8 px-5 py-8 lg:grid-cols-[auto_1fr] lg:px-10">
        
        {/* Sidebar wrapper to keep layout consistent */}
        <div style={{ display: sidebarOpen ? 'block' : 'none' }}>
           <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="space-y-6 min-w-0">
          
          {/* ── Header ── */}
          <header className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-xl shadow-black/20 backdrop-blur-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none"></div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">Dashboard</p>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">AURA Project Dashboard</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-400">
                  This page gives judges a quick overview of your hackathon core metrics, including bias health, conversation volume, trust progress, and actionable user outcomes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/40 hover:bg-white/10"
              >
                {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              </button>
            </div>
          </header>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            {/* ── Bias Health ── */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
              <h2 className="text-xl font-semibold text-white mb-2">Bias Health</h2>
              <p className="text-sm text-slate-400 mb-6">
                Track how often AURA returns low, medium, and high bias answers across user sessions.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-10 justify-center mt-8">
                {/* Donut Chart SVG */}
                <div className="relative flex items-center justify-center w-52 h-52 drop-shadow-2xl">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    {/* Background Ring */}
                    <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="20" fill="transparent" className="text-zinc-800" />
                    
                    {/* Low Bias */}
                    <circle 
                      cx="80" cy="80" r={radius} 
                      stroke="url(#lowGradient)" strokeWidth="20" fill="transparent" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - lowStroke} 
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* Medium Bias */}
                    <circle 
                      cx="80" cy="80" r={radius} 
                      stroke="url(#medGradient)" strokeWidth="20" fill="transparent" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - mediumStroke} 
                      transform={`rotate(${(lowBiasPercent / 100) * 360} 80 80)`}
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* High Bias */}
                    <circle 
                      cx="80" cy="80" r={radius} 
                      stroke="url(#highGradient)" strokeWidth="20" fill="transparent" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={circumference - highStroke} 
                      transform={`rotate(${((lowBiasPercent + mediumBiasPercent) / 100) * 360} 80 80)`}
                      className="transition-all duration-1000 ease-out"
                    />

                    <defs>
                      <linearGradient id="lowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" /> {/* cyan-500 */}
                        <stop offset="100%" stopColor="#10b981" /> {/* emerald-500 */}
                      </linearGradient>
                      <linearGradient id="medGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" /> {/* amber-500 */}
                        <stop offset="100%" stopColor="#d97706" /> {/* amber-600 */}
                      </linearGradient>
                      <linearGradient id="highGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" /> {/* rose-500 */}
                        <stop offset="100%" stopColor="#e11d48" /> {/* rose-600 */}
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center Text */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold bg-gradient-to-br from-cyan-400 to-emerald-400 text-transparent bg-clip-text">90%</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Avg Safe</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-4 w-full max-w-[200px]">
                  <div className="flex bg-white/5 border border-white/5 rounded-xl p-3 items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                    <div className="w-full flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Low bias</span>
                      <span className="text-sm font-bold text-cyan-400">{lowBiasPercent}%</span>
                    </div>
                  </div>
                  
                  <div className="flex bg-white/5 border border-white/5 rounded-xl p-3 items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                    <div className="w-full flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Medium bias</span>
                      <span className="text-sm font-bold text-amber-500">{mediumBiasPercent}%</span>
                    </div>
                  </div>

                  <div className="flex bg-white/5 border border-white/5 rounded-xl p-3 items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
                    <div className="w-full flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">High bias</span>
                      <span className="text-sm font-bold text-rose-500">{highBiasPercent}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Engagement ── */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20 flex flex-col">
              <h2 className="text-xl font-semibold text-white mb-2">Engagement</h2>
              <p className="text-sm text-slate-400 mb-6 flex-1">
                See how users interact with AURA, from questions asked to trust badges earned.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="group rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5 relative overflow-hidden flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-cyan-300/80 font-semibold mb-1 relative z-10">Sessions</p>
                    <p className="text-4xl font-bold text-white relative z-10">128</p>
                  </div>
                  <div className="text-6xl opacity-20 group-hover:scale-110 transition-transform relative z-0">💬</div>
                </div>
                
                <div className="group rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 relative overflow-hidden flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-violet-300/80 font-semibold mb-1 relative z-10">Questions</p>
                    <p className="text-4xl font-bold text-white relative z-10">342</p>
                  </div>
                  <div className="text-6xl opacity-20 group-hover:scale-110 transition-transform relative z-0">❓</div>
                </div>
                
                <div className="group rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 relative overflow-hidden flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-emerald-300/80 font-semibold mb-1 relative z-10">Badges earned</p>
                    <p className="text-4xl font-bold text-white relative z-10">84</p>
                  </div>
                  <div className="text-6xl opacity-20 group-hover:scale-110 transition-transform relative z-0">🏆</div>
                </div>
              </div>
            </section>
          </div>

          {/* ── User Actions ── */}
          <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-lg shadow-black/20">
            <h2 className="text-xl font-semibold text-white mb-2">User Actions: What users can do</h2>
            <p className="text-sm text-slate-400 mb-6">
              Present judges with a roadmap of the experience, not just metrics.
            </p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 text-sm mb-2">Compare Metrics</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Compare AI confidence with bias risk in every response.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 text-sm mb-2">Review Explainability</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Review explainability notes to understand why answers were chosen.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 text-sm mb-2">Track Trust Progress</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Save fairness recommendations and track trust progress.
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/5 hover:border-white/10 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center text-amber-400 mb-4 border border-amber-500/20">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                </div>
                <h3 className="font-semibold text-slate-200 text-sm mb-2">Earn Trust Badges</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Earn badges by choosing safer and more inclusive language.
                </p>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
