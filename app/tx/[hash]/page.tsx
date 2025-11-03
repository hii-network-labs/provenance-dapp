"use client";
import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";

type TxData = {
  success: boolean;
  txHash: string;
  txUrl: string;
  chainName?: string;
  entity?: {
    id: string;
    entityType: string;
    dataJson: string;
    version: string;
    previousId: string;
    timestamp: string;
    submitter: string;
  } | null;
  events?: Array<{
    name: string;
    id?: string;
    entityType?: string;
    submitter?: string;
    version?: string;
  }>;
};

export default function TxDetailsPage({
  params,
}: {
  params: { hash: string };
}) {
  const { hash } = params;
  const [data, setData] = useState<TxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"hash" | "id" | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const detailsUrl = useMemo(() => `${siteUrl}/tx/${hash}`, [siteUrl, hash]);

  // Helper: convert keys to human-friendly Title Case with spaces
  const formatKeyForDisplay = (key: string): string => {
    // Insert spaces between camelCase boundaries and replace delimiters
    const withSpaces = key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // camelCase -> camel Case
      .replace(/[-_]+/g, " ") // snake/kebab -> spaces
      .replace(/\s+/g, " ")
      .trim();

    // Title case words, preserving common acronyms
    const acronyms = new Set(["id", "url", "ip", "api", "tx", "uuid"]);
    return withSpaces
      .split(" ")
      .map((w) => {
        const lower = w.toLowerCase();
        if (acronyms.has(lower)) return lower.toUpperCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  };

  // Shared button styles for consistency across the app
  const btnPrimary: React.CSSProperties = {
    display: "inline-block",
    padding: "10px 14px",
    background: "#10b981",
    color: "white",
    borderRadius: 10,
    textDecoration: "none",
    fontWeight: 700,
    border: "none",
    boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
    cursor: "pointer",
  };
  const btnGhost: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#111827",
    borderRadius: 10,
    fontSize: 12,
    padding: "4px 8px",
    cursor: "pointer",
  };

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tx/${hash}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Failed to load transaction.");
          setToast({ message: json.error || "Failed to load transaction.", type: "error" });
          setTimeout(() => setToast(null), 1800);
        } else {
          setData(json as TxData);
          setToast({ message: "Transaction loaded", type: "success" });
          setTimeout(() => setToast(null), 1500);
        }
      } catch (e: any) {
        setError(e?.message || "Network error.");
        setToast({ message: e?.message || "Network error.", type: "error" });
        setTimeout(() => setToast(null), 1800);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => window.removeEventListener("resize", update);
  }, [hash]);

  const prettyJson = (s: string) => {
    try {
      return JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return s;
    }
  };

  const parseDataJson = (s: string): Record<string, any> => {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj === "object") return obj as Record<string, any>;
      return {};
    } catch {
      return {};
    }
  };

  // Dynamic hero title: prefer entity name; fallback to entity id or short tx
  const heroTitle = useMemo(() => {
    if (data?.entity) {
      const obj = parseDataJson(data.entity.dataJson);
      const nameCandidate = obj?.name || obj?.Name || obj?.title || obj?.Title;
      const nameStr = typeof nameCandidate === "string" ? nameCandidate.trim() : "";
      if (nameStr.length > 0) return nameStr;
      const idStr = data.entity.id;
      if (idStr && idStr.length > 0) return idStr;
    }
    return `Tx ${hash.slice(0, 8)}…`;
  }, [data, hash]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "40px 16px" }}>
      <div className="container" style={{ maxWidth: 1000 }}>
        {/* Hero with QR and dynamic title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-block", padding: 12, background: "#f8fafc", borderRadius: 12 }}>
            <QRCode value={detailsUrl} size={isMobile ? 140 : 180} />
          </div>
          <h1 className="hero-title" style={{ color: "#0f172a", marginTop: 12 }}>{heroTitle}</h1>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={{
              display: "inline-block",
              padding: "6px 12px",
              background: "#dcfce7",
              color: "#166534",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: "1px solid #86efac",
            }}>
              {data?.chainName ? data.chainName : ""}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#166534", fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2" />
                <path d="M8 12.5l2.5 2.5L16 10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified on-chain
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            <a href="/" style={btnGhost}>
              ← Back to Registry
            </a>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#4b5563" }}>Loading transaction...</div>
        )}
        {error && (
          <div style={{ textAlign: "center", color: "#ef4444" }}>Error: {error}</div>
        )}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            {/* Left: Core info */}
            <div style={{ border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "#64748b", fontSize: 13 }}>Transaction Hash</div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(data.txHash);
                    setCopied("hash");
                    setTimeout(() => setCopied(null), 1200);
                    setToast({ message: "Hash copied", type: "success" });
                    setTimeout(() => setToast(null), 1200);
                  }}
                  style={btnGhost}
                >
                  {copied === "hash" ? "Copied" : "Copy"}
                </button>
              </div>
              <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", wordBreak: "break-all", color: "#0f172a" }}>
                {data.txHash}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <a href={data.txUrl} target="_blank" rel="noopener noreferrer" style={btnPrimary}>View on Explorer</a>
              </div>

              {data.entity ? (
                <div style={{ marginTop: 18 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>Entity</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ color: "#64748b", fontSize: 13 }}>Submitter</div>
                      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", wordBreak: "break-all", marginLeft: 12 }}>{data.entity.submitter}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ color: "#64748b", fontSize: 13 }}>Timestamp</div>
                      <div style={{ marginLeft: 12 }}>
                        {(() => {
                          const ts = Number(data.entity!.timestamp);
                          if (!Number.isNaN(ts) && ts > 0) {
                            return new Date(ts * 1000).toLocaleString();
                          }
                          return data.entity!.timestamp;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Entity data fields (parsed) */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>Entity Data</div>
                    {(() => {
                      const obj = parseDataJson(data.entity!.dataJson);
                      const keys = Object.keys(obj);
                      if (keys.length === 0) {
                        return (
                          <div style={{ color: "#4b5563", fontSize: 13 }}>No entity fields.</div>
                        );
                      }
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                          {keys.map((k) => (
                            <div key={k} className="kv-row">
                              <div className="kv-key">
                                {formatKeyForDisplay(k)}
                              </div>
                              <div className="kv-val">
                                {String(obj[k])}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Version + Previous ID at bottom, show only when version > 1 */}
                  {(() => {
                    const vNum = Number(data.entity!.version);
                    if (!Number.isNaN(vNum) && vNum > 1) {
                      return (
                        <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <div style={{ color: "#64748b", fontSize: 13 }}>Version</div>
                              <div>{data.entity!.version}</div>
                            </div>
                            <div>
                              <div style={{ color: "#64748b", fontSize: 13 }}>Previous ID</div>
                              <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", wordBreak: "break-all" }}>{data.entity!.previousId}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <div style={{
                  marginTop: 18,
                  textAlign: "center",
                  color: "#4b5563",
                  borderTop: "1px solid #e5e7eb",
                  paddingTop: 12,
                }}>
                  No entity data found in this transaction.
                </div>
              )}
            </div>

            {/* Right-side QR removed; QR shown in hero */}
          </div>
        )}
      </div>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: "10px 14px",
            borderRadius: 10,
            color: "#fff",
            background: toast.type === "success" ? "#10b981" : "#ef4444",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            fontWeight: 700,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}