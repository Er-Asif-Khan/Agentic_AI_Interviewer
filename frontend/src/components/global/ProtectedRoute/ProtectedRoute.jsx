import { Navigate } from "react-router-dom";

/**
 * Wraps a route and redirects to /login if no token is found.
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Decode the JWT payload (no verification needed client-side, just basic sanity)
  try {
    JSON.parse(atob(token.split(".")[1]));
  } catch {
    // Token is malformed — clear and redirect
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
}








