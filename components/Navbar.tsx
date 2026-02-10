
import React, { useState } from 'react';
import { useStore } from '../store';
import { AppView } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const { currentView, setView, user, logout, setAuthModalOpen } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { label: 'Explore', view: AppView.LANDING },
    { label: 'Studio', view: AppView.DASHBOARD },
    { label: 'AI Hub', view: AppView.AI_HUB },
    { label: 'Library', view: AppView.RESOURCES },
  ];

  if (user?.isAdmin) {
    navItems.push({ label: 'Admin', view: AppView.ADMIN });
  }

  const handleNavClick = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 w-full z-[100] px-4 md:px-6 py-4 glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between relative z-[110]">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView(AppView.LANDING)}
        >
          <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-all">
            <span className="text-white font-bold text-lg md:text-xl">A</span>
          </div>
          <span className="text-xl md:text-2xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">ARISTO</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                currentView === item.view 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {!user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:block px-5 py-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                লগইন
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAuthModalOpen(true)}
                className="px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-xl transition-all"
              >
                জয়েন করুন
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-3 md:gap-4 pl-4 border-l border-white/10">
              <button 
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
              >
                LOGOUT
              </button>
              <button 
                onClick={() => setView(AppView.PROFILE)}
                className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden bg-white/5 hover:border-blue-500 transition-colors shadow-lg flex items-center justify-center text-blue-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors relative z-[120]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMobileMenuOpen ? (
                <line x1="18" y1="6" x2="6" y2="18" />
              ) : (
                <><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" /></>
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Background High-Density Ultra-Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-[60px] z-[105]"
            />
            
            {/* Mobile Menu Drawer */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="lg:hidden absolute top-full left-0 w-full glass-dark p-6 flex flex-col gap-4 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[106] border-b border-white/10 rounded-b-[40px] overflow-hidden"
            >
              <div className="flex flex-col gap-2 relative z-10">
                {navItems.map((item) => (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    className={`w-full py-5 px-6 rounded-2xl text-sm font-bold uppercase tracking-widest text-left transition-all ${
                      currentView === item.view ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {user && (
                <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                   <button 
                    onClick={handleLogout}
                    className="w-full py-5 px-6 rounded-2xl text-sm font-black uppercase tracking-widest text-left text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20"
                  >
                    LOGOUT
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
