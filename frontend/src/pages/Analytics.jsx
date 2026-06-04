import React, { useState, useEffect } from "react";
import { AlertTriangle, TrendingUp, Calendar, Clock, ArrowDownRight, ShieldAlert, Cpu } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { API_BASE } from "../services/api";
import GlassCard from "../components/GlassCard";

export default function Analytics() {
  const [alerts, setAlerts] = useState({ low_attendance_alerts: [], frequent_absentees: [] });
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [days, setDays] = useState(7);

  const fetchAnalytics = async () => {
    try {
      // Alerts
      const alertsRes = await fetch(`${API_BASE}/analytics/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      // Trends
      const trendsRes = await fetch(`${API_BASE}/analytics/trends?days=${days}`);
      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends(trendsData);
      }

      // Heatmap
      const heatmapRes = await fetch(`${API_BASE}/analytics/heatmap`);
      if (heatmapRes.ok) {
        const heatmapData = await heatmapRes.json();
        setHeatmap(heatmapData);
      }
    } catch (err) {
      console.error("Failed to load analytics details", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  // Re-organize heatmap list to a 2D matrix structure for easy rendering: { Mon: { "8:00": count, ... }, ... }
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const hours = Array.from({ length: 10 }, (_, i) => `${i + 8}:00`);

  const getHeatmapValue = (day, hour) => {
    const item = heatmap.find((h) => h.day === day && h.hour === hour);
    return item ? item.count : 0;
  };

  // Find max value in heatmap to scale opacity/brightness
  const maxHeatmapCount = heatmap.length > 0 ? Math.max(...heatmap.map((h) => h.count), 1) : 1;

  // Heatmap color generator
  const getHeatmapColor = (count) => {
    if (count === 0) return "bg-white/[0.02] border-white/5";
    const opacity = Math.min(0.15 + (count / maxHeatmapCount) * 0.85, 1);
    return {
      backgroundColor: `rgba(139, 92, 246, ${opacity})`,
      borderColor: `rgba(139, 92, 246, ${opacity + 0.1})`,
      boxShadow: opacity > 0.6 ? "0 0 10px rgba(139, 92, 246, 0.3)" : "none"
    };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            AI Operations & Analytics Room
            <Cpu className="h-5 w-5 text-cyberCyan" />
          </h1>
          <p className="text-xs text-slate-400">Review algorithmic anomalies, attendance trends, and school day activity densities.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase">Filter Trend Days</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyberPurple focus:ring-1 focus:ring-cyberPurple outline-none"
          >
            <option value={7}>Last 7 School Days</option>
            <option value={14}>Last 14 School Days</option>
            <option value={30}>Last 30 School Days</option>
          </select>
        </div>
      </div>

      {/* Graphs & Trends Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Daily Attendance Trend (Area Chart) */}
        <div className="lg:col-span-8">
          <GlassCard title="Daily Campus Attendance Trend">
            {trends.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                No trend logs available for the selected dates.
              </div>
            ) : (
              <div className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendRate" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="rate" name="Attendance Rate %" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#trendRate)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Present/Absent Area volume */}
        <div className="lg:col-span-4">
          <GlassCard title="Daily Attendee Volume">
            {trends.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                No Volume stats.
              </div>
            ) : (
              <div className="h-64 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volPresent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="volAbsent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: "11px" }} />
                    <Area type="monotone" dataKey="present" name="Present Count" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#volPresent)" />
                    <Area type="monotone" dataKey="absent" name="Absent Count" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={1} fill="url(#volAbsent)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* Heatmap & Alerts grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Attendance Heatmap Matrix */}
        <div className="lg:col-span-7">
          <GlassCard title="Campus Scanning Volume Heatmap">
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Weekdays vs Hours</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Normal check-ins: 8 AM - 5 PM</span>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  {/* Hours Header Row */}
                  <div className="grid grid-cols-11 gap-1 text-center font-mono text-[9px] text-slate-500 pb-2">
                    <div></div> {/* Space for Weekday label */}
                    {hours.map((h) => (
                      <div key={h}>{h}</div>
                    ))}
                  </div>

                  {/* Weekdays Grid */}
                  <div className="space-y-1.5">
                    {weekdays.map((day) => (
                      <div key={day} className="grid grid-cols-11 gap-1.5 items-center">
                        {/* Weekday Label */}
                        <div className="text-left font-sans text-xs font-semibold text-slate-400 pr-2">
                          {day}
                        </div>
                        
                        {/* Hour Cells */}
                        {hours.map((hour) => {
                          const count = getHeatmapValue(day, hour);
                          const style = getHeatmapColor(count);
                          const isCustom = typeof style === "object";
                          
                          return (
                            <div
                              key={hour}
                              title={`${day} at ${hour}: ${count} check-ins`}
                              style={isCustom ? style : {}}
                              className={`aspect-square rounded border flex items-center justify-center text-[8px] font-bold transition-all duration-300 hover:scale-115 ${
                                !isCustom ? style : ""
                              } ${
                                count > 0 ? "text-white" : "text-transparent"
                              }`}
                            >
                              {count}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Heatmap Legend */}
              <div className="flex justify-end items-center gap-2 text-[9px] text-slate-500 pr-1">
                <span>Low Scan</span>
                <div className="h-2 w-4 rounded bg-cyberPurple/20 border border-cyberPurple/30" />
                <div className="h-2 w-4 rounded bg-cyberPurple/50 border border-cyberPurple/60" />
                <div className="h-2 w-4 rounded bg-cyberPurple/80 border border-cyberPurple/90" />
                <span>High Scan</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* AI Alerts Column */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard title="Security & Absency Anomalies">
            <div className="space-y-4">
              
              {/* Low Attendance (<75%) */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-cyberRose uppercase tracking-widest flex items-center gap-1.5">
                  <ArrowDownRight className="h-4 w-4" /> Low Attendance Index (&lt; 75%)
                </span>
                
                {alerts.low_attendance_alerts.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-5">All students hold a healthy attendance rate above 75%.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {alerts.low_attendance_alerts.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-2.5 rounded-lg bg-cyberRose/5 border border-cyberRose/10 text-xs">
                        <div>
                          <span className="font-semibold text-slate-200 block">{student.name}</span>
                          <span className="text-[9px] font-mono text-slate-500">ID: {student.student_id}</span>
                        </div>
                        <span className="font-extrabold text-cyberRose font-mono">{student.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <hr className="border-white/5" />

              {/* Frequent Absentees (consecutive) */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Frequent absentee warning
                </span>
                
                {alerts.frequent_absentees.length === 0 ? (
                  <p className="text-xs text-slate-500 pl-5">No critical absenteeism streaks flagged in database.</p>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {alerts.frequent_absentees.map((student) => (
                      <div key={student.student_id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-200 block leading-tight">{student.name}</span>
                          <span className="text-[9px] font-mono text-slate-500">ID: {student.student_id}</span>
                          <p className="text-[9px] text-amber-500 mt-1">
                            Absent for {student.consecutive_absent_days} consecutive active school sessions (Overall: {student.percentage}%)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </GlassCard>
        </div>

      </div>

    </div>
  );
}
