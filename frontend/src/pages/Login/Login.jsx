// import "./Login.css";

// export default function Login() {
//   return (
//     <div className="auth-wrapper">
//       <div className="form-container">
//         <h2>
//           <i className="fas fa-robot"></i> Welcome Back
//         </h2>
//         {/* <div className="alert">
//         <i className="fas fa-exclamation-circle"></i>
//       </div> */}
//         <form action="/login" method="POST">
//           <input type="email" name="email" placeholder="Email" required />
//           <input
//             type="password"
//             name="password"
//             placeholder="Password"
//             required
//           />
//           <button type="submit">
//             <i className="fas fa-sign-in-alt"></i> Login
//           </button>
//         </form>
//         <div className="signup-link">
//           Don't have an account? <a href="/signup">Sign Up</a>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import hook for navigation
import API from "../../config"; // Your Axios instance
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  // 1. State for form data and UI feedback
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null); // To show "Invalid credentials"
  const [loading, setLoading] = useState(false); // To disable button while loading

  const { email, password } = formData;

  // 2. Update state when typing
  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // 3. Handle Form Submission
  const onSubmit = async (e) => {
    e.preventDefault(); // Prevent page reload
    setError(null);
    setLoading(true);

    try {
      // Call backend Login Endpoint
      const res = await API.post("/auth/login", formData);

      console.log("Full Login Response:", res.data);

      // 2. SAVE TOKEN
      localStorage.setItem("token", res.data.token);

      // 3. CHECK ROLE
      const userRole = res.data.user.role;
      // Assuming your backend sends back: { token: "...", role: "hr" }
      
      // This app now runs as a mock interview platform (no HR dashboard).
      // Send all users to the mock interview setup page.
      if (userRole === "candidate" || userRole === "hr") {
        navigate("/mock-interview");
      } else {
        navigate("/mock-interview");
      }
    } catch (err) {
      // Handle Errors (e.g., Wrong password)
      console.error(err);
      setError(
        err.response?.data?.message || "Login failed. Please check credentials."
      );
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="form-container">
        <h2>
          <i className="fas fa-robot"></i> Welcome Back
        </h2>

        {/* 4. Display Error Message if exists */}
        {error && (
          <div className="alert" style={{ color: "red", marginBottom: "1rem" }}>
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            placeholder="Email"
            required
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            placeholder="Password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? (
              "Logging in..."
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> Login
              </>
            )}
          </button>
        </form>
        <div className="signup-link">
          Don't have an account? <a href="/register">Sign Up</a>
        </div>
      </div>
    </div>
  );
}
