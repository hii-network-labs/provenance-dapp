"use client";
import React, { useState } from "react";
import KeyValueEditor, { KV } from "@/components/KeyValueEditor";
import QRCode from "react-qr-code";

type ApiSuccess = {
  success: true;
  txHash: string;
  txUrl: string;
  chainName?: string;
};

type ApiError = { success: false; error: string };

function compactFromFields(fields: KV[]) {
  const obj: Record<string, string> = {};
  for (const kv of fields) if (kv.key) obj[kv.key] = kv.value;
  return JSON.stringify(obj);
}

export default function Page() {
  const [fields, setFields] = useState<KV[]>([{ key: "name", value: "", id: crypto.randomUUID() }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ApiSuccess | ApiError | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Prefill the editor with a quick example for demo/testing
  function useExample() {
    setFields([
      { key: "name", value: "MacBook Air M4", id: crypto.randomUUID() },
      { key: "manufacturer", value: "Apple", id: crypto.randomUUID() },
      { key: "model", value: "MacBook Air", id: crypto.randomUUID() },
      { key: "chip", value: "Apple M4", id: crypto.randomUUID() },
      { key: "storage", value: "512GB", id: crypto.randomUUID() },
      { key: "color", value: "Midnight", id: crypto.randomUUID() },
      { key: "serialNumber", value: "C02M4XYZ1234", id: crypto.randomUUID() },
      { key: "productionDate", value: "2025-09-15", id: crypto.randomUUID() },
      { key: "warrantyExpiry", value: "2027-09-15", id: crypto.randomUUID() },
    ]);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setResult(null);
    setToast({ message: "Submitting...", type: "success" });
    try {
      const dataJson = compactFromFields(fields);

      const payload = {
        baseKey: `auto-${crypto.randomUUID()}`,
        entityType: "AutoEntity",
        dataJson,
        previousId: null,
      };

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiSuccess | ApiError;
      setResult(data);
      if ((data as ApiSuccess).success) {
        setToast({ message: "Submitted successfully", type: "success" });
        setTimeout(() => setToast(null), 1500);
      } else {
        setToast({ message: (data as ApiError).error || "Submission failed", type: "error" });
        setTimeout(() => setToast(null), 1800);
      }
    } catch (err: any) {
      setResult({ success: false, error: err?.message || "Unknown error" });
      setToast({ message: err?.message || "Unknown error", type: "error" });
      setTimeout(() => setToast(null), 1800);
    } finally {
      setIsSubmitting(false);
    }
  }

  const txUrl = (result && (result as ApiSuccess).txUrl) || "";
  const txHash = (result && (result as ApiSuccess).txHash) || "";
  const chainName = (result && (result as ApiSuccess).chainName) || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  const internalUrl = `${siteUrl}/tx/${txHash}`;

  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const update = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const clearForm = () => {
    setFields([{ key: "", value: "", id: crypto.randomUUID() }]);
    setResult(null);
    setToast({ message: "Form cleared", type: "success" });
    setTimeout(() => setToast(null), 1000);
  };

  const registerAnother = () => {
    setFields((prev) => prev.map((v) => ({ ...v, value: "" })));
    setResult(null);
    setToast({ message: "Ready to register another", type: "success" });
    setTimeout(() => setToast(null), 1200);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <main className="container" style={{ maxWidth: 900 }}>
      <div style={{
        borderRadius: 16,
        padding: 20,
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 60%, #fff 100%)",
        border: "1px solid #e5e7eb",
      }}>
        <h1 className="hero-title" style={{ color: "#0f172a" }}>Provenance Registry DApp</h1>
        <p style={{ color: "#334155", marginTop: 6 }}>Submit a single entity. Only key/value fields are needed; other fields are auto-generated.</p>
      </div>

      <section style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, background: "#fafafa", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Entity Data</h2>
          <button
            type="button"
            onClick={clearForm}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#0f172a",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
          >
            Clear Form
          </button>
          <button
            type="button"
            onClick={() => {
              useExample();
              setToast({ message: "Example loaded", type: "success" });
              setTimeout(() => setToast(null), 1200);
            }}
            style={{
              marginLeft: "auto",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color: "#0f172a",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(16,24,40,0.04)",
            }}
          >
            Use Example
          </button>
        </div>
        <KeyValueEditor values={fields} onChange={setFields} />

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: "10px 16px",
              background: isSubmitting ? "#6ee7b7" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: 10,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit to Chain"}
          </button>
        </div>
      </section>

      {isSubmitting && (
        <section style={{ marginTop: 24 }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 18,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#ffffff",
          }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>Submitting to chain...</div>
            <div style={{ color: "#64748b", fontSize: 13 }}>Please wait while your data is being pushed on-chain.</div>
          </div>
        </section>
      )}

      {result && (
        <section style={{ marginTop: 32 }}>
          {result.success ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: 24,
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background: "linear-gradient(180deg, #ecfeff 0%, #f0fdf4 100%)",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  background: "#dcfce7",
                  color: "#166534",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  border: "1px solid #86efac",
                }}>
                  {chainName || "On-chain"}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 8 }}>Submission Successful</h3>
                <p style={{ color: "#334155" }}>Your data has been pushed on-chain.</p>
              </div>
              <QRCode value={internalUrl} size={isMobile ? 180 : 240} />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a
                  href={(result as ApiSuccess).txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    background: "#10b981",
                    color: "white",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
                  }}
                >
                  View on Explorer
                </a>
                <a
                  href={internalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    background: "#f1f5f9",
                    color: "#0f172a",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  View Detail
                </a>
                <button
                  type="button"
                  onClick={registerAnother}
                  style={{
                    display: "inline-block",
                    padding: "10px 14px",
                    background: "#f9fafb",
                    color: "#0f172a",
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Register Another
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ color: "#ef4444" }}>Error: {(result as ApiError).error}</p>
            </div>
          )}
        </section>
      )}
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
    </main>
  );
}