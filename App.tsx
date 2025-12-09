import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Directory from './pages/Directory';
import MapPage from './pages/MapPage';
import Profile from './pages/Profile';
import AttractionDetail from './pages/AttractionDetail';
import WriteReview from './pages/WriteReview';
import ScanQR from './pages/ScanQR';
import GuidesPage from './pages/GuidesPage';
import GuideDetail from './pages/GuideDetail';
import MyBookings from './pages/MyBookings';
import QuestDetail from './pages/QuestDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminAttractions from './pages/admin/AdminAttractions';
import AdminBusinesses from './pages/admin/AdminBusinesses';
import AdminVerifications from './pages/admin/AdminVerifications';
import AdminEvents from './pages/admin/AdminEvents';
import AdminUsers from './pages/admin/AdminUsers';
import AdminQRGenerator from './pages/admin/AdminQRGenerator';
import AdminGameSettings from './pages/admin/AdminGameSettings';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Public but auth-enhanced routes */}
          <Route path="/home" element={<Home />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/attraction/:id" element={<AttractionDetail />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/guide/:id" element={<GuideDetail />} />
          <Route path="/quest/:id" element={<QuestDetail />} />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/write-review"
            element={
              <PrivateRoute>
                <WriteReview />
              </PrivateRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <PrivateRoute>
                <ScanQR />
              </PrivateRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <PrivateRoute>
                <MyBookings />
              </PrivateRoute>
            }
          />
          
          {/* Admin routes - require admin role */}
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/attractions"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminAttractions />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/businesses"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminBusinesses />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminVerifications />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/events"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminEvents />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminUsers />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/qr-generator"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminQRGenerator />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/game-settings"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminGameSettings />
              </PrivateRoute>
            }
          />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;