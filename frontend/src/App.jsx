import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/layout/Layout";
import GlobalFab from "./components/layout/GlobalFab";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RoomCreate from "./pages/RoomCreate";
import RoomBrowser from "./pages/RoomBrowser";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Results from "./pages/Results";
import Profile from "./pages/Profile";
import News from "./pages/News";
import useAuthStore from "./store/authStore";

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function GlobalFabRenderer() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  return <GlobalFab />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1f2e",
            color: "#e5e7eb",
            border: "1px solid #2a3441",
          },
        }}
      />
      <Routes>
        {/* Public routes (no navbar) */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected routes (with navbar) */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms" element={<RoomBrowser />} />
          <Route path="/rooms/create" element={<RoomCreate />} />
          <Route path="/rooms/:code/lobby" element={<Lobby />} />
          <Route path="/rooms/:code/results" element={<Results />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Full-screen routes (no outer navbar) */}
        <Route
          path="/rooms/:code/game"
          element={
            <ProtectedRoute>
              <Game />
            </ProtectedRoute>
          }
        />
        <Route
          path="/news"
          element={
            <ProtectedRoute>
              <News />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalFabRenderer />
    </BrowserRouter>
  );
}
