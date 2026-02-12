
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { GoogleGenAI, Modality, GenerateContentResponse, LiveServerMessage } from '@google/genai';
import { motion, AnimatePresence } from 'framer-motion';

// Manual base64 decoding helper
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Manual base64 encoding helper
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Manual raw PCM audio decoding as required by Live API guidelines
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

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
    
    Respond in the language the user uses (Bengali or English). 
    Process inputs instantly. Provide high-quality, concise academic assistance.`;

  useEffect(() => {
    if (!currentSessionId && chatSessions.length === 0) startNewChat();
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, currentSessionId, isVoiceActive]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !process.env.API_KEY) {
      if (!process.env.API_KEY) alert("Neural link offline: API Key not detected.");
      return;
    }
    
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: input, timestamp: Date.now() };
    addMessage(userMsg);
    setInput('');
    setIsTyping(true);

    // Initializing AI client right before use with direct API_KEY access
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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
        // Correctly accessing the text property instead of calling a text() method
        const textChunk = chunk.text;
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
      addMessage({ id: Date.now().toString(), role: 'assistant', content: "Neural link error. Please check your hosting configuration.", timestamp: Date.now() });
      setIsTyping(false);
    }
  };

  const startVoice = async () => {
    if (isVoiceActive) {
      if (sessionRef.current) {
        sessionRef.current.then((s: any) => s.close());
      }
      setVoiceActive(false);
      sourceNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) {}
      });
      sourceNodesRef.current.clear();
      return;
    }
    
    if (!process.env.API_KEY) {
      alert("API Key not found in environment variables.");
      return;
    }

    try {
      // New instance creation before connecting to ensure latest key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = outputCtx;

      let nextStartTime = 0;

      const createBlob = (data: Float32Array) => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
          int16[i] = data[i] * 32768;
        }
        return {
          data: encode(new Uint8Array(int16.buffer)),
          mimeType: 'audio/pcm;rate=16000',
        };
      };

      const sessionPromise = ai.live.connect({
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
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              // Send input only after the connection promise resolves
              sessionPromise.then((session) => {
                if (!isMuted) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputCtx,
                24000,
                1
              );
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.addEventListener('ended', () => {
                sourceNodesRef.current.delete(source);
              });

              // Track end time for gapless playback scheduling
              nextStartTime = Math.max(nextStartTime, outputCtx.currentTime);
              source.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
              sourceNodesRef.current.add(source);
            }

            // Handle session interruption as required by guidelines
            const interrupted = message.serverContent?.interrupted;
            if (interrupted) {
              for (const source of sourceNodesRef.current.values()) {
                try {
                  source.stop();
                } catch (e) {}
              }
              sourceNodesRef.current.clear();
              nextStartTime = 0;
            }
          },
          onclose: () => setVoiceActive(false),
          onerror: () => setVoiceActive(false)
        }
      });
      sessionRef.current = sessionPromise;
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
      <div className="hidden md:flex w-80 bg-slate-900/60 border-r border-white/5 flex-col h-full">
        <div className="p-6 border-b border-white/5">
          <button onClick={startNewChat} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-500/20">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            নতুন আলোচনা
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {chatSessions.map(session => (
            <div key={session.id} className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'hover:bg-white/5 text-slate-400'}`} onClick={() => setCurrentSession(session.id)}>
              <span className="text-xs font-bold truncate">{session.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-grow flex flex-col min-w-0 h-full">
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
           <div className="flex items-center gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-sm md:text-lg">A</div>
              <div>
                <h3 className="font-heading font-black text-xs md:text-base tracking-tighter uppercase">Mohashoy</h3>
                <span className="text-[7px] md:text-[9px] text-green-500 font-bold uppercase tracking-widest">Active Neural Link</span>
              </div>
           </div>
           <div className="flex items-center gap-2">
             <button onClick={startVoice} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl transition-all flex items-center gap-2 font-bold text-[10px] md:text-xs ${isVoiceActive ? 'bg-red-600 animate-pulse text-white' : 'bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'}`}>🎙️ {isVoiceActive ? "STOP" : "কথা বলুন"}</button>
           </div>
        </div>
        <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-8 scroll-smooth relative">
          {!isVoiceActive && messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 md:p-6 rounded-[20px] md:rounded-[25px] max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'glass bg-slate-800/60 text-slate-100 rounded-tl-none border-white/10'}`}>
                <p className="text-xs md:text-base leading-relaxed whitespace-pre-wrap font-medium">{msg.content || (msg.role === 'assistant' ? "Thinking..." : "")}</p>
                {msg.id !== '1' && (
                  <div className={`flex gap-3 mt-4 pt-3 border-t ${msg.role === 'user' ? 'border-blue-400/30' : 'border-white/5'}`}>
                    <button onClick={() => handleCopy(msg.content)} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">Copy</button>
                    <button onClick={() => handleShare(msg.content)} className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1">Share</button>
                    <button onClick={() => deleteMessage(msg.id)} className="text-[10px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1">Delete</button>
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
               <div className="relative flex items-center justify-center scale-[0.6] sm:scale-75 md:scale-100">
                  {[...Array(5)].map((_, i) => (
                    <motion.div key={i} animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1], rotate: [0, 180, 360] }} transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }} className="absolute border-2 border-blue-500/20 rounded-full" style={{ width: 80 + i * 35, height: 80 + i * 35 }} />
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
                 <button onClick={() => setIsMuted(!isMuted)} className={`w-10 h-10 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}>{isMuted ? "Muted" : "Mute"}</button>
                 <div className="w-px h-6 md:h-10 bg-white/10" />
                 <button onClick={startVoice} className="px-4 md:px-10 py-3 md:py-5 bg-red-600 rounded-xl md:rounded-2xl font-black text-[9px] md:text-xs uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl shadow-red-500/20">End Session</button>
               </div>
            </div>
          )}
        </div>
        {!isVoiceActive && (
          <div className="p-4 md:p-8 bg-slate-900/60 border-t border-white/5">
            <div className="flex items-end gap-3 md:gap-4 bg-slate-950/60 rounded-[20px] md:rounded-[25px] border border-white/10 p-2 md:p-3 shadow-inner">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Mohashoy-কে প্রশ্ন করুন..." className="flex-grow bg-transparent px-3 md:px-4 py-2 md:py-3 text-xs md:text-base focus:outline-none resize-none max-h-32 min-h-[40px] font-medium" rows={1} />
              <button onClick={handleSend} disabled={!input.trim() || isTyping} className="p-3 md:p-4 bg-blue-600 rounded-xl md:rounded-2xl hover:bg-blue-500 transition-all disabled:opacity-30 shadow-xl shadow-blue-500/40">🚀</button>
            </div>
            <p className="text-[7px] md:text-[8px] text-slate-600 text-center mt-3 uppercase tracking-widest">Neural Link by Mohammad Shuvo Ali</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICompanion;
