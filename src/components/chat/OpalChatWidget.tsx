"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  RefreshCcw
} from "lucide-react";
import { useOpalChat } from "@/hooks/useOpalChat";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/config";

const SUGGESTIONS = {
  donor: [
    "How do I update my availability?",
    "What organs can I donate?",
    "How does matching work?"
  ],
  hospital: [
    "Explain my latest match results",
    "What does the AI score mean?",
    "How do I submit a new request?"
  ],
  admin: [
    "How many active donors do we have?",
    "Show me this week's match requests",
    "Any unusual activity?"
  ]
};

const WELCOME_MESSAGES = {
  donor: "Hi! I'm OPAL Assistant. I can help you with donor registration, understanding your dashboard, and answering questions about the donation process. How can I help?",
  hospital: "Hello. I'm OPAL Assistant. I can explain match results, AI scores, and guide you through coordinator workflows. What do you need help with?",
  admin: "OPAL Admin Assistant ready. I can pull system stats and help you interpret platform data. What would you like to know?"
};

export function OpalChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [role, setRole] = useState<"donor" | "hospital" | "admin" | any>("donor");
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isLoading, clearChat } = useOpalChat();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    console.log(`[OPAL-DEBUG] Chat Widget Connected. API Endpoint: ${API_BASE_URL}`);
  }, []);

  useEffect(() => {
    async function updateRole() {
      // 1. Path-based Role Detection (Dynamic Context)
      if (pathname.includes('/dashboard/admin')) {
        setRole('admin');
        return;
      }
      if (pathname.includes('/dashboard/hospital')) {
        setRole('hospital');
        return;
      }
      if (pathname.includes('/dashboard/donor')) {
        setRole('donor');
        return;
      }

      // 2. Default to Public (Donor) for all other pages (Landing, etc)
      // Even if the user is an admin, we show public assistant mode on public pages
      setRole('donor');
    }
    if (mounted) updateRole();
  }, [pathname, mounted, supabase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[380px] sm:w-[420px] h-[550px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">OPAL Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-80">
                      {role} Mode
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  title="New Chat"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-muted/20"
            >
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="space-y-3">
                  <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none text-sm text-foreground shadow-sm">
                    {WELCOME_MESSAGES[role as keyof typeof WELCOME_MESSAGES] || WELCOME_MESSAGES.donor}
                  </div>
                  
                  {messages.length === 0 && (
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS[role as keyof typeof SUGGESTIONS]?.map((s) => (
                        <button
                          key={s}
                          onClick={() => sendMessage(s)}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-all text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn("max-w-[80%] space-y-1.5", m.role === "user" ? "text-right" : "text-left")}>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm border",
                      m.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20" 
                        : "bg-card text-foreground rounded-tl-none border-border"
                    )}>
                      {m.text}
                      <p className="text-[8px] opacity-60 mt-1 font-mono uppercase">
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border border-border p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Generating...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border">
              <div className="relative flex items-center">
                <textarea
                  className="w-full bg-muted/40 border border-border rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none max-h-32"
                  placeholder="Type a message..."
                  rows={1}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-3xl shadow-2xl flex items-center justify-center border transition-all duration-300",
          isOpen 
            ? "bg-muted text-foreground border-border rotate-90" 
            : "bg-primary text-primary-foreground border-primary/20"
        )}
      >
        {isOpen ? <ChevronDown className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 h-4 w-4 bg-success rounded-full border-2 border-background animate-pulse" />
        )}
      </motion.button>
    </div>
  );
}
