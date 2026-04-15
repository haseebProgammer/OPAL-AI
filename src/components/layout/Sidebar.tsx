"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  LayoutDashboard,
  FileText,
  Cpu,
  Map,
  User,
  History,
  Activity,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { LogoutModal } from "./LogoutModal";

const hospitalNav = [
  { href: "/dashboard/hospital", label: "Control Room", icon: LayoutDashboard },
  { href: "/dashboard/hospital/requests", label: "Requests", icon: FileText },
  { href: "/dashboard/hospital/matching", label: "AI Matching", icon: Cpu },
  { href: "/dashboard/hospital/map", label: "Map View", icon: Map },
];

const donorNav = [
  { href: "/dashboard/donor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/donor/profile", label: "Health Profile", icon: User },
  { href: "/dashboard/donor/history", label: "History", icon: History },
];

const recipientNav = [
  { href: "/dashboard/recipient", label: "Tracker", icon: Activity },
];

const adminNav = [
  { href: "/dashboard/admin", label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/admin/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/dashboard/admin/donors", label: "Donors", icon: Heart },
  { href: "/dashboard/admin/hospitals", label: "Hospitals", icon: Building2 },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const collapsed = !isOpen;

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserRole(user.user_metadata?.role);
        setUserEmail(user.email || null);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Logout failed");
    }
  };

  // Determine which nav to show based on current path
  let navItems = hospitalNav;
  let roleLabel = "Hospital";
  if (pathname.startsWith("/dashboard/donor")) {
    navItems = donorNav;
    roleLabel = "Donor";
  } else if (pathname.startsWith("/dashboard/recipient")) {
    navItems = recipientNav;
    roleLabel = "Recipient";
  } else if (pathname.startsWith("/dashboard/admin")) {
    navItems = adminNav;
    roleLabel = "Admin";
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[260px]",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-5 w-5" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-lg font-bold whitespace-nowrap overflow-hidden"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  OPAL<span className="text-primary">-AI</span>
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={collapsed ? item.label : undefined}
                onClick={() => { if (window.innerWidth < 768) onToggle(); }}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Quick Role Switch (ONLY for Master Admins) */}
        {!collapsed && (userRole === "admin" || userEmail === "ranahaseeb9427@gmail.com") && (
          <div className="px-3 py-2 border-t border-border bg-primary/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2 px-3">
              Admin Controls
            </p>
            <div className="space-y-1">
              {[
                { href: "/dashboard/hospital", label: "Hospital View", icon: LayoutDashboard },
                { href: "/dashboard/donor", label: "Donor View", icon: User },
                { href: "/dashboard/admin", label: "Admin View", icon: ShieldCheck },
              ].map(r => (
                 <button 
                   key={r.href} 
                   onClick={() => { window.location.href = r.href; }}
                   className={cn(
                     "flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-tight transition-all w-full text-left",
                     pathname.startsWith(r.href) ? "text-primary bg-primary/20 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                   )}
                 >
                   <r.icon className="h-3.5 w-3.5" /> {r.label}
                 </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom */}
        <div className="flex items-center justify-between border-t border-border px-3 py-3">
          <ThemeToggle />
          {!collapsed && (
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Settings className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowLogoutModal(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      <LogoutModal 
        isOpen={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={handleLogout} 
      />
    </>
  );
}
