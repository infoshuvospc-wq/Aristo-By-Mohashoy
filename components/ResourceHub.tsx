
import React, { useState } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { AppView } from '../types';

const ResourceHub: React.FC = () => {
  const { resources, addResource, deleteResource, user, setAuthModalOpen, setView, notes, deleteNote, editNote, readNote } = useStore();
  const [dragActive, setDragActive] = useState(false);
  const [tab, setTab] = useState<'library' | 'notes'>('library');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleAction = (callback: () => void) => {
    if (!user) {
      setAuthModalOpen(true);
    } else {
      callback();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    handleAction(() => {
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          addResource({
            id: Date.now().toString(),
            name: file.name,
            type: file.type.includes('pdf') ? 'pdf' : 'video',
            url: base64,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            uploadedAt: Date.now()
          });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        addResource({
          id: Date.now().toString(),
          name: file.name,
          type: file.type.includes('pdf') ? 'pdf' : 'video',
          url: base64,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          uploadedAt: Date.now()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-heading font-black mb-2">Academic Library</h1>
          <p className="text-slate-400 font-medium">Your research hub and digital workspace.</p>
        </div>
        
        <div className="flex bg-white/5 p-1 rounded-[20px] border border-white/5">
          <button 
            onClick={() => setTab('library')}
            className={`px-8 py-3 rounded-[15px] text-xs font-black uppercase tracking-widest transition-all ${tab === 'library' ? 'bg-blue-600 shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            Library
          </button>
          <button 
            onClick={() => setTab('notes')}
            className={`px-8 py-3 rounded-[15px] text-xs font-black uppercase tracking-widest transition-all ${tab === 'notes' ? 'bg-blue-600 shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            Notes ({notes.length})
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === 'library' ? (
          <motion.div key="lib" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div 
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              className={`mb-12 border-2 border-dashed rounded-[40px] p-12 flex flex-col items-center justify-center transition-all ${dragActive ? 'border-blue-500 bg-blue-500/10 scale-102' : 'border-white/10 bg-white/5'}`}
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Drop academic files here</h3>
              <p className="text-slate-500 font-medium">Upload research PDFs or Lecture recordings</p>
              <input type="file" className="hidden" id="file-upload" onChange={(e) => handleAction(() => handleFileUpload(e))} />
              <label htmlFor="file-upload" className="mt-8 px-10 py-4 bg-blue-600 rounded-2xl font-black text-sm cursor-pointer hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30">
                Browse Materials
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {resources.map((res) => (
                <ResourceCard key={res.id} res={res} onDelete={() => deleteResource(res.id)} />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key="notes" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="flex justify-end mb-8">
               <button 
                 onClick={() => handleAction(() => editNote(null))}
                 className="px-8 py-4 bg-blue-600 rounded-2xl font-black text-sm hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/30 flex items-center gap-3"
               >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                 Create New Note
               </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {notes.map((note) => (
                <div key={note.id} className="glass p-8 rounded-[35px] border-white/10 group hover:border-blue-500/40 transition-all relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => deleteNote(note.id)} className="text-red-400 hover:text-red-300">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                   </div>
                   <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 mb-6">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                   </div>
                   <h3 className="text-xl font-bold mb-2 truncate">{note.title}</h3>
                   <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">Modified: {new Date(note.lastModified).toLocaleDateString()}</p>
                   
                   <div className="flex flex-col gap-2">
                     <button 
                       onClick={() => readNote(note.id)}
                       className="w-full py-3 bg-blue-600/10 rounded-xl text-blue-400 text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20"
                     >
                       Read Note
                     </button>
                     <button 
                       onClick={() => editNote(note.id)}
                       className="w-full py-3 bg-white/5 rounded-xl text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                     >
                       Edit Study Note
                     </button>
                   </div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="col-span-full py-20 text-center glass rounded-[40px] border-dashed border-white/5">
                   <p className="text-slate-500 font-bold uppercase tracking-widest">No notes found. Start your research!</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResourceCard = ({ res, onDelete }: any) => {
  const openResource = () => {
    const win = window.open();
    if (win) {
      if (res.type === 'pdf') {
        win.document.write(`<iframe src="${res.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else if (res.type === 'video') {
        win.document.write(`<body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh;"><video controls style="max-width:100%; max-height:100%;"><source src="${res.url}" type="video/mp4"></video></body>`);
      } else {
        win.location.href = res.url;
      }
    }
  };

  return (
    <motion.div layout className="glass p-6 rounded-[30px] border-white/10 group hover:border-blue-500/30 transition-all">
      <div className="aspect-video rounded-2xl bg-slate-900 mb-6 flex items-center justify-center border border-white/5 relative overflow-hidden">
         <div className="absolute inset-0 bg-blue-600/5 group-hover:bg-blue-600/10 transition-colors" />
         <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={res.type === 'pdf' ? '#ef4444' : '#3b82f6'} strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <div className="flex justify-between items-start gap-2 mb-6">
        <div className="min-w-0">
          <h3 className="font-bold text-sm truncate">{res.name}</h3>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">{res.size} • {res.type.toUpperCase()}</p>
        </div>
        <button onClick={onDelete} className="text-red-400/30 hover:text-red-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <button onClick={openResource} className="w-full py-3 rounded-xl bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20">
         View Resource
      </button>
    </motion.div>
  );
};

export default ResourceHub;
