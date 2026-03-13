import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <Link
          to="/"
          className="logo"
          style={{
            color: "white",
            WebkitTextFillColor: "white",
            marginBottom: "20px",
            textDecoration: "none",
          }}
        >
          <i className="fas fa-robot"></i> Interview-X
        </Link>
        <div className="footer-links">
          <a href="#features" className="footer-link">
            Features
          </a>
          <a href="#stats" className="footer-link">
            Impact
          </a>
          <Link to="/login" className="footer-link">
            Login
          </Link>
          <Link to="/register" className="footer-link">
            Sign Up
          </Link>
        </div>
        <div className="footer-bottom">
          <p>Interview-X © 2025 | Practice Smarter, Interview Better 🤖</p>
          <p style={{ marginTop: "10px", fontSize: "0.9rem" }}>
            Helping job seekers ace interviews with AI-powered mock practice
          </p>
        </div>
      </div>
    </footer>
  );
}
