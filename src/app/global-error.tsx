"use client";

  import { Inter, Plus_Jakarta_Sans } from "next/font/google";
  import { ShieldAlert, RefreshCcw } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display" });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" suppressHydrationWarning>
          <div className="max-w-md w-full space-y-8 text-center bg-card p-8 rounded-3xl border border-destructive/20 shadow-2xl relative overflow-hidden">
            {/* Background warning pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, #dc2626 10px, #dc2626 20px)" }} />
            
            <div className="relative z-10 space-y-6">
              <div className="mx-auto w-20 h-20 bg-destructive/10 text-destructive flex items-center justify-center rounded-2xl border border-destructive/20 shadow-[0_0_40px_rgba(220,38,38,0.3)]">
                <ShieldAlert className="h-10 w-10" />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-display font-black text-foreground">Critical Error</h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The OPAL-AI network hit an unrecoverable state. Our servers might be syncing or an unexpected crash occurred.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl text-left border border-border">
                <p className="font-mono text-[10px] text-destructive uppercase tracking-widest font-bold">Error Trace:</p>
                <p className="font-mono text-xs text-muted-foreground truncate opacity-80 mt-1">
                  {error.message || "Unknown Application Exception"}
                </p>
              </div>

              <button
                onClick={() => reset()}
                className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-3.5 rounded-xl font-bold hover:bg-foreground/90 transition-all active:scale-95 shadow-lg"
              >
                <RefreshCcw className="h-4 w-4" />
                Reboot System
              </button>
            </div>
          </div>
      </body>
    </html>
  );
}
