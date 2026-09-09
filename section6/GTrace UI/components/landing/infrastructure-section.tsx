"use client";

import { useEffect, useState, useRef } from "react";

const capabilities = [
  { action: "Highlight Key Players", module: "Centrality Engine", status: "Active" },
  { action: "Refresh / Reload Data", module: "Ingestion Pipeline", status: "Ready" },
  { action: "Export Report", module: "Audit Module", status: "Active" },
  { action: "Verify Integrity", module: "Hash-Chain Validator", status: "Active" },
  { action: "Filter Entities", module: "Graph Engine", status: "Active" },
  { action: "Timeline View", module: "Temporal Analysis", status: "Ready" },
];

export function InfrastructureSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCapability, setActiveCapability] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCapability((prev) => (prev + 1) % capabilities.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
            }`}
          >
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Workspace
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              One toolbar.
              <br />
              Complete control.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              Highlight top players, refresh data, export reports, and verify 
              audit-log integrity — all from a single unified investigator workspace.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">6</div>
                <div className="text-sm text-muted-foreground">Toolbar actions</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">1-Click</div>
                <div className="text-sm text-muted-foreground">Integrity check</div>
              </div>
              <div>
                <div className="text-4xl lg:text-5xl font-display mb-2">PDF</div>
                <div className="text-sm text-muted-foreground">Report export</div>
              </div>
            </div>
          </div>

          {/* Right: Location list */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
            }`}
          >
            <div className="border border-foreground/10">
              {/* Header */}
              <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                <span className="text-sm font-mono text-muted-foreground">Dashboard Toolbar</span>
                <span className="flex items-center gap-2 text-xs font-mono text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  All modules active
                </span>
              </div>

              {/* Capabilities */}
              <div>
                {capabilities.map((cap, index) => (
                  <div
                    key={cap.action}
                    className={`px-6 py-5 border-b border-foreground/5 last:border-b-0 flex items-center justify-between transition-all duration-300 ${
                      activeCapability === index ? "bg-foreground/[0.02]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span 
                        className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                          activeCapability === index ? "bg-foreground" : "bg-foreground/20"
                        }`}
                      />
                      <div>
                        <div className="font-medium">{cap.action}</div>
                        <div className="text-sm text-muted-foreground">{cap.module}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">{cap.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
