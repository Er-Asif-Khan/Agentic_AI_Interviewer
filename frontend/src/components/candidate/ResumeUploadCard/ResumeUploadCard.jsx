import { useState, useRef } from "react";
import "./ResumeUploadCard.css";

export default function ResumeUploadCard({
  jobTitle,
  company,
  onResumeUploaded,
  onClose,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx?)$/i)) {
      alert("Only PDF or DOCX files are accepted.");
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) setSelectedFile(file);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file) =>
    file?.name.endsWith(".pdf") ? "fa-file-pdf" : "fa-file-word";

  const handleSubmit = () => {
    if (!selectedFile) { alert("Please select a file first."); return; }
    onResumeUploaded(selectedFile);
  };

  return (
    <div className="ruc-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ruc-card">
        {/* Close */}
        <button className="ruc-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times"></i>
        </button>

        {/* Header */}
        <div className="ruc-header">
          <div className="ruc-icon-wrap">
            <i className="fas fa-file-upload"></i>
          </div>
          <h2>Upload Resume</h2>
          <p className="ruc-subtitle">
            Applying for <strong>{jobTitle}</strong>
            {company && <> at <strong>{company}</strong></>}
          </p>
        </div>

        {/* Drop zone or file preview */}
        {!selectedFile ? (
          <div
            className={`ruc-drop-zone ${isDragOver ? "drag-over" : ""}`}
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
            <i className={`fas fa-cloud-upload-alt ruc-upload-ico ${isDragOver ? "ruc-bounce" : ""}`}></i>
            <p className="ruc-dz-title">{isDragOver ? "Drop it here!" : "Drag & drop your resume"}</p>
            <p className="ruc-dz-sub">or <span className="ruc-browse">browse files</span></p>
            <p className="ruc-dz-hint">PDF or DOCX · Max 5 MB</p>
          </div>
        ) : (
          <div className="ruc-preview">
            <div className="ruc-preview-icon">
              <i className={`fas ${getFileIcon(selectedFile)}`}></i>
            </div>
            <div className="ruc-preview-info">
              <span className="ruc-preview-name">{selectedFile.name}</span>
              <span className="ruc-preview-size">{formatSize(selectedFile.size)}</span>
            </div>
            <button className="ruc-remove-btn" onClick={removeFile} title="Remove">
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="ruc-actions">
          <button className="ruc-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="ruc-submit-btn"
            onClick={handleSubmit}
            disabled={!selectedFile}
          >
            <i className="fas fa-paper-plane"></i>
            Submit Application
          </button>
        </div>
      </div>
    </div>
  );
}
