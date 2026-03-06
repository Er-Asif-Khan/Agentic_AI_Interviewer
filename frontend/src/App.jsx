import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import MockInterviewSetup from "./pages/MockInterviewSetup/MockInterviewSetup";
import InterviewScreen from "./pages/InterviewScreen/InterviewScreen";
import NotFound from "./pages/NotFound/NotFound";
import ProtectedRoute from "./components/global/ProtectedRoute/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />

        {/* Protected: Mock interview */}
        <Route
          path="/mock-interview"
          element={
            <ProtectedRoute>
              <MockInterviewSetup />
            </ProtectedRoute>
          }
        />
        {/* Backward compatibility */}
        <Route path="/candidates/dashboard" element={<Navigate to="/mock-interview" replace />} />

        <Route
          path="/interview"
          element={
            <ProtectedRoute>
              <InterviewScreen />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
