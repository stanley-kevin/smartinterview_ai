import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CompanySelect from "./pages/CompanySelect";
import RoleSelect from "./pages/RoleSelect";
import PracticeSetup from "./pages/PracticeSetup";
import RoundsMap from "./pages/RoundsMap";
import AptitudeRound from "./pages/AptitudeRound";
import TechnicalMcqRound from "./pages/TechnicalMcqRound";
import GroupDiscussionRound from "./pages/GroupDiscussionRound";
import CodingRound from "./pages/CodingRound";
import TechnicalInterviewRound from "./pages/TechnicalInterviewRound";
import SystemDesignRound from "./pages/SystemDesignRound";
import BehavioralHrRound from "./pages/BehavioralHrRound";
import NotFound from "./pages/NotFound";

function Protected(element) {
  return <ProtectedRoute>{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#1E2430",
            color: "#ECEFF4",
            border: "1px solid #262D3A",
            fontSize: "14px",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={Protected(<Dashboard />)} />
        <Route path="/company/select" element={Protected(<CompanySelect />)} />
        <Route path="/role-select" element={Protected(<RoleSelect />)} />
        <Route path="/setup" element={Protected(<PracticeSetup />)} />
        <Route path="/rounds" element={Protected(<RoundsMap />)} />
        <Route path="/rounds/aptitude" element={Protected(<AptitudeRound />)} />
        <Route path="/rounds/technical-mcq" element={Protected(<TechnicalMcqRound />)} />
        <Route path="/rounds/gd" element={Protected(<GroupDiscussionRound />)} />
        <Route path="/rounds/coding" element={Protected(<CodingRound />)} />
        <Route path="/rounds/technical-interview" element={Protected(<TechnicalInterviewRound />)} />
        <Route path="/rounds/system-design" element={Protected(<SystemDesignRound />)} />
        <Route path="/rounds/hr" element={Protected(<BehavioralHrRound />)} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
