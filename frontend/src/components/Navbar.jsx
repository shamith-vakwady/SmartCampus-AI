import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Camera, Upload, BarChart3, Users, Settings, Cpu } from "lucide-react";

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/camera", label: "Live Camera", icon: Camera },
    { path: "/upload", label: "Image Upload", icon: Upload },
    { path: "/analytics", label: "AI Analytics", icon: BarChart3 },
    { path: "/students", label: "Students", icon: Users },
    { path: "/admin", label: "Admin Panel", icon: Settings },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-darkBg/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyberPurple to-cyberCyan shadow-cyber">
              <Cpu className="h-5 w-5 text-white" />
            </div>
            <span className="font-sans text-lg font-bold tracking-wider bg-gradient-to-r from-white via-slate-200 to-cyberCyan bg-clip-text text-transparent">
              SMART ATTEND
            </span>
            <span className="hidden sm:inline-block rounded-full border border-cyberCyan/30 bg-cyberCyan/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-cyberCyan">
              v1.0 AI
            </span>
          </div>

          <div className="hidden md:block">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 text-cyberCyan shadow-inner"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          
          <div className="flex md:hidden items-center gap-2">
            {/* Small screen indicator */}
            <span className="text-[10px] text-slate-500 font-mono">{location.pathname}</span>
          </div>
        </div>
      </div>
      
      {/* Mobile nav bottom strip */}
      <div className="flex md:hidden justify-around border-t border-white/5 bg-slate-950/60 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 rounded px-2 py-1 text-[9px] font-medium transition-all ${
                isActive ? "text-cyberCyan" : "text-slate-500"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
