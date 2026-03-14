import "./Stat.css";

export default function Stat() {
  return (
    <section className="stats" id="stats">
      <div className="container">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">30%</div>
            <div className="stat-label">Better Interview Confidence</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">10K+</div>
            <div className="stat-label">Practice Sessions Completed</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">50+</div>
            <div className="stat-label">Roles & Domains Supported</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Practice When You Want</div>
          </div>
        </div>
      </div>
    </section>
  );
}
