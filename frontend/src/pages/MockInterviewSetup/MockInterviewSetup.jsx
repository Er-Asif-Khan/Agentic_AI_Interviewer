import { useState } from "react";
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
  const [resumeFile, setResumeFile] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const effectiveRole = selectedRole === "Other" ? customRole.trim() : selectedRole;

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
    <div className="mock-interview-setup">
      <header className="setup-header">
        <h1><i className="fas fa-microphone-alt"></i> Mock Interview</h1>
        <button className="logout-btn" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </header>

      <main className="setup-content">
        <div className="setup-card">
          <h2>Prepare Your Mock Interview</h2>
          <p className="setup-subtitle">
            Upload your resume and choose the role you want to practice for. Our AI will generate tailored questions.
          </p>

          <div className="form-group">
            <label htmlFor="resume">
              <i className="fas fa-file-pdf"></i> Resume (PDF or DOCX)
            </label>
            <input
              id="resume"
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            {resumeFile && (
              <span className="file-name">{resumeFile.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="role">
              <i className="fas fa-briefcase"></i> Role
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {selectedRole === "Other" && (
            <div className="form-group">
              <label htmlFor="customRole">
                <i className="fas fa-edit"></i> Enter your role
              </label>
              <textarea
                id="customRole"
                placeholder="e.g. Blockchain Developer, Technical Writer..."
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                rows={2}
              />
            </div>
          )}

          {error && (
            <div className="setup-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <button
            className="start-btn"
            onClick={handleStartInterview}
            disabled={loading || (selectedRole === "Other" && !customRole.trim())}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Preparing...
              </>
            ) : (
              <>
                <i className="fas fa-play"></i> Start Mock Interview
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
