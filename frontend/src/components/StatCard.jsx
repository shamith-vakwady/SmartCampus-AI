import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  trendType = "up", // up | down
  color = "purple" // purple | cyan | green | red
}) {
  const colorMap = {
    purple: {
      glow: "hover:shadow-cyber",
      iconBg: "bg-cyberPurple/10 text-cyberPurple border-cyberPurple/25",
      border: "hover:border-cyberPurple/30"
    },
    cyan: {
      glow: "hover:shadow-cyanGlow",
      iconBg: "bg-cyberCyan/10 text-cyberCyan border-cyberCyan/25",
      border: "hover:border-cyberCyan/30"
    },
    green: {
      glow: "hover:shadow-greenGlow",
      iconBg: "bg-cyberEmerald/10 text-cyberEmerald border-cyberEmerald/25",
      border: "hover:border-cyberEmerald/30"
    },
    red: {
      glow: "hover:shadow-redGlow",
      iconBg: "bg-cyberRose/10 text-cyberRose border-cyberRose/25",
      border: "hover:border-cyberRose/30"
    }
  };

  const selectedColor = colorMap[color] || colorMap.purple;

  return (
    <div className={`glass-panel glass-panel-hover rounded-xl p-5 border border-white/5 ${selectedColor.glow} ${selectedColor.border}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </span>
        {Icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${selectedColor.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
          {value}
        </h2>
      </div>

      {(description || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span className={`flex items-center font-medium ${
              trendType === "up" ? "text-cyberEmerald" : "text-cyberRose"
            }`}>
              {trendType === "up" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
              {trend}
            </span>
          )}
          {description && (
            <span className="text-slate-400 truncate">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
