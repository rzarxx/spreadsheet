"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInputType(col) {
  const l = col.toLowerCase();
  if (l.includes("email") || l.includes("surel")) return "email";
  if (l.includes("telepon") || l.includes("telp") || l.includes("hp") || l.includes("phone") || l.includes("nomor")) return "tel";
  if (l.includes("tanggal") || l.includes("date") || l.includes("tgl")) return "date";
  if (l.includes("tautan") || l.includes("url") || l.includes("website") || l.includes("link")) return "url";
  if (
    l.includes("views") || l.includes("likes") || l.includes("like") ||
    l.includes("share") || l.includes("comment") || l.includes("komentar") ||
    l.includes("followers") || l.includes("subscriber") || l.includes("reach") ||
    l.includes("impression") || l.includes("jumlah") || l.includes("count") ||
    l.includes("umur") || l.includes("usia") || l.includes("age")
  ) return "number";
  if (
    l.includes("pesan") || l.includes("catatan") || l.includes("keterangan") ||
    l.includes("deskripsi") || l.includes("alamat") || l.includes("note") ||
    l.includes("message") || l.includes("description") || l.includes("caption")
  ) return "textarea";
  return "text";
}

function isFullWidth(col) {
  const l = col.toLowerCase();
  return (
    l.includes("judul") || l.includes("title") || l.includes("caption") ||
    l.includes("tautan") || l.includes("url") || l.includes("link") || l.includes("website") ||
    l.includes("pesan") || l.includes("catatan") || l.includes("keterangan") ||
    l.includes("deskripsi") || l.includes("alamat") || l.includes("note") ||
    l.includes("message") || l.includes("description")
  );
}

function getPlaceholder(col) {
  const l = col.toLowerCase();
  if (l.includes("nama") || l.includes("name")) return `Masukkan ${col}...`;
  if (l.includes("email") || l.includes("surel")) return "contoh@email.com";
  if (l.includes("telepon") || l.includes("telp") || l.includes("hp") || l.includes("phone")) return "08xx-xxxx-xxxx";
  if (l.includes("tanggal") || l.includes("tgl")) return "";
  if (l.includes("tautan") || l.includes("url") || l.includes("website") || l.includes("link")) return "https://...";
  if (l.includes("views")) return "cth: 808";
  if (l.includes("likes") || l.includes("like")) return "cth: 0";
  if (l.includes("share")) return "cth: 200";
  if (l.includes("comment") || l.includes("komentar")) return "cth: 150";
  if (l.includes("platform")) return "Pilih platform...";
  if (l.includes("akun") || l.includes("account") || l.includes("username")) return "cth: @username";
  if (l.includes("status")) return "Pilih status...";
  if (l.includes("judul") || l.includes("title")) return "Masukkan judul konten...";
  if (l.includes("caption")) return "Tulis caption di sini...";
  if (l.includes("pesan") || l.includes("catatan") || l.includes("note") || l.includes("message")) return "Tuliskan di sini...";
  if (l.includes("alamat") || l.includes("address")) return "Jl. Contoh No. 1, Kota...";
  return `Masukkan ${col}...`;
}

function getFieldIcon(col) {
  const l = col.toLowerCase();
  if (l.includes("tanggal") || l.includes("date") || l.includes("tgl")) return "fa-calendar-days";
  if (l.includes("platform")) return "fa-share-nodes";
  if (l.includes("akun") || l.includes("account") || l.includes("username")) return "fa-at";
  if (l.includes("judul") || l.includes("title")) return "fa-heading";
  if (l.includes("tautan") || l.includes("url") || l.includes("link") || l.includes("website")) return "fa-link";
  if (l.includes("status")) return "fa-circle-dot";
  if (l.includes("views") || l.includes("view")) return "fa-eye";
  if (l.includes("likes") || l.includes("like")) return "fa-heart";
  if (l.includes("share")) return "fa-share";
  if (l.includes("comment") || l.includes("komentar")) return "fa-comment";
  if (l.includes("followers") || l.includes("subscriber")) return "fa-users";
  if (l.includes("email") || l.includes("surel")) return "fa-envelope";
  if (l.includes("telepon") || l.includes("phone") || l.includes("hp")) return "fa-phone";
  if (l.includes("nama") || l.includes("name")) return "fa-user";
  if (l.includes("pesan") || l.includes("catatan") || l.includes("note") || l.includes("message")) return "fa-comment-dots";
  return "fa-pen";
}

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputBase = {
  width: "100%",
  padding: "11px 14px",
  background: "#f8fafc",
  border: "1.5px solid #e2e8f0",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 500,
  color: "#1e293b",
  fontFamily: "inherit",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.18s, box-shadow 0.18s",
  appearance: "auto",
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [columns, setColumns] = useState([]);
  const [fieldOptions, setFieldOptions] = useState({}); // { col: string[] } for dropdowns
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingCols, setFetchingCols] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [sheetTitle, setSheetTitle] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchColumns = useCallback(async () => {
    setFetchingCols(true);
    setFetchError("");
    try {
      const res = await fetch("/api/headers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cols = data.headers;
      const opts = data.fieldOptions || {};
      setColumns(cols);
      setFieldOptions(opts);
      setSheetTitle(data.sheetTitle || "");
      const initial = {};
      cols.forEach((col) => { initial[col] = ""; });
      setFormData(initial);
    } catch (err) {
      setFetchError(err.message || "Gagal memuat kolom dari Google Sheets.");
    } finally {
      setFetchingCols(false);
    }
  }, []);

  useEffect(() => { fetchColumns(); }, [fetchColumns]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setStatus({ type: "", message: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: "success", message: "Data berhasil disimpan ke Google Sheets!" });
      // Reset form
      const reset = {};
      columns.forEach((col) => { reset[col] = ""; });
      setFormData(reset);
      setTimeout(() => setStatus({ type: "", message: "" }), 5000);
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Terjadi kesalahan. Silakan coba lagi." });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render fields ───────────────────────────────────────────────────────────
  const renderFields = () => {
    return columns.map((col) => {
      const type = getInputType(col);
      const placeholder = getPlaceholder(col);
      const isTextarea = type === "textarea";
      const full = isFullWidth(col) || isTextarea;
      const icon = getFieldIcon(col);
      const hasOptions = fieldOptions[col] && fieldOptions[col].length > 0;

      const labelEl = (
        <label
          htmlFor={`field-${col}`}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "12px", fontWeight: 700, color: "#475569",
            marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em",
          }}
        >
          <i className={`fa-solid ${icon}`} style={{ color: "#a78bfa", fontSize: "10px", width: "12px", textAlign: "center" }} />
          {col}
          <span style={{ color: "#f87171", fontSize: "11px" }}>*</span>
        </label>
      );

      let inputEl;

      if (hasOptions) {
        // Dropdown — matches spreadsheet validation exactly
        inputEl = (
          <select
            id={`field-${col}`}
            name={col}
            value={formData[col] || ""}
            onChange={handleChange}
            required
            style={{
              ...inputBase,
              cursor: "pointer",
              paddingRight: "36px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238b5cf6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          >
            <option value="" disabled>— Pilih {col} —</option>
            {fieldOptions[col].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      } else if (isTextarea) {
        inputEl = (
          <textarea
            id={`field-${col}`}
            name={col}
            value={formData[col] || ""}
            onChange={handleChange}
            placeholder={placeholder}
            required
            rows={3}
            style={{ ...inputBase, resize: "vertical", minHeight: "80px" }}
          />
        );
      } else {
        inputEl = (
          <input
            id={`field-${col}`}
            type={type}
            name={col}
            value={formData[col] || ""}
            onChange={handleChange}
            placeholder={placeholder}
            required
            style={inputBase}
          />
        );
      }

      return (
        <div
          key={col}
          style={{
            gridColumn: (full || isMobile) ? "1 / -1" : "auto",
            minWidth: 0,
          }}
        >
          {labelEl}
          {inputEl}
          {hasOptions && (
            <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px", marginBottom: 0 }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#86efac", marginRight: "4px" }} />
              Sesuai validasi Google Sheets
            </p>
          )}
        </div>
      );
    });
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f1f5f9", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .fa-spin { animation: spin 1s linear infinite; }
        select option { font-weight: 500; }
        input:focus, select:focus, textarea:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.12) !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        position: "fixed", top: 0, width: "100%", zIndex: 50,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #e2e8f0",
      }}>
        <div style={{ maxWidth: "860px", margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "60px" }}>

            {/* Logo */}
            <a href="#" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed, #c026d3)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "17px", boxShadow: "0 4px 12px rgba(124,58,237,0.3)", flexShrink: 0,
              }}>
                <i className="fa-solid fa-mug-hot" />
              </div>
              <div>
                <span style={{ fontWeight: 900, fontSize: "18px", color: "#1e293b", letterSpacing: "-0.02em", display: "block", lineHeight: 1 }}>KKL Sheet</span>
                <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>by rezzdev</span>
              </div>
            </a>

            {/* Status badge */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "5px 12px", borderRadius: "999px",
              background: "#f5f3ff", border: "1px solid #ddd6fe",
              fontSize: "11px", fontWeight: 700, color: "#7c3aed",
            }}>
              <i className="fa-brands fa-google" style={{ fontSize: "12px" }} />
              Sheets Connected
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "80px", paddingBottom: "40px", padding: "80px 20px 40px" }}>

        {/* Glow */}
        <div style={{
          position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)",
          width: "500px", height: "200px", pointerEvents: "none", zIndex: 0,
          background: "radial-gradient(ellipse, rgba(167,139,250,0.2) 0%, rgba(192,38,211,0.12) 50%, transparent 70%)",
          filter: "blur(50px)",
        }} />

        {/* Hero text */}
        <div style={{ maxWidth: "600px", textAlign: "center", position: "relative", zIndex: 1, marginBottom: "28px", animation: "fadeInUp 0.5s ease forwards" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "4px 14px", borderRadius: "999px", background: "white",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            fontSize: "10px", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase",
            letterSpacing: "0.1em", marginBottom: "16px",
          }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Sistem Input Otomatis
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.8rem)", fontWeight: 900, color: "#1e293b", margin: "0 0 12px", lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            Input Data Langsung ke{" "}
            <span style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Spreadsheet
            </span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px", lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
            Form menyesuaikan otomatis dengan kolom &amp; dropdown dari Google Sheets kamu.
          </p>
        </div>

        {/* ── Form Card ── */}
        <div style={{ width: "100%", maxWidth: "760px", position: "relative", zIndex: 1, animation: "fadeInUp 0.6s ease 0.08s both" }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "clamp(20px, 4vw, 36px)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 50px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>

            {/* ── Loading ── */}
            {fetchingCols && (
              <div style={{ textAlign: "center", padding: "52px 0" }}>
                <div style={{
                  width: "52px", height: "52px", margin: "0 auto 16px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #ede9fe, #fae8ff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: "#7c3aed", fontSize: "22px" }} />
                </div>
                <p style={{ color: "#7c3aed", fontWeight: 700, fontSize: "15px", margin: "0 0 4px" }}>Memuat kolom dari Google Sheets...</p>
                <p style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 500, margin: 0 }}>Sedang membaca header &amp; validasi dropdown</p>
              </div>
            )}

            {/* ── Error ── */}
            {!fetchingCols && fetchError && (
              <div>
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "14px", padding: "18px 20px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f97316", fontSize: "18px", marginTop: "1px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 800, color: "#9a3412", margin: "0 0 4px", fontSize: "14px" }}>Gagal Memuat Kolom</p>
                      <p style={{ color: "#c2410c", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{fetchError}</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontWeight: 700, color: "#475569", fontSize: "13px", margin: "0 0 10px" }}>
                    <i className="fa-solid fa-list-check" style={{ color: "#7c3aed", marginRight: "6px" }} />
                    Checklist:
                  </p>
                  <ol style={{ margin: "0 0 14px", paddingLeft: "18px", color: "#64748b", fontSize: "13px", lineHeight: 2 }}>
                    <li>Buka Google Sheets → isi baris header dengan nama kolom</li>
                    <li>Pastikan <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px" }}>.env.local</code> sudah dibuat dengan semua variabel</li>
                    <li>Email Service Account sudah diberi akses <strong>Editor</strong></li>
                    <li>Set <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px" }}>GOOGLE_HEADER_ROW</code> sesuai nomor baris header</li>
                  </ol>
                  <button id="btn-retry-fetch" onClick={fetchColumns} style={{
                    display: "inline-flex", alignItems: "center", gap: "8px",
                    background: "linear-gradient(135deg, #7c3aed, #c026d3)", color: "white",
                    border: "none", padding: "9px 18px", borderRadius: "10px",
                    fontWeight: 700, fontSize: "13px", cursor: "pointer",
                  }}>
                    <i className="fa-solid fa-rotate-right" /> Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* ── Form ── */}
            {!fetchingCols && !fetchError && columns.length > 0 && (
              <div>
                {/* Info bar */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#f5f3ff", borderRadius: "12px", padding: "10px 14px",
                  marginBottom: "24px", border: "1px solid #ede9fe", flexWrap: "wrap", gap: "8px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-brands fa-google" style={{ color: "#7c3aed", fontSize: "13px" }} />
                    <span style={{ fontWeight: 700, color: "#6d28d9", fontSize: "13px" }}>
                      {sheetTitle && <><strong>{sheetTitle}</strong> — </>}
                      {columns.length} kolom
                      {Object.keys(fieldOptions).length > 0 && (
                        <span style={{ color: "#10b981", marginLeft: "6px" }}>
                          · {Object.keys(fieldOptions).length} dropdown terdeteksi
                        </span>
                      )}
                    </span>
                  </div>
                  <button
                    id="btn-refresh-columns"
                    type="button"
                    onClick={fetchColumns}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#8b5cf6", fontSize: "12px", padding: "3px 8px",
                      borderRadius: "6px", fontWeight: 700, display: "flex", alignItems: "center", gap: "5px",
                    }}
                  >
                    <i className="fa-solid fa-rotate-right" style={{ fontSize: "11px" }} /> Refresh
                  </button>
                </div>

                {/* Status message */}
                {status.message && (
                  <div style={{
                    padding: "14px 18px", borderRadius: "14px", marginBottom: "20px",
                    background: status.type === "success" ? "#ecfdf5" : "#fff1f2",
                    border: `1px solid ${status.type === "success" ? "#a7f3d0" : "#fecdd3"}`,
                    display: "flex", alignItems: "flex-start", gap: "10px",
                    animation: "fadeInUp 0.3s ease forwards",
                  }}>
                    <i className={`fa-solid ${status.type === "success" ? "fa-circle-check" : "fa-circle-xmark"}`}
                      style={{ color: status.type === "success" ? "#10b981" : "#f43f5e", fontSize: "17px", marginTop: "1px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: 800, color: status.type === "success" ? "#065f46" : "#9f1239", margin: "0 0 2px", fontSize: "13px" }}>
                        {status.type === "success" ? "Berhasil!" : "Gagal"}
                      </p>
                      <p style={{ color: status.type === "success" ? "#047857" : "#be123c", fontSize: "13px", margin: 0 }}>{status.message}</p>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <form id="dynamic-form" onSubmit={handleSubmit}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                    gap: "16px",
                    alignItems: "start",
                  }}>
                    {renderFields()}
                  </div>

                  {/* Submit button */}
                  <button
                    id="btn-submit-form"
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: "24px", width: "100%",
                      background: loading ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #c026d3)",
                      color: "white", border: "none", padding: "15px 32px",
                      borderRadius: "12px", fontSize: "15px", fontWeight: 800,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                      boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.3)",
                      transition: "all 0.2s ease",
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {loading ? (
                      <><i className="fa-solid fa-spinner fa-spin" /> Menyimpan data...</>
                    ) : (
                      <><i className="fa-solid fa-paper-plane" /> Kirim ke Spreadsheet</>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Feature badges */}
          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
            {[
              { icon: "fa-shield-halved", text: "Aman & Terenkripsi" },
              { icon: "fa-bolt", text: "Realtime ke Sheets" },
              { icon: "fa-list-check", text: "Dropdown Sinkron" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "5px", color: "#94a3b8", fontSize: "11px", fontWeight: 700 }}>
                <i className={`fa-solid ${icon}`} style={{ color: "#c4b5fd", fontSize: "11px" }} />
                {text}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ background: "white", borderTop: "1px solid #f1f5f9", padding: "16px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, margin: 0 }}>
          <i className="fa-solid fa-mug-hot" style={{ color: "#c4b5fd", marginRight: "5px" }} />
          KKL Sheet — dibuat oleh{" "}
          <a
            href="https://www.instagram.com/rza.rxx"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7c3aed", fontWeight: 700, textDecoration: "none" }}
          >
            @rza.rxx
          </a>
          {" "}· Powered by Google Sheets API
        </p>
      </footer>
    </div>
  );
}
