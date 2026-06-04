import React from "react";

export default function GlassCard({ children, className = "", title, headerAction }) {
  return (
    <div className={`glass-panel rounded-xl p-5 ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          {title && (
            <h3 className="font-sans text-base font-semibold tracking-wide text-slate-200">
              {title}
            </h3>
          )}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
