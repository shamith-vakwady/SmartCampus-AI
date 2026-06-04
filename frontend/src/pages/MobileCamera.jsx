import React, { useRef, useState, useEffect } from "react";
import { Camera, CameraOff, RefreshCw, CheckCircle, ShieldAlert, AlertTriangle, Cpu } from "lucide-react";
import { WS_BASE } from "../services/api";

export default function MobileCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // user = front, environment = back
  const [statusMessage, setStatusMessage] = useState("Tap Start to Scan");
  const [statusCode, setStatusCode] = useState("offline"); // offline, scanning, success, unknown, spoof, warning
  const [scannedName, setScannedName] = useState("");
  
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  const startStream = async () => {
    setStatusMessage("Activating Camera...");
    setStatusCode("scanning");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: facingMode 
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
      }

      // Generate a distinct mobile ID
      const mobileId = `mobile_${Math.random().toString(36).substring(7)}`;
      const ws = new WebSocket(`${WS_BASE}/camera/${mobileId}`);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatusMessage("Scanner Online. Show face...");
        setStatusCode("scanning");
      };

      ws.onmessage = (event) => {
        const result = JSON.parse(event.data);
        setStatusCode(result.status);
        setStatusMessage(result.message);

        if (result.status === "success") {
          setScannedName(result.student_name);
          
          // Trigger mobile vibration if supported
          if ("vibrate" in navigator) {
            navigator.vibrate([100, 50, 100]); // double tap pattern
          }
          
          // Play vocal confirmation on mobile browser
          speakText(`Attendance marked for ${result.student_name}`);

          setTimeout(() => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              setStatusCode("scanning");
              setStatusMessage("Scanning environment...");
            }
          }, 3000);
        } else if (result.status === "unknown" || result.status === "spoof") {
          if ("vibrate" in navigator) {
            navigator.vibrate(300); // long buzz
          }
          speakText(result.message);
        }
      };

      ws.onclose = () => {
        console.log("Mobile WebSocket closed");
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
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL("image/jpeg", 0.5);

            ws.send(JSON.stringify({
              type: "frame",
              image: base64Image
            }));
          }
        }
      }, 200);

    } catch (err) {
      console.error("Mobile camera failed to open", err);
      setStatusMessage("Failed to load camera feed. Grant permission.");
      setStatusCode("offline");
      setStreamActive(false);
    }
  };

  const stopStream = () => {
    setStatusMessage("Tap Start to Scan");
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

  const toggleCamera = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    if (streamActive) {
      stopStream();
      // Delay slightly to clean up streams before re-opening
      setTimeout(() => startStream(), 200);
    }
  };

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const getStatusBg = () => {
    switch (statusCode) {
      case "scanning":
        return "bg-cyberCyan/10 border-cyberCyan/30 text-cyberCyan shadow-cyanGlow";
      case "success":
        return "bg-cyberEmerald/10 border-cyberEmerald/30 text-cyberEmerald shadow-greenGlow";
      case "unknown":
        return "bg-cyberRose/10 border-cyberRose/30 text-cyberRose shadow-redGlow";
      case "spoof":
        return "bg-amber-500/10 border-amber-500/30 text-amber-500 shadow-amberGlow";
      default:
        return "bg-slate-900 border-white/10 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-darkBg text-slate-100 flex flex-col justify-between p-4">
      
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded bg-gradient-to-tr from-cyberPurple to-cyberCyan flex items-center justify-center">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wider font-sans">CAMPUS STREAM</span>
        </div>
        <span className="text-[10px] rounded bg-white/5 border border-white/10 px-2 py-0.5 text-slate-400 uppercase tracking-widest font-mono">
          {facingMode === "user" ? "Selfie Cam" : "Room Cam"}
        </span>
      </div>

      {/* Main Video Viewfinder Container */}
      <div className="flex-1 my-4 relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-inner flex items-center justify-center">
        
        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Camera Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />

        {/* Viewfinder Radar Animations */}
        {streamActive && statusCode === "scanning" && (
          <>
            <div className="scanline" />
            <div className="scan-radar" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full border border-dashed border-cyberCyan/40 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border border-dashed border-cyberCyan/20" />
              </div>
            </div>
          </>
        )}

        {/* Success Overlay Panel */}
        {statusCode === "success" && (
          <div className="absolute inset-0 border-4 border-cyberEmerald/60 bg-cyberEmerald/5 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center bg-slate-950/95 border border-cyberEmerald/20 p-4 rounded-xl text-center shadow-lg">
              <CheckCircle className="h-8 w-8 text-cyberEmerald mb-1" />
              <span className="text-sm font-bold text-white leading-tight">{scannedName}</span>
              <span className="text-[9px] text-cyberEmerald font-semibold uppercase tracking-widest mt-0.5">Attendance Recorded</span>
            </div>
          </div>
        )}

        {/* Unknown Alert Panel */}
        {statusCode === "unknown" && (
          <div className="absolute inset-0 border-4 border-cyberRose/60 bg-cyberRose/5 flex items-center justify-center z-10 pointer-events-none animate-pulse">
            <div className="flex flex-col items-center bg-slate-950/95 border border-cyberRose/20 p-4 rounded-xl text-center shadow-lg">
              <ShieldAlert className="h-8 w-8 text-cyberRose mb-1" />
              <span className="text-sm font-bold text-white leading-tight">Access Denied</span>
              <span className="text-[9px] text-cyberRose font-semibold uppercase tracking-widest mt-0.5">Unauthorized Person</span>
            </div>
          </div>
        )}

        {/* Spoof warning panel */}
        {statusCode === "spoof" && (
          <div className="absolute inset-0 border-4 border-amber-500/60 bg-amber-500/5 flex items-center justify-center z-10 pointer-events-none">
            <div className="flex flex-col items-center bg-slate-950/95 border border-amber-500/20 p-4 rounded-xl text-center shadow-lg">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-1" />
              <span className="text-sm font-bold text-white leading-tight">Spoof Warned</span>
              <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-widest mt-0.5">Liveness Check Failed</span>
            </div>
          </div>
        )}

        {/* Offline Viewfinder state */}
        {!streamActive && (
          <div className="text-center p-6 space-y-3">
            <div className="h-14 w-14 rounded-full bg-slate-900 border border-white/5 mx-auto flex items-center justify-center shadow-inner">
              <Camera className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed mx-auto">
              Ready to stream mobile camera to dashboard. Ensure Wi-Fi is synced to the host network.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Info and Controls */}
      <div className="space-y-3">
        {/* Status indicator bar */}
        <div className={`border rounded-xl p-3 flex items-center justify-center text-center font-semibold text-xs tracking-wider uppercase transition-all duration-300 ${getStatusBg()}`}>
          {statusMessage}
        </div>

        {/* Interactive Buttons grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={toggleCamera}
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-900/60 border border-white/5 p-3 active:bg-white/5 transition"
          >
            <RefreshCw className="h-5 w-5 text-slate-300" />
            <span className="text-[9px] font-medium text-slate-400">Switch Cam</span>
          </button>

          {streamActive ? (
            <button
              onClick={stopStream}
              className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-cyberRose border border-cyberRose/20 p-3 active:opacity-90 transition text-white"
            >
              <CameraOff className="h-5 w-5" />
              <span className="text-[9px] font-bold">Stop Capture</span>
            </button>
          ) : (
            <button
              onClick={startStream}
              className="col-span-2 flex flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-cyberPurple to-cyberCyan p-3 active:opacity-90 shadow-cyber transition text-white"
            >
              <Camera className="h-5 w-5" />
              <span className="text-[9px] font-bold">Start Capture</span>
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
