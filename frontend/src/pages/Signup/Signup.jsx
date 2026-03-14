// import "./Signup.css";

// export default function Signup() {
//   return (
//     <div className="auth-wrapper">
//       <div className="form-container">
//         <h2>
//           <i className="fas fa-robot"></i> Create Account
//         </h2>
//         <form action="/signup" method="POST">
//           <input type="text" name="name" placeholder="Full Name" required />
//           <input type="email" name="email" placeholder="Email" required />
//           <input
//             type="password"
//             name="password"
//             placeholder="Password"
//             minLength="6"
//             required
//           />
//           <select
//             name="role"
//             style={{
//               padding: "12px",
//               border: "2px solid #e0e0e0",
//               borderRadius: "8px",
//               fontSize: "1rem",
//               transition: "border-color 0.3s",
//               fontFamily: "inherit",
//               backgroundColor: "white",
//               cursor: "pointer",
//             }}
//             onFocus={(e) => (e.target.style.borderColor = "#667eea")}
//             onBlur={(e) => (e.target.style.borderColor = "#e0e0e0")}
//           >
//             <option value="user">Candidate</option>
//             <option value="builder">Hr</option>
//           </select>
//           <button type="submit">
//             <i className="fas fa-user-plus"></i> Sign Up
//           </button>
//         </form>
//         <div className="login-link">
//           Already have an account? <a href="/login">Login</a>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useNavigate } from "react-router-dom";
import { useState } from "react";
import API from "../../config";
import "./Signup.css";


export default function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  
  const navigate = useNavigate();
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await API.post("/auth/register", formData);
      if (res.data.success) {
        navigate("/login");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="form-container">
        <h2>
          <i className="fas fa-robot"></i> Create Account
        </h2>

        {error && (
          <div className="alert" style={{ color: "red", marginBottom: "1rem" }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            required
            onChange={handleChange}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            required
            onChange={handleChange}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            minLength="6"
            required
            onChange={handleChange}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : <><i className="fas fa-user-plus"></i> Sign Up</>}
          </button>
        </form>

        <div className="login-link">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  );
}
