import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import LiveCamera from "./pages/LiveCamera";
import MobileCamera from "./pages/MobileCamera";
import ImageUpload from "./pages/ImageUpload";
import Students from "./pages/Students";
import Analytics from "./pages/Analytics";
import AdminPanel from "./pages/AdminPanel";

// Layout wrapper to conditionally hide Navbar on mobile camera page
function AppLayout() {
  const location = useLocation();
  const isMobileCameraPage = location.pathname === "/mobile-camera";

  return (
    <div className="min-h-screen flex flex-col">
      {!isMobileCameraPage && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/camera" element={<LiveCamera />} />
          <Route path="/mobile-camera" element={<MobileCamera />} />
          <Route path="/upload" element={<ImageUpload />} />
          <Route path="/students" element={<Students />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
