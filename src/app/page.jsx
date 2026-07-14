"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  
  const [newProject, setNewProject] = useState({
    name: "",
    sheetId: "",
    headerRow: 1,
    startColumn: "A"
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchProjects();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (res.ok) {
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    setLoadingSheets(true);
    try {
      const res = await fetch("/api/drive/spreadsheets");
      const data = await res.json();
      if (res.ok) {
        setSpreadsheets(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProject.sheetId || !newProject.name) return;
    
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewProject({ name: "", sheetId: "", headerRow: 1, startColumn: "A" });
        fetchProjects();
      } else {
        alert("Gagal membuat project");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ color: "#7c3aed", fontSize: "32px" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f1f5f9", backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
      
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

            {/* Auth section */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {status === "authenticated" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "4px 12px 4px 4px", borderRadius: "999px", border: "1px solid #e2e8f0" }}>
                    <img src={session.user.image} alt="Profile" style={{ width: "24px", height: "24px", borderRadius: "50%" }} referrerPolicy="no-referrer" />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>{session.user.name}</span>
                  </div>
                  <button onClick={() => signOut()} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "6px", transition: "color 0.2s" }} title="Keluar">
                    <i className="fa-solid fa-right-from-bracket" />
                  </button>
                </>
              ) : (
                <button onClick={() => signIn("google")} style={{
                  background: "linear-gradient(135deg, #7c3aed, #c026d3)", color: "white",
                  border: "none", padding: "8px 16px", borderRadius: "999px",
                  fontSize: "12px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "6px"
                }}>
                  <i className="fa-brands fa-google" /> Masuk
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "80px", paddingBottom: "40px", padding: "100px 20px 40px" }}>
        
        {status === "unauthenticated" ? (
          <div style={{ maxWidth: "600px", textAlign: "center", animation: "fadeInUp 0.5s ease forwards" }}>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "#1e293b", margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
              Jadikan Spreadsheet Anda <br/>
              <span style={{ background: "linear-gradient(135deg, #7c3aed, #c026d3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Formulir Ajaib</span>
            </h1>
            <p style={{ color: "#64748b", fontSize: "16px", lineHeight: 1.7, fontWeight: 500, marginBottom: "32px" }}>
              Masuk dengan akun Google Anda, pilih spreadsheet, dan bagikan tautan formulirnya secara instan. Data akan masuk langsung ke Google Sheets!
            </p>
            <button onClick={() => signIn("google")} style={{
              background: "white", color: "#1e293b", border: "1px solid #e2e8f0",
              padding: "16px 32px", borderRadius: "16px", fontSize: "16px", fontWeight: 800,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.1)",
              transition: "transform 0.2s"
            }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <i className="fa-brands fa-google" style={{ color: "#ea4335", fontSize: "20px" }} />
              Lanjutkan dengan Google
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", maxWidth: "860px", animation: "fadeInUp 0.5s ease forwards" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#1e293b", margin: 0 }}>Dashboard Project</h2>
              <button onClick={handleOpenCreateModal} style={{
                background: "linear-gradient(135deg, #7c3aed, #c026d3)", color: "white",
                border: "none", padding: "10px 20px", borderRadius: "10px",
                fontSize: "13px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)"
              }}>
                <i className="fa-solid fa-plus" /> Buat Form Baru
              </button>
            </div>

            {projects.length === 0 ? (
              <div style={{ background: "white", borderRadius: "20px", padding: "60px 20px", textAlign: "center", border: "1px dashed #cbd5e1" }}>
                <div style={{ width: "64px", height: "64px", margin: "0 auto 16px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="fa-regular fa-folder-open" style={{ fontSize: "28px", color: "#94a3b8" }} />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#334155", margin: "0 0 8px" }}>Belum ada project</h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Buat form pertamamu dengan menghubungkan spreadsheet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                {projects.map(proj => (
                  <div key={proj.id} style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "transform 0.2s, box-shadow 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", margin: 0 }}>{proj.name}</h3>
                      <a href={`/form/${proj.id}`} target="_blank" style={{ color: "#7c3aed", background: "#f5f3ff", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}>
                        Buka Form <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginLeft: "4px" }} />
                      </a>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>
                      <i className="fa-brands fa-google-drive" style={{ color: "#10b981" }} /> 
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ID: {proj.sheetId}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>
                      <span>Row: {proj.headerRow}</span>
                      <span>Col: {proj.startColumn}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Create Modal ── */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#ffffff", width: "min(500px, 92%)", borderRadius: "20px", padding: "28px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", position: "relative" }}>
            <button onClick={() => setShowCreateModal(false)} style={{ position: "absolute", top: "20px", right: "20px", background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
              <i className="fa-solid fa-xmark" />
            </button>
            <h3 style={{ margin: "0 0 20px", fontSize: "1.4rem", color: "#0f172a", fontWeight: 800 }}>Buat Form Baru</h3>
            
            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>NAMA PROJECT</label>
                <input type="text" value={newProject.name} onChange={(e) => setNewProject({...newProject, name: e.target.value})} required style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }} placeholder="Contoh: Form Pendaftaran Seminar" />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>PILIH SPREADSHEET (GOOGLE DRIVE)</label>
                {loadingSheets ? (
                  <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "10px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }} /> Memuat file Google Drive...
                  </div>
                ) : (
                  <select value={newProject.sheetId} onChange={(e) => setNewProject({...newProject, sheetId: e.target.value})} required style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box", background: "#f8fafc" }}>
                    <option value="" disabled>— Pilih File Spreadsheet —</option>
                    {spreadsheets.map(sheet => (
                      <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>HEADER ROW</label>
                  <input type="number" value={newProject.headerRow} onChange={(e) => setNewProject({...newProject, headerRow: e.target.value})} required style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>START COLUMN</label>
                  <input type="text" value={newProject.startColumn} onChange={(e) => setNewProject({...newProject, startColumn: e.target.value.toUpperCase()})} required style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", boxSizing: "border-box" }} />
                </div>
              </div>

              <button type="submit" style={{ width: "100%", padding: "14px", background: "linear-gradient(135deg, #7c3aed, #c026d3)", color: "white", border: "none", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 12px rgba(124, 58, 237, 0.25)" }}>
                Buat Project
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
