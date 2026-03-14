import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  return (
    <nav>
      <Link to="/" className="logo">
        <i className="fas fa-robot"></i> Interview-X
      </Link>
      <div className="nav-links">
        <a href="#features" className="nav-link">Features</a>
        <a href="#stats" className="nav-link">Impact</a>
        <Link to="/login" className="nav-btn login">Login</Link>
        <Link to="/register" className="nav-btn signup">Get Started</Link>
      </div>
    </nav>
  );
}
