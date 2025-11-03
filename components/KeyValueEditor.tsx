"use client";
import React from "react";

export type KV = { key: string; value: string; id: string };

type Props = {
  values: KV[];
  onChange: (next: KV[]) => void;
  title?: string;
};

export default function KeyValueEditor({ values, onChange, title }: Props) {
  const addField = () => {
    const id = crypto.randomUUID();
    onChange([...values, { key: "", value: "", id }]);
  };

  const removeField = (id: string) => {
    onChange(values.filter((v) => v.id !== id));
  };

  const updateField = (id: string, patch: Partial<KV>) => {
    onChange(values.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  return (
    <div className="kv-editor">
      {title && <h3 style={{ marginBottom: 8 }}>{title}</h3>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {values.map((v) => (
          <div
            key={v.id}
            className="kv-row-grid"
          >
            <input
              type="text"
              placeholder="Property name"
              value={v.key}
              onChange={(e) => updateField(v.id, { key: e.target.value })}
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
              }}
            />
            <input
              type="text"
              placeholder="Value"
              value={v.value}
              onChange={(e) => updateField(v.id, { value: e.target.value })}
              style={{
                padding: "8px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
              }}
            />
            <button
              type="button"
              onClick={() => removeField(v.id)}
              style={{
                padding: "8px 12px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addField}
          style={{
            padding: "8px 12px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            width: "fit-content",
          }}
        >
          Add field
        </button>
      </div>
    </div>
  );
}