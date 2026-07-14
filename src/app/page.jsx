"use client";

import { useState, useEffect, useCallback } from "react";

// Detect appropriate input type based on column name heuristics
function getInputType(columnName) {
  const lower = columnName.toLowerCase();
  if (lower.includes("email") || lower.includes("surel")) return "email";
  if (lower.includes("telepon") || lower.includes("telp") || lower.includes("hp") || lower.includes("phone") || lower.includes("nomor")) return "tel";
  if (lower.includes("tanggal") || lower.includes("date") || lower.includes("tgl")) return "date";
  if (lower.includes("tautan") || lower.includes("url") || lower.includes("website") || lower.includes("link")) return "url";
  if (
    lower.includes("views") || lower.includes("likes") || lower.includes("like") ||
    lower.includes("share") || lower.includes("comment") || lower.includes("komentar") ||
    lower.includes("followers") || lower.includes("subscriber") || lower.includes("reach") ||
    lower.includes("impression") || lower.includes("jumlah") || lower.includes("count") ||
    lower.includes("umur") || lower.includes("usia") || lower.includes("age")
  ) return "number";
  if (
    lower.includes("pesan") || lower.includes("catatan") || lower.includes("keterangan") ||
    lower.includes("deskripsi") || lower.includes("alamat") || lower.includes("note") ||
    lower.includes("message") || lower.includes("description") || lower.includes("caption")
  ) return "textarea";
  return "text";
}

// Whether this column should span full width in the grid
function isFullWidth(columnName) {
  const lower = columnName.toLowerCase();
  return (
    lower.includes("judul") || lower.includes("title") || lower.includes("caption") ||
    lower.includes("tautan") || lower.includes("url") || lower.includes("link") || lower.includes("website") ||
    lower.includes("pesan") || lower.includes("catatan") || lower.includes("keterangan") ||
    lower.includes("deskripsi") || lower.includes("alamat") || lower.includes("note") ||
    lower.includes("message") || lower.includes("description")
  );
}

function getPlaceholder(columnName) {
  const lower = columnName.toLowerCase();
  if (lower.includes("nama") || lower.includes("name")) return `Masukkan ${columnName.toLowerCase()} Anda`;
  if (lower.includes("email") || lower.includes("surel")) return "contoh@email.com";
  if (lower.includes("telepon") || lower.includes("telp") || lower.includes("hp") || lower.includes("phone")) return "08xx-xxxx-xxxx";
  if (lower.includes("tanggal") || lower.includes("tgl")) return "";
  if (lower.includes("tautan") || lower.includes("url") || lower.includes("website") || lower.includes("link")) return "https://...";
  if (lower.includes("views")) return "cth: 1000000";
  if (lower.includes("likes") || lower.includes("like")) return "cth: 5000";
  if (lower.includes("share")) return "cth: 200";
  if (lower.includes("comment") || lower.includes("komentar")) return "cth: 150";
  if (lower.includes("jumlah") || lower.includes("count") || lower.includes("umur") || lower.includes("usia") || lower.includes("age")) return "Masukkan angka";
  if (lower.includes("platform")) return "cth: Instagram, TikTok, YouTube";
  if (lower.includes("akun") || lower.includes("account") || lower.includes("username")) return "cth: @username";
  if (lower.includes("status")) return "cth: Live, Draft, Scheduled";
  if (lower.includes("judul") || lower.includes("title")) return "Masukkan judul konten...";
  if (lower.includes("caption")) return "Tulis caption di sini...";
  if (lower.includes("pesan") || lower.includes("catatan") || lower.includes("keterangan") || lower.includes("note") || lower.includes("message")) return "Tuliskan di sini...";
  if (lower.includes("alamat") || lower.includes("address")) return "Jl. Contoh No. 1, Kota...";
  return `Masukkan ${columnName.toLowerCase()}`;
}

const inputStyleObj = {
  width: "100%",
  padding: "12px 16px",
  background: "#f8fafc",
  border: "1.5px solid #e2e8f0",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  color: "#334155",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function Home() {
  const [columns, setColumns] = useState([]); // Array of column name strings
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingCols, setFetchingCols] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  const fetchColumns = useCallback(async () => {
    setFetchingCols(true);
    setFetchError("");
    try {
      const res = await fetch("/api/headers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const cols = data.headers;
      setColumns(cols);
      // Initialize formData with empty strings for each column
      const initial = {};
      cols.forEach((col) => { initial[col] = ""; });
      setFormData(initial);
    } catch (err) {
      setFetchError(err.message || "Gagal memuat kolom dari Google Sheets.");
    } finally {
      setFetchingCols(false);
    }
  }, []);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: formData }),
      });
      const result = await response.json();
      if (response.ok) {
        setStatus({ type: "success", message: "Data Anda berhasil tersimpan di Google Sheets!" });
        const reset = {};
        columns.forEach((col) => { reset[col] = ""; });
        setFormData(reset);
      } else {
        throw new Error(result.error || "Gagal menyimpan data.");
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Terjadi kesalahan koneksi ke server." });
    } finally {
      setLoading(false);
    }
  };

  // Icon mapping for field labels
  const getFieldIcon = (columnName) => {
    const lower = columnName.toLowerCase();
    if (lower.includes("tanggal") || lower.includes("date") || lower.includes("tgl")) return "fa-calendar-days";
    if (lower.includes("platform")) return "fa-share-nodes";
    if (lower.includes("akun") || lower.includes("account") || lower.includes("username")) return "fa-at";
    if (lower.includes("judul") || lower.includes("title")) return "fa-heading";
    if (lower.includes("tautan") || lower.includes("url") || lower.includes("link") || lower.includes("website")) return "fa-link";
    if (lower.includes("status")) return "fa-circle-dot";
    if (lower.includes("views") || lower.includes("view")) return "fa-eye";
    if (lower.includes("likes") || lower.includes("like")) return "fa-heart";
    if (lower.includes("share")) return "fa-share";
    if (lower.includes("comment") || lower.includes("komentar")) return "fa-comment";
    if (lower.includes("followers") || lower.includes("subscriber")) return "fa-users";
    if (lower.includes("email") || lower.includes("surel")) return "fa-envelope";
    if (lower.includes("telepon") || lower.includes("phone") || lower.includes("hp")) return "fa-phone";
    if (lower.includes("nama") || lower.includes("name")) return "fa-user";
    if (lower.includes("pesan") || lower.includes("catatan") || lower.includes("note") || lower.includes("message")) return "fa-comment-dots";
    return "fa-pen";
  };

  // Render form fields dynamically
  const renderFields = () => {
    return columns.map((col) => {
      const type = getInputType(col);
      const placeholder = getPlaceholder(col);
      const isTextarea = type === "textarea";
      const fullWidth = isFullWidth(col);
      const icon = getFieldIcon(col);

      return (
        <div key={col} style={{ gridColumn: (isTextarea || fullWidth) ? "1 / -1" : "auto" }}>
          <label
            htmlFor={`field-${col}`}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              fontSize: "13px", fontWeight: 700, color: "#475569", marginBottom: "8px"
            }}
          >
            <i className={`fa-solid ${icon}`} style={{ color: "#a78bfa", fontSize: "11px", width: "14px" }}></i>
            {col}
            <span style={{ color: "#f87171", fontSize: "11px" }}>*</span>
          </label>
          {isTextarea ? (
            <textarea
              id={`field-${col}`}
              name={col}
              value={formData[col] || ""}
              onChange={handleChange}
              placeholder={placeholder}
              required
              rows={3}
              style={{ ...inputStyleObj, resize: "vertical", minHeight: "80px" }}
            />
          ) : (
            <input
              id={`field-${col}`}
              type={type}
              name={col}
              value={formData[col] || ""}
              onChange={handleChange}
              placeholder={placeholder}
              required
              style={inputStyleObj}
            />
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#f8fafc", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      {/* Header */}
      <header style={{ position: "fixed", top: 0, width: "100%", zIndex: 50, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: "64px" }}>
            <a href="#" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(135deg, #7c3aed, #c026d3)",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", boxShadow: "0 4px 12px rgba(124,58,237,0.3)"
              }}>
                <i className="fa-solid fa-bolt"></i>
              </div>
              <span style={{ fontWeight: 900, fontSize: "20px", color: "#7c3aed", letterSpacing: "-0.02em" }}>DataSheets</span>
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 12px", borderRadius: "999px",
                background: "#f5f3ff", border: "1px solid #ddd6fe",
                fontSize: "11px", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em"
              }}>
                <i className="fa-brands fa-google" style={{ fontSize: "12px" }}></i>
                Sheets Connected
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ paddingTop: "100px", paddingBottom: "32px", padding: "100px 1.5rem 32px", position: "relative", overflow: "hidden", flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Glow blob */}
        <div style={{
          position: "absolute", top: "60px", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "280px",
          background: "radial-gradient(ellipse, rgba(167,139,250,0.25) 0%, rgba(192,38,211,0.15) 50%, transparent 70%)",
          filter: "blur(60px)", borderRadius: "50%", pointerEvents: "none"
        }} />

        {/* Badge */}
        <div style={{ marginBottom: "20px", marginTop: "20px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderRadius: "999px", background: "white", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", fontSize: "10px", fontWeight: 900, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <span style={{ position: "relative", display: "flex", width: "8px", height: "8px" }}>
            <span style={{ position: "absolute", display: "inline-flex", width: "100%", height: "100%", borderRadius: "50%", background: "#34d399", opacity: 0.75, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }}></span>
            <span style={{ position: "relative", display: "inline-flex", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
          </span>
          Sistem Input Otomatis
        </div>

        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .fa-spin { animation: spin 1s linear infinite; }
        `}</style>

        <div style={{ maxWidth: "700px", textAlign: "center", position: "relative", zIndex: 10, marginBottom: "36px", animation: "fadeInUp 0.6s ease forwards" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 900, color: "#1e293b", marginBottom: "16px", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            Input Data Mudah,{" "}
            <span style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Langsung ke Spreadsheet.
            </span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.7, fontWeight: 500 }}>
            Form ini secara otomatis menyesuaikan kolom dari Google Sheets Anda.
            Isi data di bawah dan data akan tersimpan secara realtime.
          </p>
        </div>

        {/* Form Card */}
        <div style={{ width: "100%", maxWidth: "760px", position: "relative", zIndex: 10, animation: "fadeInUp 0.7s ease 0.1s both" }}>
          <div style={{
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)",
            borderRadius: "24px", padding: "clamp(24px, 4vw, 40px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)",
            border: "1px solid rgba(226,232,240,0.8)"
          }}>
            {/* Loading state */}
            {fetchingCols && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <div style={{
                  width: "52px", height: "52px", margin: "0 auto 16px",
                  borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed20, #c026d320)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: "#7c3aed", fontSize: "22px" }}></i>
                </div>
                <p style={{ color: "#7c3aed", fontWeight: 700, fontSize: "15px", margin: 0 }}>Memuat kolom dari Google Sheets...</p>
                <p style={{ color: "#94a3b8", fontWeight: 500, fontSize: "13px", marginTop: "6px" }}>Mengambil header dari spreadsheet Anda</p>
              </div>
            )}

            {/* Error state */}
            {!fetchingCols && fetchError && (
              <div>
                <div style={{
                  background: "#fff7ed", border: "1px solid #fed7aa",
                  borderRadius: "16px", padding: "20px 24px", marginBottom: "20px"
                }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ background: "#fb923c20", borderRadius: "8px", padding: "8px", flexShrink: 0 }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f97316", fontSize: "16px" }}></i>
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: "#9a3412", margin: "0 0 4px", fontSize: "14px" }}>Gagal Memuat Kolom</p>
                      <p style={{ color: "#c2410c", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{fetchError}</p>
                    </div>
                  </div>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "20px 24px", border: "1px solid #e2e8f0" }}>
                  <p style={{ fontWeight: 700, color: "#475569", fontSize: "13px", margin: "0 0 12px" }}>
                    <i className="fa-solid fa-circle-info" style={{ color: "#7c3aed", marginRight: "8px" }}></i>
                    Pastikan baris pertama Google Sheets Anda berisi nama kolom, contoh:
                  </p>
                  {/* Visual example table */}
                  <div style={{ overflowX: "auto", marginBottom: "16px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr>
                          {["Nama", "Email", "Telepon", "Pesan"].map((h, i) => (
                            <th key={h} style={{
                              background: "linear-gradient(135deg, #7c3aed, #c026d3)",
                              color: "white", padding: "8px 12px", textAlign: "left",
                              fontWeight: 800, borderRadius: i === 0 ? "6px 0 0 6px" : i === 3 ? "0 6px 6px 0" : "0"
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {["Budi Santoso", "budi@email.com", "0812-3456-7890", "Halo..."].map((v, i) => (
                            <td key={v} style={{ padding: "8px 12px", background: "white", color: "#94a3b8", fontStyle: "italic", borderBottom: "1px solid #e2e8f0" }}>{v}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontWeight: 700, color: "#475569", fontSize: "13px", margin: "0 0 10px" }}>
                    <i className="fa-solid fa-list-check" style={{ color: "#7c3aed", marginRight: "8px" }}></i>
                    Checklist:
                  </p>
                  <ol style={{ margin: 0, paddingLeft: "20px", color: "#64748b", fontSize: "13px", lineHeight: 2 }}>
                    <li>Buka <strong>Google Sheets</strong> yang sudah dikonfigurasi</li>
                    <li>Klik cell <strong>A1</strong> dan isi nama kolom pertama (contoh: <em>Nama</em>)</li>
                    <li>Isi kolom berikutnya di B1, C1, dst sesuai kebutuhan</li>
                    <li>Pastikan file <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>.env.local</code> sudah dibuat dengan <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>GOOGLE_CLIENT_EMAIL</code>, <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>GOOGLE_PRIVATE_KEY</code>, <code style={{ background: "#ede9fe", color: "#7c3aed", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>GOOGLE_SHEET_ID</code></li>
                    <li>Email Service Account sudah diberi akses <strong>Editor</strong> ke Spreadsheet</li>
                  </ol>
                  <button
                    id="btn-retry-fetch"
                    onClick={fetchColumns}
                    style={{
                      marginTop: "16px", display: "inline-flex", alignItems: "center", gap: "8px",
                      background: "linear-gradient(135deg, #7c3aed, #c026d3)", color: "white",
                      border: "none", padding: "10px 20px", borderRadius: "10px",
                      fontWeight: 700, fontSize: "13px", cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(124,58,237,0.25)"
                    }}
                  >
                    <i className="fa-solid fa-rotate-right"></i> Coba Lagi
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            {!fetchingCols && !fetchError && columns.length > 0 && (
              <div>
                {/* Sheet info bar */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "#f5f3ff", borderRadius: "12px", padding: "10px 16px",
                  marginBottom: "28px", border: "1px solid #ede9fe"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className="fa-brands fa-google" style={{ color: "#7c3aed", fontSize: "14px" }}></i>
                    <span style={{ fontWeight: 700, color: "#6d28d9", fontSize: "13px" }}>
                      {columns.length} kolom terdeteksi dari Spreadsheet
                    </span>
                  </div>
                  <button
                    id="btn-refresh-columns"
                    type="button"
                    onClick={fetchColumns}
                    title="Refresh kolom"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#8b5cf6", fontSize: "13px", padding: "4px 8px",
                      borderRadius: "6px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px"
                    }}
                  >
                    <i className="fa-solid fa-rotate-right" style={{ fontSize: "12px" }}></i> Refresh
                  </button>
                </div>

                {/* Status message */}
                {status.message && (
                  <div style={{
                    padding: "16px 20px", borderRadius: "16px", marginBottom: "24px",
                    background: status.type === "success" ? "#ecfdf5" : "#fff1f2",
                    border: `1px solid ${status.type === "success" ? "#a7f3d0" : "#fecdd3"}`,
                    display: "flex", alignItems: "flex-start", gap: "12px",
                    animation: "fadeInUp 0.3s ease forwards"
                  }}>
                    <i className={`fa-solid ${status.type === "success" ? "fa-circle-check" : "fa-circle-xmark"}`}
                      style={{ color: status.type === "success" ? "#10b981" : "#f43f5e", fontSize: "18px", marginTop: "1px", flexShrink: 0 }}></i>
                    <div>
                      <p style={{ fontWeight: 800, color: status.type === "success" ? "#065f46" : "#9f1239", margin: "0 0 2px", fontSize: "14px" }}>
                        {status.type === "success" ? "Berhasil!" : "Gagal"}
                      </p>
                      <p style={{ color: status.type === "success" ? "#047857" : "#be123c", fontSize: "13px", margin: 0 }}>{status.message}</p>
                    </div>
                  </div>
                )}

                <form id="dynamic-form" onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                    {renderFields()}
                  </div>

                  <button
                    id="btn-submit-form"
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: "28px", width: "100%",
                      background: loading ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #c026d3)",
                      color: "white", border: "none", padding: "16px 32px",
                      borderRadius: "14px", fontSize: "15px", fontWeight: 900,
                      cursor: loading ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                      boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.35)",
                      transition: "all 0.2s ease",
                      transform: "translateY(0)",
                      opacity: loading ? 0.7 : 1
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {loading ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Memproses Data...</>
                    ) : (
                      <><i className="fa-solid fa-paper-plane"></i> Kirim Data ke Spreadsheet</>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Features row */}
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "24px", flexWrap: "wrap" }}>
            {[
              { icon: "fa-shield-halved", text: "Aman & Terenkripsi" },
              { icon: "fa-bolt", text: "Realtime ke Sheets" },
              { icon: "fa-mobile-screen-button", text: "Responsif Mobile" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "12px", fontWeight: 600 }}>
                <i className={`fa-solid ${icon}`} style={{ color: "#c4b5fd" }}></i>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "white", borderTop: "1px solid #f1f5f9", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500, margin: 0 }}>
          &copy; 2026 <strong style={{ color: "#475569" }}>DataSheets Inc</strong>. All rights reserved.
          &nbsp;·&nbsp; Powered by Google Sheets API
        </p>
      </footer>
    </div>
  );
}
