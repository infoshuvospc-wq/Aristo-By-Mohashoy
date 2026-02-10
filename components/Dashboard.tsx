
import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { AppView } from '../types';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { setView, user, setAuthModalOpen } = useStore();
  const [timer, setTimer] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTimerRunning && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      setIsTimerRunning(false);
      alert("Study Session Complete! Take a break.");
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timer]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleProtectedAction = (view: AppView) => {
    if (!user) {
      setAuthModalOpen(true);
    } else {
      setView(view);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 mb-20">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
           <div>
              <h1 className="text-5xl md:text-7xl font-heading font-black tracking-tighter text-white mb-2 uppercase">
                Welcome, {user?.name.split(' ')[0] || 'Explorer'}
              </h1>
              <p className="text-blue-400 text-sm font-bold uppercase tracking-[6px] flex items-center justify-center md:justify-start gap-4">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shadow-[0_0_15px_rgba(59,130,246,1)]"></span>
                {user?.institution || 'Global Knowledge Core'}
              </p>
           </div>
        </div>
      </header>

      {/* Hero AI HUB Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.005 }}
        className="relative group mb-16 overflow-hidden rounded-[60px] cursor-pointer"
        onClick={() => handleProtectedAction(AppView.AI_HUB)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-900/20 to-purple-900/20" />
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 blur-[100px] opacity-10 group-hover:opacity-25 transition-all duration-700" />
        <div className="relative glass p-16 md:p-32 border-white/5 flex flex-col items-center text-center gap-14 bg-slate-950/20">
           <div className="w-28 h-28 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-[35px] flex items-center justify-center animate-pulse border border-blue-500/20 shadow-[0_0_60px_rgba(59,130,246,0.15)] relative">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.2"><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M12 8V4H8"/><path d="M2 14h2"/><path d="M20 14h2"/></svg>
           </div>
           <div className="max-w-5xl">
             <h2 className="text-6xl md:text-[140px] font-heading font-black mb-8 tracking-[-0.07em] leading-none uppercase text-white">
                ARISTO AI HUB
             </h2>
             <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium tracking-tight">
               Access the decentralized intelligence of Aristo. Speak with "Mohashoy" for real-time synthesis and research.
             </p>
           </div>
           <button className="px-16 py-8 bg-blue-600 rounded-[40px] font-black text-2xl shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all flex items-center gap-8 uppercase tracking-[8px] group text-white">
              GO WITH ARISTO 🎙️
           </button>
        </div>
      </motion.div>

      {/* Grid of Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
         <ActionCard 
            title="Knowledge Bank" 
            desc="Explore your global decentralized library with absolute clarity. Access your documents and insights instantly." 
            icon="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" 
            onClick={() => handleProtectedAction(AppView.RESOURCES)} 
            isHighlight={true}
         />
         
         <div className="glass p-12 rounded-[50px] border-white/5 bg-gradient-to-br from-indigo-600/10 to-transparent flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/20">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter text-white">Focus Matrix</h3>
            <div className="text-6xl font-heading font-black text-white mb-8 tabular-nums tracking-tighter">{formatTime(timer)}</div>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[3px] transition-all shadow-xl ${isTimerRunning ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-green-500/20 text-green-400 border border-green-500/20'}`}
              >
                {isTimerRunning ? 'Halt Session' : 'Enter Zone'}
              </button>
            </div>
         </div>
      </div>
    </div>
  );
};

const ActionCard = ({ title, desc, icon, onClick, isHighlight = false }: any) => (
  <motion.div whileHover={{ y: -8 }} onClick={onClick} className={`glass p-12 rounded-[55px] border-white/5 cursor-pointer hover:bg-white/5 transition-all group relative overflow-hidden ${isHighlight ? 'bg-white/5' : ''}`}>
    <div className={`w-16 h-16 rounded-3xl ${isHighlight ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-600/10 text-blue-500'} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform border border-blue-500/10`}>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d={icon}/></svg>
    </div>
    <h3 className={`text-2xl font-black mb-3 uppercase tracking-tighter text-white ${isHighlight ? 'underline decoration-blue-500/40 decoration-4 underline-offset-8' : ''}`}>{title}</h3>
    <p className={`text-sm leading-relaxed font-bold ${isHighlight ? 'text-slate-200' : 'text-slate-500'}`}>{desc}</p>
  </motion.div>
);

export default Dashboard;
