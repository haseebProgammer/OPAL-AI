"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  MessageSquare, 
  Search, 
  User, 
  Clock, 
  MoreVertical, 
  ShieldCheck,
  Building2,
  Phone
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function ClinicalChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 1. Auth & Session Management
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  // 2. Realtime Subscription
  useEffect(() => {
    if (!currentUser) return;

    // Listen for new messages in real-time via Supabase
    const channel = supabase
      .channel('clinical-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id) {
            setMessages(prev => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // 3. Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    try {
      const { error } = await supabase.from('messages').insert({
        content: newMessage,
        sender_id: currentUser.id,
        receiver_id: 'SYSTEM_BROADCAST_HUB', // For demo purposes, we broadcast
      });

      if (error) throw error;
      setNewMessage("");
    } catch (err: any) {
      toast.error("Message failed to send");
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6">
      {/* Sidebar: Conversations */}
      <div className="w-80 glass-card rounded-[2.5rem] border border-border flex flex-col overflow-hidden bg-card/30">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-black font-display uppercase tracking-tight mb-4">Channels</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search registry contacts..." 
              className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
           {['Emergency Response Hub', 'National Donor Registry', 'Lab Verification Team'].map((name, i) => (
             <button 
               key={name}
               onClick={() => setActiveChannel(name)}
               className={`w-full p-4 rounded-2xl flex items-start gap-4 transition-all ${activeChannel === name ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-muted text-muted-foreground'}`}
             >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${activeChannel === name ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                    {i === 0 ? <ShieldCheck className="w-5 h-5" /> : i === 1 ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div className="text-left overflow-hidden">
                    <p className={`text-xs font-black uppercase truncate ${activeChannel === name ? 'text-white' : 'text-foreground'}`}>{name}</p>
                    <p className={`text-[10px] font-medium truncate ${activeChannel === name ? 'text-white/60' : 'text-muted-foreground'}`}>Live Node Connection Active</p>
                </div>
             </button>
           ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass-card rounded-[2.5rem] border border-border flex flex-col overflow-hidden bg-card/30">
        <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-lg font-black font-display uppercase tracking-tight">{activeChannel || 'Select a Channel'}</h3>
                   <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">End-to-End Encrypted</span>
                   </div>
                </div>
            </div>
            <button className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80">
                <MoreVertical className="h-5 w-5" />
            </button>
        </div>

        {/* Messages Feed */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="text-center py-4">
                <span className="text-[9px] font-black uppercase bg-muted px-3 py-1 rounded-full text-muted-foreground tracking-widest">Today</span>
            </div>

            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                    <MessageSquare className="h-16 w-16 mb-4" />
                    <p className="text-sm font-black uppercase tracking-widest">Secure Messaging Protocol Ready</p>
                </div>
            ) : (
                messages.map((msg) => (
                    <motion.div 
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[70%] rounded-3xl px-6 py-4 ${
                            msg.sender_id === currentUser?.id 
                            ? 'bg-primary text-white shadow-xl shadow-primary/10 rounded-tr-none' 
                            : 'bg-muted text-foreground rounded-tl-none'
                        }`}>
                            <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                            <p className={`text-[9px] mt-2 font-black uppercase tracking-tighter ${msg.sender_id === currentUser?.id ? 'text-white/60' : 'text-muted-foreground'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </motion.div>
                ))
            )}
        </div>

        {/* Input Bar */}
        <div className="p-6 bg-muted/30 border-t border-border">
            <form onSubmit={sendMessage} className="relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a secure message to the clinical network..." 
                  className="w-full bg-card border border-border rounded-2xl px-6 py-4 pr-16 text-sm font-bold shadow-inner outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100"
                >
                    <Send className="h-5 w-5" />
                </button>
            </form>
            <div className="mt-3 flex items-center gap-4 justify-center">
                <span className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase opacity-50">
                    <ShieldCheck className="h-3 w-3" /> Encrypted Transmission
                </span>
                <span className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase opacity-50">
                    <Phone className="h-3 w-3" /> Verified Channel
                </span>
            </div>
        </div>
      </div>
    </div>
  );
}
