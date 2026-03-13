import Card from "../Card/Card";
import "./CardTab.css";

export default function CardTab({ Title, Desc }) {
  return (
    <section className="features" id="features">
      <div className="container">
        <h2 className="section-title">Why Choose Interview-X?</h2>
        <p className="section-subtitle">
          Everything you need to practice and improve your interview skills
        </p>

        <div className="features-grid">
          <Card
            Title="Real-Time Performance Feedback"
            Desc="Get instant feedback on your answers as you practice. See how you're doing with live analysis of your communication, clarity, and structure."
            icon="fas fa-chart-line"
          />
          <Card
            Title="AI-Powered Answer Scoring"
            Desc="Our AI evaluates every response with precision. Receive automated scores, competency breakdowns, and actionable improvement suggestions."
            icon="fas fa-star-half-alt"
          />
          <Card
            Title="Personalized Practice Sessions"
            Desc="Choose your role, domain, and difficulty level. Get tailored questions that match real interview scenarios you'll face in your field."
            icon="fas fa-magic"
          />
          <Card
            Title="Detailed Practice Reports"
            Desc="Review your performance with polished reports. Includes transcripts, strengths, areas to improve, and tips for your next real interview."
            icon="fas fa-file-alt"
          />
          <Card
            Title="Practice Anytime, Anywhere"
            Desc="No scheduling needed. Start a mock interview in seconds—practice on your own time and at your own pace until you feel confident."
            icon="fas fa-clock"
          />
          <Card
            Title="Safe, Private Practice"
            Desc="Your practice data stays private and secure. Build confidence without the pressure—no recruiters, just you and the AI improving together."
            icon="fas fa-lock"
          />
        </div>
      </div>
    </section>
  );
}
