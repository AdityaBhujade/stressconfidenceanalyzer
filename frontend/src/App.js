import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import LandingPage from "@/components/LandingPage";
import Dashboard from "@/components/Dashboard";
import InterviewSetup from "@/components/InterviewSetup";
import InterviewInterface from "@/components/InterviewInterface";
import ResultsDashboard from "@/components/ResultsDashboard";
import { Toaster } from "@/components/ui/sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Protected Route Component
// This component now also processes an incoming `session_id` returned by the
// external auth provider (it may be present in the URL hash or search/query).
// If a session_id is present we exchange it with the backend (/auth/session)
// which sets the cookie. This prevents the race where the app redirects to
// the protected route before the session is processed.
import { useLocation } from "react-router-dom";
const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      // Try to extract session_id from either hash (#...) or search (?...)
      try {
        const hash = window.location.hash || ""; // includes leading '#'
        const search = window.location.search || ""; // includes leading '?'

        let sessionId = null;
        const hashMatch = hash.match(/session_id=([^&]+)/);
        const searchMatch = search.match(/session_id=([^&]+)/);
        if (hashMatch) sessionId = hashMatch[1];
        else if (searchMatch) sessionId = searchMatch[1];

        if (sessionId) {
          // Exchange session id with backend to create server-side session cookie
          await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
          // Clean the URL (remove query/hash)
          const cleanUrl = window.location.pathname + window.location.search.replace(/([?&])session_id=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");
          window.history.replaceState({}, document.title, cleanUrl || "/dashboard");
          setIsAuthenticated(true);
          return;
        }
      } catch (err) {
        // fallthrough to normal auth check
        console.warn("Session processing failed:", err?.message || err);
      }

      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    processAuth();
    // re-run when location changes (so if user is redirected back with session_id we handle it)
  }, [location]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/setup"
            element={
              <ProtectedRoute>
                <InterviewSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:interviewId"
            element={
              <ProtectedRoute>
                <InterviewInterface />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results/:interviewId"
            element={
              <ProtectedRoute>
                <ResultsDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
