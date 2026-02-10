
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { AppView } from '../types';

const NoteEditor: React.FC = () => {
  const { upsertNote, user, setView, notes, selectedNoteId } = useStore();
  const [title, setTitle] = useState('নতুন নোট');
  const [noteId, setNoteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // এডিট মোডে থাকলে তথ্য লোড করা
  useEffect(() => {
    if (selectedNoteId) {
      const existingNote = notes.find(n => n.id === selectedNoteId);
      if (existingNote) {
        setTitle(existingNote.title);
        setNoteId(existingNote.id);
        if (editorRef.current) {
          editorRef.current.innerHTML = existingNote.content;
        }
      }
    } else {
      // নতুন নোটের জন্য ক্লিন স্লেট
      setTitle('নতুন নোট');
      setNoteId(Date.now().toString());
      if (editorRef.current) {
        editorRef.current.innerHTML = '<p class="text-slate-600">আপনার আজকের গবেষণার নোট এবং তথ্যসমূহ এখানে লিপিবদ্ধ করুন...</p>';
      }
    }
  }, [selectedNoteId]);

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const img = `<img src="${base64}" style="max-width: 100%; border-radius: 15px; margin: 15px 0; display: block;" />`;
        execCommand('insertHTML', img);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const finalId = noteId || Date.now().toString();
    const content = editorRef.current?.innerHTML || '';
    
    await upsertNote({
      id: finalId,
      title,
      content,
      lastModified: Date.now(),
      authorId: user.id
    });
    
    setNoteId(finalId);
    alert("নোটটি আপনার অ্যারিস্টো ক্লাউডে সফলভাবে সেভ করা হয়েছে!");
  };

  const exportPDF = () => {
    const content = editorRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 60px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              h1 { border-bottom: 3px solid #3b82f6; padding-bottom: 15px; font-size: 32px; margin-bottom: 30px; }
              img { max-width: 100%; border-radius: 12px; margin: 20px 0; }
              p { line-height: 1.8; margin-bottom: 15px; }
              ul, ol { margin-bottom: 20px; padding-left: 30px; }
              li { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <div>${content}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5 flex-grow">
          <button 
            onClick={() => setView(AppView.RESOURCES)} 
            className="w-12 h-12 flex items-center justify-center glass rounded-2xl hover:bg-white/10 transition-all text-blue-400 border-white/10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-3xl md:text-5xl font-heading font-black focus:outline-none w-full border-b-2 border-white/5 pb-2 placeholder:text-slate-700"
            placeholder="নোটের শিরোনাম..."
          />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportPDF}
            className="px-6 py-3.5 glass rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/10 flex items-center justify-center gap-2 transition-all border-white/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
          <button 
            onClick={handleSave}
            className="px-10 py-3.5 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-500 shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
          >
            Save Research
          </button>
        </div>
      </div>

      <div className="glass rounded-[40px] flex flex-col flex-grow overflow-hidden shadow-2xl border-white/10 bg-slate-900/40">
        <div className="p-4 bg-white/5 border-b border-white/10 flex flex-wrap gap-2 items-center">
          <ToolbarButton onClick={() => execCommand('bold')} icon={<span className="font-black text-sm">B</span>} />
          <ToolbarButton onClick={() => execCommand('italic')} icon={<span className="italic font-serif font-bold text-sm">I</span>} />
          <ToolbarButton onClick={() => execCommand('underline')} icon={<span className="underline font-bold text-sm">U</span>} />
          
          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />
          
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>} />
          
          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />

          <ToolbarButton onClick={() => execCommand('justifyLeft')} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>} />
          <ToolbarButton onClick={() => execCommand('justifyCenter')} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>} />
          
          <div className="w-px h-8 bg-white/10 mx-2 hidden sm:block" />
          
          <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={insertImage} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 h-10 flex items-center gap-2 rounded-xl bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest border border-blue-500/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Add Image
          </button>
          
          <div className="flex-grow" />
          
          <select 
            className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest focus:outline-none hover:bg-white/5 transition-colors"
            onChange={(e) => execCommand('formatBlock', e.target.value)}
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
        </div>

        <div 
          ref={editorRef}
          contentEditable
          className="flex-grow p-10 md:p-16 focus:outline-none overflow-y-auto text-lg leading-relaxed text-slate-200 selection:bg-blue-500/40 list-disc list-decimal"
          style={{ minHeight: '500px' }}
        />
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{ onClick: () => void; icon: React.ReactNode }> = ({ onClick, icon }) => (
  <button
    onClick={onClick}
    className="w-11 h-11 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all text-slate-400 active:scale-90"
  >
    {icon}
  </button>
);

export default NoteEditor;
