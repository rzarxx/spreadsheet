// src/app/components/AuthModal.jsx
"use client";

import { useState, useEffect } from "react";

export default function AuthModal({ show, onClose }) {
  const [activeTab, setActiveTab] = useState("login"); // login | register | config
  const [tokenInput, setTokenInput] = useState("");
  const [customToken, setCustomToken] = useState("");
  const [config, setConfig] = useState({
    clientEmail: "",
    privateKey: "",
    sheetId: "",
    headerRow: "",
    startColumn: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);



  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem("kkl_token");
      if (!token) return;
      const res = await fetch("/api/config", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load config");
      const cfg = data.config || {};
      setConfig({
        clientEmail: cfg.clientEmail || "",
        privateKey: cfg.privateKey || "",
        sheetId: cfg.sheetId || "",
        headerRow: cfg.headerRow?.toString() || "",
        startColumn: cfg.startColumn?.toString() || "",
      });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    }
  };

  // Load existing config when entering config tab
  useEffect(() => {
    if (activeTab === "config") {
      fetchConfig();
    }
  }, [activeTab]);

  const handleLogin = async () => {
    if (!tokenInput) {
      setStatus({ type: "error", message: "Token tidak boleh kosong." });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login gagal");
      localStorage.setItem("kkl_token", tokenInput.trim());
      setStatus({ type: "success", message: "Berhasil masuk!" });
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const generateRandomToken = () => {
    // Simple UUID-like token
    return crypto.randomUUID();
  };

  const handleRegister = async () => {
    const tokenToUse = customToken.trim() || generateRandomToken();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToUse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registrasi gagal");
      localStorage.setItem("kkl_token", tokenToUse);
      setStatus({ type: "success", message: `Token berhasil dibuat: ${tokenToUse}` });
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("kkl_token");
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          token,
          clientEmail: config.clientEmail.trim(),
          privateKey: config.privateKey.trim(),
          sheetId: config.sheetId.trim(),
          headerRow: parseInt(config.headerRow, 10) || undefined,
          startColumn: config.startColumn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan konfigurasi");
      setStatus({ type: "success", message: "Konfigurasi tersimpan!" });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {activeTab === "login" && "Masuk"}
            {activeTab === "register" && "Daftar"}
            {activeTab === "config" && "Pengaturan Google Sheet"}
          </h2>
          {/* Only allow closing if a token exists in localStorage or it's not the initial required login */}
          <button onClick={onClose} style={styles.closeBtn}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Tab navigation */}
        <div style={styles.tabNav}>
          <button
            onClick={() => { setActiveTab("login"); setStatus({type: "", message: ""}); }}
            style={{ ...styles.tabBtn, background: activeTab === "login" ? "#e2e8f0" : "#f3f4f6" }}
          >
            Masuk
          </button>
          <button
            onClick={() => { setActiveTab("register"); setStatus({type: "", message: ""}); }}
            style={{ ...styles.tabBtn, background: activeTab === "register" ? "#e2e8f0" : "#f3f4f6" }}
          >
            Daftar
          </button>
          <button
            onClick={() => { setActiveTab("config"); setStatus({type: "", message: ""}); }}
            style={{ ...styles.tabBtn, background: activeTab === "config" ? "#e2e8f0" : "#f3f4f6" }}
          >
            Pengaturan
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === "login" && (
            <>
              <input
                type="text"
                placeholder="Masukkan token akses"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleLogin}
                disabled={loading}
                style={styles.primaryBtn}
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : "Masuk"}
              </button>
            </>
          )}

          {activeTab === "register" && (
            <>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0" }}>
                Buat token baru untuk mengakses sistem. Biarkan kosong untuk token acak.
              </p>
              <input
                type="text"
                placeholder="Token kustom (opsional)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleRegister}
                disabled={loading}
                style={styles.primaryBtn}
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : "Buat Token & Masuk"}
              </button>
            </>
          )}

          {activeTab === "config" && (
            <>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 8px 0" }}>
                Konfigurasi ini akan disimpan berdasarkan token akses Anda.
              </p>
              <input
                type="email"
                placeholder="Client Email"
                value={config.clientEmail}
                onChange={(e) => setConfig({ ...config, clientEmail: e.target.value })}
                style={styles.input}
              />
              <textarea
                placeholder="Private Key"
                value={config.privateKey}
                onChange={(e) => setConfig({ ...config, privateKey: e.target.value })}
                rows={4}
                style={{ ...styles.input, resize: "vertical" }}
              />
              <input
                type="text"
                placeholder="Spreadsheet ID"
                value={config.sheetId}
                onChange={(e) => setConfig({ ...config, sheetId: e.target.value })}
                style={styles.input}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="number"
                  placeholder="Header Row (contoh: 1)"
                  value={config.headerRow}
                  onChange={(e) => setConfig({ ...config, headerRow: e.target.value })}
                  style={{ ...styles.input, flex: 1 }}
                />
                <input
                  type="text"
                  placeholder="Start Column (contoh: A)"
                  value={config.startColumn}
                  onChange={(e) => setConfig({ ...config, startColumn: e.target.value })}
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
              <button
                onClick={handleConfigSave}
                disabled={loading}
                style={styles.primaryBtn}
              >
                {loading ? <i className="fa-solid fa-spinner fa-spin" /> : "Simpan Pengaturan"}
              </button>
            </>
          )}

          {/* Status message */}
          {status.message && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: status.type === "error" ? "#fee2e2" : "#d1fae5",
                color: status.type === "error" ? "#b91c1c" : "#065f46",
                fontSize: "13px",
                textAlign: "center",
                border: `1px solid ${status.type === "error" ? "#fecaca" : "#a7f3d0"}`,
              }}
            >
              <i className={`fa-solid ${status.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`} style={{ marginRight: "6px" }} />
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    width: "min(460px, 92%)",
    background: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    position: "relative",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    margin: 0,
    fontSize: "1.4rem",
    color: "#0f172a",
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "1rem",
    color: "#64748b",
    transition: "all 0.2s",
  },
  tabNav: {
    display: "flex",
    gap: "8px",
    background: "#f8fafc",
    padding: "6px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
  },
  tabBtn: {
    flex: 1,
    padding: "10px",
    background: "transparent",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    color: "#475569",
    transition: "all 0.2s",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#1e293b",
    background: "#f8fafc",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #7c3aed, #c026d3)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)",
    transition: "transform 0.1s",
  },
};
