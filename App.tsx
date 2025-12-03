import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/attraction/:id" element={<AttractionDetail />} />
        <Route path="/write-review" element={<WriteReview />} />
        <Route path="/scan" element={<ScanQR />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;