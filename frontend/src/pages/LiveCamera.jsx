import React, { useRef, useState, useEffect } from "react";
import { Camera, CameraOff, Video, AlertTriangle, CheckCircle, ShieldAlert } from "lucide-react";
import { WS_BASE } from "../services/api";
import GlassCard from "../components/GlassCard";

export default function LiveCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Camera Offline");
  const [statusCode, setStatusCode] = useState("offline"); // offline, scanning, success, unknown, warning, spoof
  const [scannedName, setScannedName] = useState("");
  const [fps, setFps] = useState(0);

  const socketRef = useRef(null);
  const intervalRef = useRef(null);
  const frameCountRef = useRef(0);

  // FPS ticker
  useEffect(() => {
    if (!streamActive) return;
    const interval = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, [streamActive]);

  const startCamera = async () => {
    setStatusMessage("Initializing Sensor...");
    setStatusCode("scanning");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }

      // Open WebSocket
      const client_id = `webcam_${Math.random().toString(36).substring(7)}`;
      const ws = new WebSocket(`${WS_BASE}/camera/${client_id}`);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatusMessage("Radar Active. Look at camera...");
        setStatusCode("scanning");
      };

      ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        setStatusCode(result.status);
        setStatusMessage(result.message);
        
        if (result.status === "success") {
          setScannedName(result.student_name);
          // Return to scanning state after 3 seconds
          setTimeout(() => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              setStatusCode("scanning");
              setStatusMessage("Radar Active. Look at camera...");
            }
          }, 3000);
        }
      };

      ws.onclose = () => {
        console.log("Webcam WebSocket closed");
      };

      // Frame grabbing loop (5 FPS)
      intervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN && videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = 320;
            canvas.height = 240;
            
            // Draw video to canvas scaled down to 320x240 for fast transmission
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Compress image to JPEG at 0.5 quality (approx 20KB per frame)
            const base64Image = canvas.toDataURL("image/jpeg", 0.5);
            
            // Send over WebSocket
            ws.send(JSON.stringify({
              type: "frame",
              image: base64Image
            }));
            
            frameCountRef.current += 1;
          }
        }
      }, 200); // 200ms -> 5 frames per second

    } catch (err) {
      console.error("Camera access failed", err);
      setStatusMessage("Failed to connect webcam. Verify permission.");
      setStatusCode("offline");
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    setStatusMessage("Camera Offline");
    setStatusCode("offline");
    setStreamActive(false);
    setScannedName("");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (socketRef.current) {
      socketRef.current.close();
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // UI styling depending on result status code
  const getStatusColor = () => {
    switch (statusCode) {
      case "scanning":
        return "text-cyberCyan border-cyberCyan/40 bg-cyberCyan/10 shadow-cyanGlow";
      case "success":
        return "text-cyberEmerald border-cyberEmerald/40 bg-cyberEmerald/10 shadow-greenGlow";
      case "unknown":
        return "text-cyberRose border-cyberRose/40 bg-cyberRose/10 shadow-redGlow animate-pulse";
      case "spoof":
        return "text-amber-500 border-amber-500/40 bg-amber-500/10 shadow-amberGlow animate-pulse";
      case "warning":
        return "text-amber-400 border-amber-400/40 bg-amber-400/10";
      default:
        return "text-slate-400 border-white/10 bg-white/5";
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-wider text-white">Live Dashboard Camera Scanner</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Scan student faces directly from your desktop or laptop webcam. Feeds are analyzed in real time with liveness verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Instructions & Controller */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard title="Scan controls">
            <div className="space-y-4">
              <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                <p>1. Grant webcam permissions in your browser.</p>
                <p>2. Align the face inside the center screen guides.</p>
                <p>3. Maintain good lighting and look straight ahead.</p>
                <p>4. Blink naturally to pass the anti-spoof checks.</p>
              </div>

              <div className="pt-2">
                {streamActive ? (
                  <button
                    onClick={stopCamera}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyberRose border border-cyberRose/40 py-2.5 text-xs font-bold text-white transition hover:opacity-95"
                  >
                    <CameraOff className="h-4 w-4" /> Deactivate Scanner
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan py-2.5 text-xs font-bold text-white shadow-cyber transition hover:opacity-95"
                  >
                    <Camera className="h-4 w-4" /> Activate Scanner
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Sensor Info */}
          <GlassCard title="Sensor status">
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Capture Device:</span>
                <span className={streamActive ? "text-cyberCyan" : "text-slate-500"}>
                  {streamActive ? "Local Camera Feed" : "Offline"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">WebSocket connection:</span>
                <span className={socketRef.current?.readyState === WebSocket.OPEN ? "text-cyberEmerald" : "text-cyberRose"}>
                  {socketRef.current?.readyState === WebSocket.OPEN ? "Connected" : "Inactive"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transmission FPS:</span>
                <span className="text-slate-300">{streamActive ? `${fps} FPS` : "0"}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Camera Screen */}
        <div className="md:col-span-2">
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner flex items-center justify-center">
            
            {/* Hidden Canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover scale-x-[-1] ${streamActive ? "block" : "hidden"}`}
            />

            {/* Radar scan lines */}
            {streamActive && statusCode === "scanning" && (
              <>
                <div className="scanline" />
                <div className="scan-radar" />
                
                {/* Visual Guides */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 rounded-full border border-dashed border-cyberCyan/40 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border border-dashed border-cyberCyan/25" />
                  </div>
                </div>
              </>
            )}

            {/* Success Overlay Box */}
            {statusCode === "success" && (
              <div className="absolute inset-0 border-4 border-cyberEmerald/70 flex items-center justify-center bg-cyberEmerald/5 pointer-events-none z-10">
                <div className="flex flex-col items-center bg-slate-950/90 border border-cyberEmerald/30 px-5 py-3 rounded-lg text-center animate-bounce">
                  <CheckCircle className="h-8 w-8 text-cyberEmerald mb-1.5" />
                  <span className="text-sm font-bold text-white">{scannedName}</span>
                  <span className="text-[10px] text-cyberEmerald font-semibold tracking-wider uppercase mt-0.5">Attendance Logged</span>
                </div>
              </div>
            )}

            {/* Warning / Unknown intruder overlay */}
            {statusCode === "unknown" && (
              <div className="absolute inset-0 border-4 border-cyberRose/70 flex items-center justify-center bg-cyberRose/5 pointer-events-none z-10 animate-pulse">
                <div className="flex flex-col items-center bg-slate-950/90 border border-cyberRose/30 px-5 py-3 rounded-lg text-center">
                  <ShieldAlert className="h-8 w-8 text-cyberRose mb-1.5" />
                  <span className="text-sm font-bold text-white">Security Warning</span>
                  <span className="text-[10px] text-cyberRose font-semibold tracking-wider uppercase mt-0.5">Unauthorized Person</span>
                </div>
              </div>
            )}

            {/* Spoof / Liveness warning overlay */}
            {statusCode === "spoof" && (
              <div className="absolute inset-0 border-4 border-amber-500/70 flex items-center justify-center bg-amber-500/5 pointer-events-none z-10 animate-pulse">
                <div className="flex flex-col items-center bg-slate-950/90 border border-amber-500/30 px-5 py-3 rounded-lg text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500 mb-1.5" />
                  <span className="text-sm font-bold text-white">Liveness Failure</span>
                  <span className="text-[10px] text-amber-500 font-semibold tracking-wider uppercase mt-0.5">Anti-Spoof Check Failed</span>
                </div>
              </div>
            )}

            {/* Offline screen */}
            {!streamActive && (
              <div className="flex flex-col items-center text-center space-y-3 p-6">
                <div className="h-16 w-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                  <Video className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Scanner Standby</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Activate the scanner using controls on the left.</p>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Status Output bar */}
          <div className={`mt-4 border rounded-xl p-3 flex items-center gap-3 transition-all duration-300 ${getStatusColor()}`}>
            <div className="flex h-5 w-5 items-center justify-center">
              {statusCode === "success" ? (
                <CheckCircle className="h-5 w-5 shrink-0" />
              ) : statusCode === "offline" ? (
                <CameraOff className="h-5 w-5 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
              )}
            </div>
            <span className="text-xs font-mono font-semibold tracking-wide uppercase">
              Sensor Output: {statusMessage}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
