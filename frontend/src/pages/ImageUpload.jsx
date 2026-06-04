import React, { useState } from "react";
import { Upload, FileImage, ShieldAlert, CheckCircle, AlertTriangle, Cpu, Loader2 } from "lucide-react";
import { API_BASE } from "../services/api";
import GlassCard from "../components/GlassCard";

export default function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setErrorMessage("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${API_BASE}/attendance/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server failed to process the image");
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setErrorMessage("Authentication failed. Please verify the backend is online and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-wider text-white">Manual Image Check-In</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Upload a single portrait or a group classroom photo. The AI engine will detect faces, analyze liveness, and register attendance automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Side: Upload zone */}
        <div className="md:col-span-7 space-y-4">
          <GlassCard title="Select Image File">
            <div className="space-y-4">
              
              {/* Dropzone */}
              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-cyberCyan/40 rounded-xl aspect-video cursor-pointer bg-slate-900/20 hover:bg-slate-900/50 transition duration-300 overflow-hidden group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Upload Preview"
                    className="h-full w-full object-cover group-hover:opacity-80 transition"
                  />
                ) : (
                  <div className="flex flex-col items-center text-center space-y-2.5 p-6">
                    <div className="h-12 w-12 rounded-lg bg-slate-950 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-cyberCyan transition-colors">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">Drop classroom photo here</span>
                      <span className="text-[10px] text-slate-500 block mt-1">Supports PNG, JPG, or JPEG</span>
                    </div>
                  </div>
                )}
              </label>

              {/* Upload buttons */}
              {selectedFile && (
                <button
                  onClick={handleUpload}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan py-2.5 text-xs font-bold text-white shadow-cyber hover:opacity-90 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyzing face database...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Run Face Recognition
                    </>
                  )}
                </button>
              )}

              {errorMessage && (
                <div className="border border-cyberRose/25 bg-cyberRose/5 p-3 rounded-lg flex items-center gap-2.5 text-xs text-cyberRose">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

            </div>
          </GlassCard>
        </div>

        {/* Right Side: Analysis Results */}
        <div className="md:col-span-5">
          <GlassCard title="Analysis output" className="h-full min-h-[300px] flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Waiting state */}
              {!results && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12 space-y-2">
                  <Cpu className="h-10 w-10 text-slate-700 animate-pulse" />
                  <p className="text-xs">Awaiting face scanning. Upload a file and run analysis.</p>
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 py-12 space-y-3">
                  <Loader2 className="h-10 w-10 text-cyberCyan animate-spin" />
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300">Extracting face geometry</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Generating SFace embeddings and matching databases...</p>
                  </div>
                </div>
              )}

              {/* No Face Warning payload */}
              {results && results.status === "no_face" && (
                <div className="border border-amber-400/25 bg-amber-400/5 p-4 rounded-xl flex flex-col items-center text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                  <h4 className="text-xs font-bold text-white">Liveness Warning</h4>
                  <p className="text-[11px] text-slate-400">{results.message}</p>
                </div>
              )}

              {/* Processing results */}
              {results && results.status === "success" && (
                <div className="space-y-4">
                  
                  {/* General Summary */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Processed Faces</span>
                      <span className="text-base font-bold text-white mt-1 block">{results.processed_faces_count}</span>
                    </div>
                    <div className="bg-slate-900/40 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Unknown Faces</span>
                      <span className={`text-base font-bold mt-1 block ${
                        results.unknown_count > 0 ? "text-cyberRose" : "text-white"
                      }`}>{results.unknown_count}</span>
                    </div>
                  </div>

                  {/* Recognized List */}
                  {results.recognized.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recognized Students</h4>
                      <div className="space-y-2">
                        {results.recognized.map((student) => (
                          <div
                            key={student.student_id}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-cyberEmerald/5 border border-cyberEmerald/10 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-cyberEmerald shrink-0" />
                              <div>
                                <span className="font-semibold text-white block leading-tight">{student.name}</span>
                                <span className="text-[9px] font-mono text-slate-400">{student.student_id}</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono rounded bg-cyberEmerald/10 text-cyberEmerald px-1.5 py-0.5">
                              {(student.score * 100).toFixed(0)}% Match
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Spoof/Security Warnings */}
                  {results.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyberRose">Spoof Blocked Warnings</h4>
                      <div className="space-y-2">
                        {results.warnings.map((warning) => (
                          <div
                            key={warning.student_id}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-cyberRose/5 border border-cyberRose/10 text-xs"
                          >
                            <ShieldAlert className="h-4 w-4 text-cyberRose shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-white block leading-none">{warning.name}</span>
                              <span className="text-[9px] font-mono text-slate-400 mt-1 block">ID: {warning.student_id}</span>
                              <p className="text-[9px] text-cyberRose mt-1">{warning.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unknown Warnings */}
                  {results.unknown_count > 0 && (
                    <div className="border border-cyberRose/15 bg-cyberRose/5 p-3 rounded-lg text-xs flex gap-2.5 items-start">
                      <ShieldAlert className="h-4.5 w-4.5 text-cyberRose shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <span className="font-bold text-white block uppercase tracking-wider text-[10px]">Unauthorized warning</span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          The system logged {results.unknown_count} face crops and timestamped snapshots for investigation.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}
