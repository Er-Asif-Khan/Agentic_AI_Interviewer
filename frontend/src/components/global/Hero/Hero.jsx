import { Link } from "react-router-dom";
import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>
          Practice Makes Perfect: <br />
          AI-Powered Mock Interviews
        </h1>
        <p className="subtitle">
          Sharpen your interview skills with realistic AI-driven practice sessions
        </p>
        <p className="description">
          Get instant feedback, improve your answers, and build confidence before
          your real interview. Our AI simulates real interview scenarios so you
          can practice anytime, anywhere—and land your dream job.
        </p>
        <div className="cta-buttons">
          <Link to="/register" className="cta-btn primary">
            <i className="fas fa-rocket"></i> Start Practicing Free
          </Link>
          <a href="#features" className="cta-btn secondary">
            <i className="fas fa-play-circle"></i> See Features
          </a>
        </div>
      </div>
    </section>
  );
}
