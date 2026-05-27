import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext'; // Corrected import path
import AdminCollectorPortal from '../components/collector/AdminCollectorPortal';
import MobileCollectorGrid from '../components/MobileCollectorGrid';

/**
 * /collector/* — admin desktop portal (inside main app layout)
 * /app — mobile field app (collectors + admin preview on phone)
 */ 
const CollectorDashboard = () => {
  const { user } = useAuth(); // Changed from currentUser to user
  const { pathname } = useLocation();
  const isMainAppPortal = pathname.startsWith('/collector');

  if (isMainAppPortal && user) {
    return <AdminCollectorPortal />;
  }

  return <MobileCollectorGrid />;
};

export default CollectorDashboard;
