"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {

    async function handleRedirection() {
      try {
        // getUser() forces a server check to ensure the latest metadata/role
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error("Auth verification failed:", authError);
          router.push("/auth/login");
          return;
        }

        const detectedRole = user.user_metadata?.role;
        const isAdminEmail = user.email === "ranahaseeb9427@gmail.com";
        
        setRole(isAdminEmail ? "admin (override)" : (detectedRole || "No Role Assigned"));

        const redirectMap: Record<string, string> = {
          admin: "/dashboard/admin",
          hospital: "/dashboard/hospital",
          donor: "/dashboard/donor", 
        };

        // If the user already has a preferred view in state or we are just landing,
        // redirect to their default home.
        const targetPath = isAdminEmail ? "/dashboard/admin" : (detectedRole ? redirectMap[detectedRole as keyof typeof redirectMap] : "/dashboard/donor");

        router.replace(targetPath || "/dashboard/donor");
      } catch (error) {
        console.error("Redirection error:", error);
        router.push("/auth/login");
      }
    }

    handleRedirection();
  }, [router, supabase]);

  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-6 bg-background">
      <div className="relative">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary/20" />
      </div>
      <div className="text-center space-y-2">
        <p className="text-lg font-bold tracking-tight">Authenticating Secure Profile</p>
        <p className="text-sm text-muted-foreground">
          System detected role: <span className="text-primary font-mono font-bold uppercase">{role || "Identifying..."}</span>
        </p>
      </div>
    </div>
  );
}


