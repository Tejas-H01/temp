import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import TripCreate from './pages/TripCreate';
import TripWorkspace from './pages/TripWorkspace';
import PublicTrip from './pages/PublicTrip';
import Profile from './pages/Profile';
import CityDiscovery from './pages/CityDiscovery';
import Community from './pages/Community';
import CommunityExperience from './pages/CommunityExperience';
import PublicProfile from './pages/PublicProfile';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/cities/:cityId" element={<CityDiscovery />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/trips/create" element={<TripCreate />} />
          <Route path="/trips/:tripId/*" element={<TripWorkspace />} />
          <Route path="/share/:shareId" element={<PublicTrip />} />
          <Route path="/community" element={<Community />} />
          <Route path="/community/experiences/:experienceId" element={<CommunityExperience />} />
          <Route path="/profile/:username" element={<PublicProfile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
