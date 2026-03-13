import { Link } from "react-router-dom";
import "./Cta.css";

export default function Cta() {
  return (
    <section className="cta-section">
      <div className="cta-content">
        <h2>Ready to Nail Your Next Interview?</h2>
        <p>
          Join thousands of job seekers using Interview-X to practice, get
          instant feedback, and walk into real interviews with confidence.
        </p>
        <div className="cta-buttons">
          <Link to="/register" className="cta-btn primary">
            <i className="fas fa-user-plus"></i> Create Free Account
          </Link>
          <Link to="/login" className="cta-btn primary">
            <i className="fas fa-sign-in-alt"></i> Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}
