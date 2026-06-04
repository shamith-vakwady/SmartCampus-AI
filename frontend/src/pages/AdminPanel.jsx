import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Image, ClipboardList, ShieldAlert, Check, X, Mail, Phone, Calendar, User, Upload, ArrowRight, Loader2 } from "lucide-react";
import { API_BASE, DATA_BASE } from "../services/api";
import GlassCard from "../components/GlassCard";

export default function AdminPanel() {
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // create | edit | upload_image
  
  // Forms state
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    email: "",
    phone: "",
    status: "Active"
  });
  
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  const fetchData = async () => {
    try {
      const studentRes = await fetch(`${API_BASE}/students`);
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        setStudents(studentData);
      }

      const logsRes = await fetch(`${API_BASE}/attendance/logs?limit=40`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error("Failed to load admin tables", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // CRUD handlers
  const handleOpenCreate = () => {
    setFormData({ student_id: "", name: "", email: "", phone: "", status: "Active" });
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student) => {
    setFormData({
      student_id: student.student_id,
      name: student.name,
      email: student.email,
      phone: student.phone || "",
      status: student.status
    });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleOpenUpload = (student_id) => {
    setSelectedStudentId(student_id);
    setUploadFile(null);
    setUploadError("");
    setUploadSuccess("");
    setModalMode("upload_image");
    setIsModalOpen(true);
  };

  const handleDelete = async (student_id) => {
    if (confirm(`Are you sure you want to permanently delete Student ID: ${student_id}? This deletes all embeddings and logs.`)) {
      try {
        const res = await fetch(`${API_BASE}/students/${student_id}`, { method: "DELETE" });
        if (res.ok) {
          fetchData();
        } else {
          alert("Failed to delete student profile.");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "create") {
        const res = await fetch(`${API_BASE}/students/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchData();
        } else {
          const errData = await res.json();
          alert(errData.detail || "Failed to register student.");
        }
      } else if (modalMode === "edit") {
        const res = await fetch(`${API_BASE}/students/${formData.student_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            status: formData.status
          }),
        });

        if (res.ok) {
          setIsModalOpen(false);
          fetchData();
        } else {
          alert("Failed to save updates.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleImageUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    const data = new FormData();
    data.append("file", uploadFile);

    try {
      const res = await fetch(`${API_BASE}/students/${selectedStudentId}/images`, {
        method: "POST",
        body: data
      });

      if (res.ok) {
        setUploadSuccess("Embedding extracted and saved successfully!");
        setUploadFile(null);
        fetchData();
      } else {
        const errData = await res.json();
        setUploadError(errData.detail || "Failed to process face embedding.");
      }
    } catch (err) {
      console.error(err);
      setUploadError("Network error. Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualMark = async (student_id) => {
    try {
      const res = await fetch(`${API_BASE}/attendance/mark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id,
          status: "PRESENT",
          method: "MANUAL"
        })
      });

      if (res.ok) {
        fetchData();
      } else {
        alert("Attendance already marked for today.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Campus Security & Administrative Panel</h1>
          <p className="text-xs text-slate-400 font-sans">Manage enrollment directories, register physical biometric assets, and audit historical reports.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan px-3.5 py-2 text-xs font-bold text-white shadow-cyber hover:opacity-95 transition"
        >
          <Plus className="h-4 w-4" /> Add New Student
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Student Database Grid */}
        <div className="lg:col-span-8 space-y-4">
          <GlassCard title="Registered Biometric Profiles">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 font-semibold">
                    <th className="py-2.5">Student</th>
                    <th className="py-2.5">ID / Code</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Face Assets</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {students.map((s) => (
                    <tr key={s.student_id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3">
                        <div>
                          <span className="font-semibold text-white block">{s.name}</span>
                          <span className="text-[10px] text-slate-500">{s.email}</span>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[10px] text-cyberCyan">{s.student_id}</td>
                      <td className="py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          s.status === "Active" ? "bg-cyberEmerald/10 text-cyberEmerald" : "bg-slate-800 text-slate-400"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 font-mono text-[9px]">
                          {s.images ? s.images.length : 0} Images
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1 flex items-center justify-end h-full mt-0.5">
                        <button
                          onClick={() => handleOpenUpload(s.student_id)}
                          title="Register Face Images"
                          className="p-1.5 rounded border border-cyberPurple/20 bg-cyberPurple/10 text-cyberPurple hover:text-white transition"
                        >
                          <Image className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Profile"
                          className="p-1.5 rounded border border-cyberCyan/20 bg-cyberCyan/10 text-cyberCyan hover:text-white transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleManualMark(s.student_id)}
                          title="Force Mark Present Today"
                          className="p-1.5 rounded border border-cyberEmerald/20 bg-cyberEmerald/10 text-cyberEmerald hover:text-white transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.student_id)}
                          title="Delete Profile"
                          className="p-1.5 rounded border border-cyberRose/20 bg-cyberRose/10 text-cyberRose hover:text-white transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* Audit Logs panel */}
        <div className="lg:col-span-4">
          <GlassCard title="Audit Session Logs" className="h-[460px] flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {logs.map((log) => (
                <div key={log.id} className="p-2.5 rounded-lg border border-white/5 bg-slate-950/40 text-[11px] flex justify-between items-center hover:bg-slate-900/40 transition">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200">{log.student_name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">({log.student_id})</span>
                    </div>
                    <span className="text-slate-500 block text-[9px] mt-0.5">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>

                  <div className="text-right">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.status === "PRESENT" ? "text-cyberEmerald" : "text-amber-500"
                    }`}>
                      {log.status}
                    </span>
                    <span className="block text-[8px] text-slate-500 font-mono mt-0.5">{log.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>

      {/* CRUD/Image Upload dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          
          <div className="relative w-full max-w-md bg-slate-900 border border-white/10 p-6 rounded-xl shadow-2xl space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {modalMode === "create" && "Register New Profile"}
                {modalMode === "edit" && "Update Student Data"}
                {modalMode === "upload_image" && `Biometric Enrollment: ${selectedStudentId}`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Standard CRUD form */}
            {(modalMode === "create" || modalMode === "edit") && (
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
                
                {/* ID input - Locked if editing */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Student ID / Code</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    placeholder="e.g. STU009"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 outline-none focus:border-cyberPurple text-white disabled:opacity-50 font-mono"
                  />
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shamith Vakwady"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 outline-none focus:border-cyberPurple text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. name@campus.edu"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 outline-none focus:border-cyberPurple text-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 outline-none focus:border-cyberPurple text-white"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Status Role</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg p-2.5 outline-none focus:border-cyberPurple text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan font-bold text-white shadow-cyber"
                  >
                    Save Changes
                  </button>
                </div>

              </form>
            )}

            {/* Biometric Upload form */}
            {modalMode === "upload_image" && (
              <form onSubmit={handleImageUploadSubmit} className="space-y-4 text-xs">
                
                <div className="text-[11px] text-slate-400 bg-slate-950 border border-white/5 p-3 rounded-lg leading-relaxed">
                  Upload a clear portrait photo. The SFace algorithm will align the face and map a 128D mathematical vector to this profile.
                </div>

                <label className="flex flex-col items-center justify-center border border-dashed border-white/15 hover:border-cyberPurple/50 bg-slate-950/40 rounded-xl py-8 cursor-pointer text-center space-y-2 group">
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => {
                      setUploadFile(e.target.files[0]);
                      setUploadError("");
                      setUploadSuccess("");
                    }}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-slate-500 group-hover:text-cyberPurple transition" />
                  <div>
                    <span className="font-semibold text-slate-200 block">
                      {uploadFile ? uploadFile.name : "Select portrait image"}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1 block">Maximum 5MB file</span>
                  </div>
                </label>

                {isUploading && (
                  <div className="flex items-center justify-center gap-2 text-cyberCyan py-2">
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Extracting biometric features...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="border border-cyberRose/25 bg-cyberRose/5 p-3 rounded-lg flex items-start gap-2.5 text-cyberRose">
                    <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <p className="leading-tight">{uploadError}</p>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="border border-cyberEmerald/25 bg-cyberEmerald/5 p-3 rounded-lg flex items-start gap-2.5 text-cyberEmerald">
                    <Check className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <p className="leading-tight">{uploadSuccess}</p>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyberPurple to-cyberCyan font-bold text-white shadow-cyber disabled:opacity-50"
                  >
                    Upload Asset
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-300 font-semibold"
                  >
                    Close
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
