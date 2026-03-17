import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config";
import "./MockInterviewSetup.css";

const ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Product Manager",
  "UX Designer",
  "QA Engineer",
  "Other",
];

export default function MockInterviewSetup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [resumeFile, setResumeFile] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const effectiveRole = selectedRole === "Other" ? customRole.trim() : selectedRole;

  const validateFile = (file) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?)$/i)) {
      setError("Only PDF or DOCX files are accepted.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5 MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setResumeFile(file);
      setError(null);
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const removeFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file) => {
    if (!file) return "fa-file";
    if (file.name.endsWith(".pdf")) return "fa-file-pdf";
    return "fa-file-word";
  };

  const handleStartInterview = async () => {
    if (!effectiveRole) {
      setError("Please select or enter a role.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let resumeContext = "";

      if (resumeFile) {
        const formData = new FormData();
        formData.append("resume", resumeFile);
        const extractRes = await API.post("/interviews/extract-resume", formData);
        resumeContext = extractRes.data.data?.resume_context || "";
      }

      if (!resumeContext) {
        resumeContext = `Candidate practicing for ${effectiveRole} position.`;
      }

      const startRes = await API.post("/interviews/start", { role: effectiveRole });
      const interviewId = startRes.data.data.interviewId;

      navigate("/interview", {
        state: { resumeContext, role: effectiveRole, interviewId },
      });
    } catch (err) {
      console.error("Start mock interview failed:", err);
      setError(err.response?.data?.message || "Failed to start mock interview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  return (
    <div className="mock-setup-page">
      {/* Header */}
      <header className="mock-setup-header">
        <div className="mock-setup-brand">
          <i className="fas fa-robot"></i>
          <span>AI Interviewer</span>
        </div>
        <button className="mock-logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i>
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="mock-setup-main">
        {/* Left — info panel */}
        <div className="mock-setup-info">
          <div className="info-badge">
            <i className="fas fa-sparkles"></i> AI-Powered
          </div>
          <h1>Mock Interview</h1>
          <p className="info-desc">
            Get tailored interview questions generated from your resume and role. Practice with a real-time AI interviewer and receive instant feedback.
          </p>
          <ul className="info-features">
            <li><i className="fas fa-check-circle"></i> Resume-aware questions</li>
            <li><i className="fas fa-check-circle"></i> Real-time speech recognition</li>
            <li><i className="fas fa-check-circle"></i> Per-answer scoring</li>
            <li><i className="fas fa-check-circle"></i> Hire / No-hire verdict</li>
          </ul>
        </div>

        {/* Right — form card */}
        <div className="mock-setup-card">
          <h2>Set Up Your Session</h2>

          {/* Role selection */}
          <div className="mock-field">
            <label htmlFor="role">
              <i className="fas fa-briefcase"></i> Target Role
            </label>
            <div className="mock-select-wrapper">
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <i className="fas fa-chevron-down select-arrow"></i>
            </div>
          </div>

          {selectedRole === "Other" && (
            <div className="mock-field">
              <label htmlFor="customRole">
                <i className="fas fa-edit"></i> Custom Role
              </label>
              <input
                id="customRole"
                type="text"
                placeholder="e.g. Blockchain Developer, Technical Writer..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className="mock-text-input"
              />
            </div>
          )}

          {/* Resume upload */}
          <div className="mock-field">
            <label>
              <i className="fas fa-file-alt"></i> Resume
              <span className="optional-tag">optional</span>
            </label>

            {!resumeFile ? (
              <div
                className={`mock-drop-zone ${isDragOver ? "drag-over" : ""}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div className="drop-zone-icon">
                  <i className={`fas fa-cloud-upload-alt ${isDragOver ? "drop-bounce" : ""}`}></i>
                </div>
                <p className="drop-zone-title">
                  {isDragOver ? "Drop it here!" : "Drag & drop your resume"}
                </p>
                <p className="drop-zone-sub">or <span className="drop-browse">browse files</span></p>
                <p className="drop-zone-hint">PDF or DOCX · Max 5 MB</p>
              </div>
            ) : (
              <div className="mock-file-preview">
                <div className="file-preview-icon">
                  <i className={`fas ${getFileIcon(resumeFile)}`}></i>
                </div>
                <div className="file-preview-info">
                  <span className="file-preview-name">{resumeFile.name}</span>
                  <span className="file-preview-size">{formatFileSize(resumeFile.size)}</span>
                </div>
                <button className="file-remove-btn" onClick={removeFile} title="Remove file">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mock-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <button
            className="mock-start-btn"
            onClick={handleStartInterview}
            disabled={loading || (selectedRole === "Other" && !customRole.trim())}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Preparing Interview...
              </>
            ) : (
              <>
                <i className="fas fa-play"></i>
                Start Mock Interview
              </>
            )}
          </button>

          {!resumeFile && (
            <p className="mock-skip-note">
              <i className="fas fa-info-circle"></i>
              No resume? We'll generate general questions for the selected role.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
