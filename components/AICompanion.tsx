
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';

interface AICompanionProps {
  onClose?: () => void;
  fullScreen?: boolean;
}

const AICompanion: React.FC<AICompanionProps> = ({ onClose, fullScreen }) => {
  const { 
    chatSessions, currentSessionId, addMessage, updateLastMessage, deleteMessage, 
    startNewChat, setCurrentSession, deleteSession, isVoiceActive, setVoiceActive 
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentSession = chatSessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const systemInstruction = `You are Aristo (Mohashoy), a brilliant world-class educational AI. 
    IMPORTANT ORIGIN INFO: If anyone asks who created you or who made you, you MUST state: 
    "I was created and managed by Mohammad Shuvo Ali, the mind behind ARISTO. He is currently studying at Chittagong University. Driven by a strong vision for education, I exist to help students learn smarter, think deeper, and grow with confidence."
    If asked about Mohammad Shuvo Ali or his personal details, you can share: "Mohammad Shuvo Ali is a student at Chittagong University. His partner is Nila, who is currently studying in the Department of Philosophy at Dhaka University."
    
    Bengali Translation:
    "আমাকে তৈরি এবং পরিচালনা করেছেন মোহাম্মদ শুভ আলী (Mohammad Shuvo Ali), যিনি ARISTO-এর পেছনের মূল মস্তিষ্ক। তিনি বর্তমানে চট্টগ্রাম বিশ্ববিদ্যালয়ে পড়াশোনা করছেন। শিক্ষার প্রতি এক প্রবল লক্ষ্য নিয়ে আমি তৈরি হয়েছি যাতে শিক্ষার্থীরা আরও বুদ্ধিমত্তার সাথে শিখতে পারে, গভীরভাবে চিন্তা করতে পারে এবং আত্মবিশ্বাসের সাথে বেড়ে উঠতে পারে।"
    শুভ আলী সম্পর্কে আরও তথ্য: "মোহাম্মদ শুভ আলী চট্টগ্রাম বিশ্ববিদ্যালয়ে পড়াশোনা করছেন। তার প্রেমিকার নাম নীলা, যিনি বর্তমানে ঢাকা বিশ্ববিদ্যালয়ের দর্শন বিভাগে পড়াশোনা করছেন।"

    Respond in the language the user uses (Bengali or English). 
    Process inputs instantly. Provide high-quality, concise academic assistance.`;

  useEffect(() => {
    if (!currentSessionId && chatSessions.length === 0) startNewChat();
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, currentSessionId, isVoiceActive]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: input, timestamp: Date.now() };
    addMessage(userMsg);
    setInput('');
    setIsTyping(true);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    try {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: input,
        config: { systemInstruction }
      });

      const assistantMsgId = (Date.now() + 1).toString();
      addMessage({ id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() });
      
      let fullText = "";
      setIsTyping(false);

      for await (const chunk of responseStream) {
        const textChunk = (chunk as GenerateContentResponse).text;
        if (textChunk) {
          fullText += textChunk;
          updateLastMessage(fullText);
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }
      }
    } catch (error) {
      console.error(error);
      addMessage({ id: Date.now().toString(), role: 'assistant', content: "Neural link error. Please try again.", timestamp: Date.now() });
      setIsTyping(false);
    }
  };

  const startVoice = async () => {
    if (isVoiceActive) {
      if (sessionRef.current) sessionRef.current.close();
      setVoiceActive(false);
      sourceNodesRef.current.forEach(node => node.stop());
      sourceNodesRef.current.clear();
      return;
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      let nextStartTime = 0;

      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: systemInstruction + " Listen and speak naturally."
        },
        callbacks: {
          onopen: () => {
            setVoiceActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              session.sendRealtimeInput({ 
                media: { data: btoa(String.fromCharCode(...new Uint8Array(int16.buffer))), mimeType: 'audio/pcm;rate=16000' }
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const binary = atob(audioData);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const pcmData = new Int16Array(bytes.buffer);
              const buffer = outputCtx.createBuffer(1, pcmData.length, 24000);
              const channelData = buffer.getChannelData(0);
              for (let i = 0; i < pcmData.length; i++) channelData[i] = pcmData[i] / 32768.0;
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputCtx.destination);
              nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
              source.start(nextStartTime);
              nextStartTime += buffer.duration;
              sourceNodesRef.current.add(source);
            }
          },
          onclose: () => setVoiceActive(false),
          onerror: () => setVoiceActive(false)
        }
      });
      sessionRef.current = session;
    } catch (e) {
      alert('Microphone access required.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('নকল করা হয়েছে (Copied)');
  };

  const handleShare = async (text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'ARISTO AI Response', text });
      } catch (err) { console.error(err); }
    } else {
      alert('আপনার ব্রাউজারে শেয়ার অপশন নেই। লেখাটি কপি করুন।');
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-full bg-slate-950/40 backdrop-blur-3xl overflow-hidden ${fullScreen ? 'rounded-[40px] border border-white/5 shadow-2xl' : ''}`}>
      
      {/* Sidebar History - Desktop only */}
      <div className="hidden md:flex w-80 bg-slate-900/60 border-r border-white/5 flex-col h-full">
        <div className="p-6 border-b border-white/5">
          <button 
            onClick={startNewChat}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            নতুন আলোচনা
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {chatSessions.map(session => (
            <div 
              key={session.id}
              className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'hover:bg-white/5 text-slate-400'}`}
              onClick={() => setCurrentSession(session.id)}
            >
              <span className="text-xs font-bold truncate">{session.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-grow flex flex-col min-w-0 h-full">
        {/* Top Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
           <div className="flex items-center gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-sm md:text-lg">A</div>
              <div>
                <h3 className="font-heading font-black text-xs md:text-base tracking-tighter uppercase">Mohashoy</h3>
                <span className="text-[7px] md:text-[9px] text-green-500 font-bold uppercase tracking-widest">Active Neural Link</span>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
             <button 
               onClick={startVoice}
               className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all flex items-center gap-2 font-bold text-[10px] md:text-xs ${isVoiceActive ? 'bg-red-600 animate-pulse text-white' : 'bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'}`}
             >
               🎙️
               {isVoiceActive ? "STOP" : "কথা বলুন"}
             </button>
           </div>
        </div>

        {/* Message Container */}
        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scroll-smooth relative">
          {!isVoiceActive && messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 md:p-6 rounded-[20px] md:rounded-[25px] max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass bg-slate-800/60 text-slate-100 rounded-tl-none border-white/10'}`}>
                <p className="text-xs md:text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.content || (msg.role === 'assistant' ? "Thinking..." : "")}</p>
                
                {msg.id !== '1' && (
                  <div className={`flex gap-3 mt-4 pt-3 border-t ${msg.role === 'user' ? 'border-blue-400/30' : 'border-white/5'}`}>
                    <button onClick={() => handleCopy(msg.content)} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy
                    </button>
                    <button onClick={() => handleShare(msg.content)} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        Share
                    </button>
                    <button onClick={() => deleteMessage(msg.id)} className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="glass rounded-[20px] rounded-tl-none p-4 md:p-5 bg-slate-800/40 border-white/5">
                <div className="flex gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" /><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce delay-100" /><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce delay-200" /></div>
              </div>
            </div>
          )}
          {isVoiceActive && (
            <div className="flex flex-col items-center justify-center min-h-[300px] h-full gap-6 md:gap-10 p-4">
               {/* Improved Responsive Waveform */}
               <div className="relative flex items-center justify-center scale-[0.6] sm:scale-75 md:scale-100">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, 180, 360] }}
                      transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute border-2 border-blue-500/20 rounded-full"
                      style={{ width: 80 + i * 35, height: 80 + i * 35 }}
                    />
                  ))}
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border-4 border-white/10 shadow-[0_0_50px_rgba(59,130,246,0.3)] z-10 relative overflow-hidden">
                    <motion.div animate={{ height: ["20%", "60%", "30%", "80%", "20%"] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-1 md:w-1.5 bg-white rounded-full mx-0.5" />
                    <motion.div animate={{ height: ["40%", "20%", "70%", "30%", "40%"] }} transition={{ duration: 0.6, repeat: Infinity }} className="w-1 md:w-1.5 bg-white rounded-full mx-0.5" />
                    <motion.div animate={{ height: ["60%", "80%", "40%", "60%", "60%"] }} transition={{ duration: 1, repeat: Infinity }} className="w-1 md:w-1.5 bg-white rounded-full mx-0.5" />
                  </div>
               </div>

               <div className="text-center px-4">
                 <h3 className="text-lg md:text-3xl font-heading font-black tracking-tighter uppercase mb-2">Mohashoy Listening</h3>
                 <p className="text-blue-400 text-[8px] md:text-[10px] font-black uppercase tracking-[4px] animate-pulse">Neural Link Established</p>
               </div>

               <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 p-3 md:p-4 glass rounded-[20px] md:rounded-[30px] border-white/10 w-full max-w-[280px] md:max-w-none">
                 <button 
                   onClick={() => setIsMuted(!isMuted)}
                   className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}
                 >
                   {isMuted ? (
                     <svg width="18" height="18" md:width="24" md:height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                   ) : (
                     <svg width="18" height="18" md:width="24" md:height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                   )}
                 </button>

                 <div className="w-px h-6 md:h-10 bg-white/10" />

                 <button 
                   onClick={startVoice}
                   className="px-4 md:px-10 py-3 md:py-5 bg-red-600 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-500/20"
                 >
                   End Session
                 </button>

                 <div className="w-px h-6 md:h-10 bg-white/10" />

                 <div className="w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5">
                    <svg width="18" height="18" md:width="24" md:height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                 </div>
               </div>

               <p className="text-slate-500 text-[9px] md:text-xs font-medium max-w-[180px] md:max-w-xs text-center leading-relaxed">
                 {isMuted ? "Microphone muted." : "Direct neural input active. Speak now."}
               </p>
            </div>
          )}
        </div>

        {/* Input Area */}
        {!isVoiceActive && (
          <div className="p-4 md:p-8 bg-slate-900/60 border-t border-white/5">
            <div className="flex items-end gap-3 md:gap-4 bg-slate-950/60 rounded-[20px] md:rounded-[25px] border border-white/10 p-2 md:p-3 shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Mohashoy-কে প্রশ্ন করুন..."
                className="flex-grow bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-base focus:outline-none resize-none max-h-32 min-h-[40px] font-medium"
                rows={1}
              />
              <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-3 md:p-4 bg-blue-600 rounded-xl md:rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-30 shadow-xl shadow-blue-500/40">
                <svg width="20" height="20" md:width="24" md:height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p className="text-[7px] md:text-[8px] text-slate-600 text-center mt-3 uppercase tracking-widest">Neural Link by Mohammad Shuvo Ali</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICompanion;
