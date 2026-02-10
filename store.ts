
import { create } from 'zustand';
import { AppView, User, Message, Note, Resource, ChatSession } from './types';
import { supabase } from './services/supabase';

interface AppState {
  currentView: AppView;
  user: User | null;
  chatSessions: ChatSession[];
  currentSessionId: string | null;
  notes: Note[];
  selectedNoteId: string | null;
  resources: Resource[];
  isChatOpen: boolean;
  isAuthModalOpen: boolean;
  isVoiceActive: boolean;
  
  setView: (view: AppView) => void;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  setVoiceActive: (active: boolean) => void;
  
  // Chat Actions
  startNewChat: () => void;
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  deleteMessage: (id: string) => void;
  setCurrentSession: (id: string) => void;
  deleteSession: (id: string) => void;

  setChatOpen: (isOpen: boolean) => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  
  // Cloud Sync Actions
  fetchUserData: () => Promise<void>;
  editNote: (id: string | null) => void;
  readNote: (id: string) => void;
  upsertNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  addResource: (resource: Resource) => Promise<void>;
  deleteResource: (id: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  currentView: AppView.LANDING,
  user: null,
  isAuthModalOpen: false,
  isVoiceActive: false,
  chatSessions: [],
  currentSessionId: null,
  notes: [],
  selectedNoteId: null,
  resources: [],
  isChatOpen: false,

  setView: (view) => set((state) => {
    if (!state.user && view !== AppView.LANDING) {
      return { isAuthModalOpen: true };
    }
    const resetNote = (view !== AppView.NOTES && view !== AppView.READ_NOTE) ? { selectedNoteId: null } : {};
    return { currentView: view, ...resetNote };
  }),

  setUser: (user) => {
    set({ user, isAuthModalOpen: false, currentView: user ? AppView.DASHBOARD : AppView.LANDING });
    if (user) get().fetchUserData();
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, currentView: AppView.LANDING, chatSessions: [], currentSessionId: null, notes: [], resources: [], selectedNoteId: null });
  },

  setVoiceActive: (active) => set({ isVoiceActive: active }),

  fetchUserData: async () => {
    const user = get().user;
    if (!user) return;

    const { data: notesData } = await supabase.from('notes').select('*').eq('author_id', user.id);
    if (notesData) {
      const formattedNotes = notesData.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        lastModified: parseInt(n.last_modified),
        authorId: n.author_id
      }));
      set({ notes: formattedNotes });
    }

    const { data: resData } = await supabase.from('resources').select('*').eq('user_id', user.id);
    if (resData) set({ resources: resData });
  },

  startNewChat: () => set((state) => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'নতুন আলোচনা',
      messages: [{ id: '1', role: 'assistant', content: "স্বাগতম! আমি অ্যারিস্টো। আমি কীভাবে সাহায্য করতে পারি?", timestamp: Date.now() }],
      lastUpdated: Date.now()
    };
    return {
      chatSessions: [newSession, ...state.chatSessions],
      currentSessionId: newSession.id
    };
  }),

  addMessage: (msg) => set((state) => {
    if (!state.currentSessionId) return state;
    const updatedSessions = state.chatSessions.map(session => {
      if (session.id === state.currentSessionId) {
        const title = msg.role === 'user' && session.messages.length <= 1 ? msg.content.substring(0, 30) + '...' : session.title;
        return {
          ...session,
          title,
          messages: [...session.messages, msg],
          lastUpdated: Date.now()
        };
      }
      return session;
    });
    return { chatSessions: updatedSessions };
  }),

  updateLastMessage: (content) => set((state) => {
    if (!state.currentSessionId) return state;
    const updatedSessions = state.chatSessions.map(session => {
      if (session.id === state.currentSessionId) {
        const lastMsgIndex = session.messages.length - 1;
        const updatedMessages = [...session.messages];
        updatedMessages[lastMsgIndex] = { ...updatedMessages[lastMsgIndex], content };
        return { ...session, messages: updatedMessages };
      }
      return session;
    });
    return { chatSessions: updatedSessions };
  }),

  deleteMessage: (id) => set((state) => {
    const updatedSessions = state.chatSessions.map(session => {
      if (session.id === state.currentSessionId) {
        return { ...session, messages: session.messages.filter(m => m.id !== id) };
      }
      return session;
    });
    return { chatSessions: updatedSessions };
  }),

  setCurrentSession: (id) => set({ currentSessionId: id }),
  
  deleteSession: (id) => set((state) => ({
    chatSessions: state.chatSessions.filter(s => s.id !== id),
    currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
  })),

  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  
  editNote: (id) => set({ selectedNoteId: id, currentView: AppView.NOTES }),
  readNote: (id) => set({ selectedNoteId: id, currentView: AppView.READ_NOTE }),

  upsertNote: async (note) => {
    const user = get().user;
    if (!user) return;
    
    const currentNotes = get().notes;
    const idx = currentNotes.findIndex(n => n.id === note.id);
    let newNotes = [];
    if (idx >= 0) {
      newNotes = [...currentNotes];
      newNotes[idx] = note;
    } else {
      newNotes = [note, ...currentNotes];
    }
    set({ notes: newNotes });

    await supabase.from('notes').upsert({
      id: note.id,
      title: note.title,
      content: note.content,
      last_modified: note.lastModified,
      author_id: user.id
    });
  },

  deleteNote: async (id) => {
    set({ notes: get().notes.filter(n => n.id !== id) });
    await supabase.from('notes').delete().eq('id', id);
  },

  addResource: async (resource) => {
    const user = get().user;
    if (!user) return;
    
    set({ resources: [...get().resources, resource] });
    await supabase.from('resources').insert({
      id: resource.id,
      name: resource.name,
      type: resource.type,
      url: resource.url,
      size: resource.size,
      uploaded_at: resource.uploadedAt,
      user_id: user.id
    });
  },

  deleteResource: async (id) => {
    set({ resources: get().resources.filter(r => r.id !== id) });
    await supabase.from('resources').delete().eq('id', id);
  },

  updateProfile: async (data) => {
    const user = get().user;
    if (!user) return;
    
    const updatedUser = { ...user, ...data };
    set({ user: updatedUser });

    await supabase.auth.updateUser({
      data: { ...data }
    });
  },
}));
