"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  PenSquare,
  BarChart2,
  Bookmark,
  Settings,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState<string>("User");
  const [initials, setInitials] = useState<string>("U");
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "User");
        setInitials(
          (user.email || "User").substring(0, 1).toUpperCase()
        );
      }

      const { data: userData } = await supabase
        .from("users")
        .select("credits_analyze, credits_generate")
        .eq("id", user?.id || "")
        .single();

      if (userData) {
        setCredits(
          (userData.credits_analyze || 0) + (userData.credits_generate || 0)
        );
      }
    }

    loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    { label: "Create Post", href: "/create", icon: PenSquare },
    { label: "Analyze Post", href: "/analyze", icon: BarChart2 },
    { label: "Saved Drafts", href: "/drafts", icon: Bookmark },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 bottom-0 bg-white border-r z-10">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/dashboard" className="text-xl font-bold text-blue-600">
            LinkedIn AI
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <div className="mb-4 px-3">
            <p className="text-sm font-medium text-gray-900 truncate">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </aside>

      {/* BOTTOM NAV (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 px-2 pb-safe pt-2 flex justify-around">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg min-w-[64px] transition-colors ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-0">
        {/* HEADER */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10 shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full flex items-center gap-1.5 border border-gray-200 shadow-sm">
              <span className="text-gray-400">✦</span>
              {credits} credits
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shadow-sm ring-1 ring-blue-200">
              {initials}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
