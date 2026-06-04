import React, { useState, useEffect } from "react";
import { Search, Mail, Phone, Calendar, User, ArrowRight, X, Percent, Check, AlertTriangle, Eye } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { API_BASE, DATA_BASE } from "../services/api";
import GlassCard from "../components/GlassCard";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudentProfileDetails = async (studentId) => {
    try {
      // Find local student info
      const student = students.find((s) => s.student_id === studentId);
      setSelectedStudent(student);

      // Fetch attendance history for student
      const res = await fetch(`${API_BASE}/students/${studentId}`);
      if (res.ok) {
        const detailData = await res.json();
        setSelectedStudent(detailData); // includes images list
      }

      // Fetch historical logs
      const historyRes = await fetch(`${API_BASE}/attendance/logs`); // fallback search
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const studentLogs = historyData.filter((log) => log.student_id === studentId);
        setHistory(studentLogs);
        
        // Calculate present vs total school days
        const present = studentLogs.filter((log) => log.status === "PRESENT" || log.status === "LATE").length;
        const total = studentLogs.length;
        setStats({
          present,
          absent: Math.max(0, total - present),
          total
        });
      }
    } catch (err) {
      console.error("Failed to load student profile logs", err);
    }
  };

  const handleCloseProfile = () => {
    setSelectedStudent(null);
    setHistory([]);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  // Prepare simple trend data for Recharts in profile view
  const getTrendData = () => {
    if (history.length === 0) return [];
    
    // Sort chronological ascending
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    let presentAcc = 0;
    
    return sorted.map((log, idx) => {
      if (log.status === "PRESENT" || log.status === "LATE") {
        presentAcc += 1;
      }
      const totalDays = idx + 1;
      return {
        name: new Date(log.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        rate: Math.round((presentAcc / totalDays) * 100)
      };
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6 relative overflow-hidden">
      
      {/* Header and Search bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Campus Student Directory</h1>
          <p className="text-xs text-slate-400">Search and audit student detail profiles, liveness embeddings, and check-in logs.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID, name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs focus:border-cyberPurple focus:ring-1 focus:ring-cyberPurple outline-none text-white"
          />
        </div>
      </div>

      {/* Grid of Student Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredStudents.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500 text-xs">
            No registered students found matching your search.
          </div>
        ) : (
          filteredStudents.map((student) => {
            // Find profile picture if exists
            const profileImg = student.images && student.images.length > 0 
              ? `${DATA_BASE}/${student.images[0].file_path}`
              : null;
              
            const isDanger = student.attendance_percentage < 75;

            return (
              <div
                key={student.student_id}
                onClick={() => fetchStudentProfileDetails(student.student_id)}
                className="glass-panel glass-panel-hover border border-white/5 rounded-xl p-5 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center gap-4">
                  {profileImg ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
                      <img src={profileImg} alt={student.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-cyberPurple/10 border border-cyberPurple/25 flex items-center justify-center text-cyberPurple text-lg font-bold">
                      {student.name.charAt(0)}
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{student.name}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {student.student_id}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-semibold">Attendance Rate</span>
                    <span className={`text-base font-extrabold mt-1 block ${
                      isDanger ? "text-cyberRose animate-pulse" : "text-cyberEmerald"
                    }`}>
                      {student.attendance_percentage}%
                    </span>
                  </div>
                  
                  <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white transition">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Slide-over Profile panel */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={handleCloseProfile} />

          {/* Drawer container */}
          <div className="relative w-full max-w-lg bg-slate-900 border-l border-white/10 shadow-2xl h-full overflow-y-auto flex flex-col justify-between p-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-mono font-bold tracking-widest text-cyberPurple uppercase flex items-center gap-1.5">
                <User className="h-4 w-4" /> Student Profile File
              </span>
              <button onClick={handleCloseProfile} className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile contents */}
            <div className="flex-1 py-6 space-y-6">
              
              {/* Photo & Identity details */}
              <div className="flex items-center gap-5 bg-slate-950/60 p-4 rounded-xl border border-white/5">
                {selectedStudent.images && selectedStudent.images.length > 0 ? (
                  <div className="h-20 w-20 rounded-xl overflow-hidden border border-cyberPurple/30 bg-slate-950 flex items-center justify-center shadow-cyber">
                    <img src={`${DATA_BASE}/${selectedStudent.images[0].file_path}`} alt={selectedStudent.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-20 w-20 rounded-xl bg-cyberPurple/15 border border-cyberPurple/40 flex items-center justify-center text-cyberPurple text-2xl font-bold">
                    {selectedStudent.name.charAt(0)}
                  </div>
                )}

                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">{selectedStudent.name}</h2>
                  <span className="text-xs font-mono text-cyberCyan block">ID: {selectedStudent.student_id}</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedStudent.status === "Active" ? "bg-cyberEmerald/10 text-cyberEmerald" : "bg-slate-800 text-slate-400"
                  }`}>
                    {selectedStudent.status}
                  </span>
                </div>
              </div>

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1"><Mail className="h-3 w-3" /> Email Address</span>
                  <span className="text-slate-200 mt-1 truncate block">{selectedStudent.email}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1"><Phone className="h-3 w-3" /> Phone Number</span>
                  <span className="text-slate-200 mt-1 block">{selectedStudent.phone || "Not Configured"}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Enrolled Date</span>
                  <span className="text-slate-200 mt-1 block">
                    {new Date(selectedStudent.enrollment_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1"><Percent className="h-3 w-3" /> Attendance Index</span>
                  <span className={`font-extrabold mt-1 block ${
                    selectedStudent.attendance_percentage < 75 ? "text-cyberRose" : "text-cyberEmerald"
                  }`}>
                    {selectedStudent.attendance_percentage}%
                  </span>
                </div>
              </div>

              {/* Trend Chart using Recharts */}
              {history.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance trend rate</h4>
                  <div className="h-32 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={getTrendData()} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="profileRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", fontSize: "10px" }} />
                        <Area type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={1} fill="url(#profileRate)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Monthly Stats */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Academic Month summary</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-cyberEmerald/5 border border-cyberEmerald/10 rounded-lg p-2.5">
                    <span className="text-[9px] text-cyberEmerald font-bold uppercase tracking-wide">Present</span>
                    <span className="text-base font-extrabold text-white block mt-1">{stats.present}</span>
                  </div>
                  <div className="bg-cyberRose/5 border border-cyberRose/10 rounded-lg p-2.5">
                    <span className="text-[9px] text-cyberRose font-bold uppercase tracking-wide">Absent</span>
                    <span className="text-base font-extrabold text-white block mt-1">{stats.absent}</span>
                  </div>
                  <div className="bg-slate-900/60 border border-white/5 rounded-lg p-2.5">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Sessions</span>
                    <span className="text-base font-extrabold text-white block mt-1">{stats.total}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Log History */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chronological check-in history</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-4 text-center">No recorded scan logs for this student.</p>
                  ) : (
                    history.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/40 border border-white/5 text-[11px]">
                        <div className="flex items-center gap-2">
                          {log.status === "PRESENT" || log.status === "LATE" ? (
                            <span className="h-4 w-4 rounded-full bg-cyberEmerald/15 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-cyberEmerald" /></span>
                          ) : (
                            <span className="h-4 w-4 rounded-full bg-cyberRose/15 flex items-center justify-center"><ArrowRight className="h-2.5 w-2.5 text-cyberRose rotate-45" /></span>
                          )}
                          <span className="text-slate-300 font-medium">
                            {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[10px] font-mono">{log.method}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Profile Footer */}
            <div className="border-t border-white/5 pt-4 text-center">
              <span className="text-[9px] text-slate-500 font-mono">
                Smart Campus Platform &bull; Student ID: {selectedStudent.student_id}
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
