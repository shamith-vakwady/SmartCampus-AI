import React, { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Percent, AlertTriangle, ShieldAlert, Download, QrCode, Wifi, WifiOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { API_BASE, WS_BASE } from "../services/api";
import StatCard from "../components/StatCard";
import GlassCard from "../components/GlassCard";

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_students: 0,
    present_today: 0,
    absent_today: 0,
    attendance_percentage: 100.0,
  });
  const [logs, setLogs] = useState([]);
  const [unknownLogs, setUnknownLogs] = useState([]);
  const [livenessAlerts, setLivenessAlerts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [days, setDays] = useState(30);

  // Fetch stats and config info
  const fetchData = async () => {
    try {
      // Get dashboard stats
      const statsRes = await fetch(`${API_BASE}/analytics/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Get health and mobile URL details
      const healthRes = await fetch(`${API_BASE}/health`);
      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setQrValue(healthData.mobile_cam_url);
      }
      
      // Get recent logs
      const logsRes = await fetch(`${API_BASE}/attendance/logs?limit=15`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }

      // Get recent unknown logs
      const unknownRes = await fetch(`${API_BASE}/analytics/unknown-logs`);
      if (unknownRes.ok) {
        const unknownData = await unknownRes.json();
        setUnknownLogs(unknownData.slice(0, 10));
      }
    } catch (err) {
      console.error("Failed to load initial dashboard stats", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Web Speech API Voice synthesis
  const speakAttendance = (studentName) => {
    if ("speechSynthesis" in window) {
      // Cancel previous voices to prevent queuing delays
      window.speechSynthesis.cancel();
      const sentence = `Attendance marked for ${studentName}`;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Synthesized buzzer using Web Audio API (so we don't need audio files)
  const playWarningBuzzer = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // We play two low discordant square waves for a harsh buzzer sound
      const playFreq = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playFreq(130, audioCtx.currentTime, 0.4);
      playFreq(135, audioCtx.currentTime + 0.1, 0.4);
    } catch (e) {
      console.error("Failed to synthesize warning sound", e);
    }
  };

  // Connect WebSockets
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      ws = new WebSocket(`${WS_BASE}/dashboard`);

      ws.onopen = () => {
        setWsConnected(true);
        console.log("Dashboard WebSocket Connected");
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "ATTENDANCE_MARKED") {
          // Speak name
          speakAttendance(data.name);
          
          // Prepend to logs
          setLogs((prev) => [
            {
              id: Date.now(),
              student_id: data.student_id,
              student_name: data.name,
              timestamp: data.timestamp,
              status: data.status,
              method: data.method,
            },
            ...prev,
          ]);

          // Trigger stats refetch
          fetchData();
        } else if (data.type === "UNAUTHORIZED_DETECTED") {
          // Play warning audio buzzer
          playWarningBuzzer();

          // Add to unknown logs
          setUnknownLogs((prev) => [
            {
              id: Date.now(),
              image_path: data.image_path,
              timestamp: data.timestamp,
            },
            ...prev,
          ]);
          
          // Trigger stats refetch
          fetchData();
        } else if (data.type === "SPOOF_ATTEMPT") {
          // Play warning audio buzzer
          playWarningBuzzer();

          setLivenessAlerts((prev) => [
            {
              id: Date.now(),
              name: data.name || "Unknown Device",
              reason: data.reason || "Liveness analysis failed",
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        console.log("Dashboard WebSocket Closed. Attempting reconnect...");
        reconnectTimeout = setTimeout(connectWS, 3000);
      };

      ws.onerror = (err) => {
        console.error("Dashboard WebSocket encountered error:", err);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleDownloadReport = () => {
    window.open(`${API_BASE}/reports/download?days=${days}`, "_blank");
  };

  const handleClearUnknownLogs = async () => {
    if (confirm("Are you sure you want to clear all unauthorized logs?")) {
      try {
        await fetch(`${API_BASE}/analytics/unknown-logs/clear`, { method: "POST" });
        setUnknownLogs([]);
      } catch (err) {
        console.error("Failed to clear logs", err);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Banner Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className={`flex h-4 w-4 items-center justify-center rounded-full ${
            wsConnected ? "bg-cyberEmerald/25" : "bg-cyberRose/25"
          }`}>
            <div className={`h-2 w-2 rounded-full ${
              wsConnected ? "bg-cyberEmerald cyber-pulse" : "bg-cyberRose animate-pulse"
            }`} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Real-time Sensor Operations
              {wsConnected ? <Wifi className="h-4 w-4 text-cyberEmerald" /> : <WifiOff className="h-4 w-4 text-cyberRose" />}
            </h1>
            <p className="text-xs text-slate-400">
              {wsConnected ? "Receiving live authentication streams from campus cameras" : "Disconnected from socket. Reconnecting..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 text-xs rounded-lg px-2.5 py-1.5 focus:border-cyberPurple focus:ring-1 focus:ring-cyberPurple outline-none"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan px-3 py-1.5 text-xs font-semibold text-white shadow-cyber hover:opacity-90 active:scale-95 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            PDF Report
          </button>
        </div>
      </div>

      {/* Stats Counter Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Registered Students"
          value={stats.total_students}
          icon={Users}
          color="purple"
          description="Total active database profiles"
        />
        <StatCard
          title="Marked Present (Today)"
          value={stats.present_today}
          icon={UserCheck}
          color="green"
          description="Attended campus classes today"
        />
        <StatCard
          title="Unmarked / Absent (Today)"
          value={stats.absent_today}
          icon={UserX}
          color="red"
          description="Awaiting check-in scans"
        />
        <StatCard
          title="Attendance Rate (Today)"
          value={`${stats.attendance_percentage}%`}
          icon={Percent}
          color="cyan"
          description="Class registration check-in index"
        />
      </div>

      {/* Main Grid: QR / Live Logs / Warnings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* Left Side: QR Streamer Activation & Liveness warnings */}
        <div className="lg:col-span-4 space-y-6">
          <GlassCard title="Mobile camera scan QR" className="flex flex-col items-center text-center">
            {qrValue ? (
              <div className="mt-2 flex flex-col items-center space-y-4">
                <div className="p-3 bg-white rounded-xl shadow-cyanGlow border border-cyberCyan/40">
                  <QRCodeSVG value={qrValue} size={160} level="M" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-cyberCyan uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <QrCode className="h-3.5 w-3.5" /> Scan to sync mobile
                  </span>
                  <p className="text-[10px] text-slate-400 max-w-[220px]">
                    Opens the webcam streamer on your mobile device. Stream feeds directly to the dashboard over Wi-Fi.
                  </p>
                </div>
                <div className="w-full text-left bg-slate-950/80 p-2.5 rounded-lg border border-white/5">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Stream Address</span>
                  <a href={qrValue} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-cyberPurple break-all hover:underline">
                    {qrValue}
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-10">Resolving platform IP address...</p>
            )}
          </GlassCard>

          {/* Liveness / Security Alerts */}
          <GlassCard title="Security & Spoofing logs" className="h-fit">
            {livenessAlerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No liveness check warnings logged today.</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {livenessAlerts.map((alert) => (
                  <div key={alert.id} className="flex gap-3 bg-cyberRose/5 border border-cyberRose/20 p-2.5 rounded-lg text-xs">
                    <ShieldAlert className="h-5 w-5 text-cyberRose shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{alert.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-cyberRose mt-0.5">{alert.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Center: Live Logs Feed */}
        <div className="lg:col-span-5">
          <GlassCard title="Real-Time Attendance Stream" className="h-[520px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-2">
                  <Users className="h-10 w-10 text-slate-600 animate-pulse" />
                  <p className="text-xs">No active logs yet. Start scanning faces or upload images to register attendance.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-slate-900/40 hover:bg-slate-900/70 transition-all duration-200"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{log.student_name}</span>
                        <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-400 font-mono">
                          {log.student_id}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span>&bull;</span>
                        <span className="text-slate-500">{log.method}</span>
                      </div>
                    </div>
                    <div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        log.status === "PRESENT"
                          ? "bg-cyberEmerald/10 text-cyberEmerald border border-cyberEmerald/20"
                          : log.status === "LATE"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-cyberRose/10 text-cyberRose border border-cyberRose/20"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Unknown Logs / Unauthorized Logs */}
        <div className="lg:col-span-3">
          <GlassCard
            title="Unauthorized Warnings"
            className="h-[520px] flex flex-col"
            headerAction={
              unknownLogs.length > 0 && (
                <button
                  onClick={handleClearUnknownLogs}
                  className="text-[10px] text-cyberRose hover:underline"
                >
                  Clear Logs
                </button>
              )
            }
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {unknownLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-2 py-10">
                  <ShieldAlert className="h-10 w-10 text-slate-600" />
                  <p className="text-xs">No unauthorized persons detected.</p>
                </div>
              ) : (
                unknownLogs.map((log) => {
                  const API_HOST = window.location.hostname;
                  const imageSrc = `${window.location.protocol}//${API_HOST}:8000/${log.image_path}`;
                  return (
                    <div
                      key={log.id}
                      className="border border-cyberRose/15 bg-cyberRose/5 p-3 rounded-lg flex flex-col space-y-2.5 hover:border-cyberRose/30 transition-all"
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-cyberRose font-semibold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" /> Intruder alert
                        </span>
                        <span className="text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      
                      <div className="relative aspect-video rounded-md overflow-hidden bg-slate-950 border border-white/5 flex items-center justify-center">
                        <img
                          src={imageSrc}
                          alt="Unauthorized Capture"
                          className="object-cover h-full w-full max-h-28"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=300&auto=format&fit=crop"; // fallback color gradient
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 block break-all font-mono leading-none">
                        Captured at: {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
        
      </div>
    </div>
  );
}
