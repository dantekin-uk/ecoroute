import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import AdminCollectorPortal from '../components/collector/AdminCollectorPortal';
import MobileCollectorGrid from '../components/MobileCollectorGrid';

/**
 * /collector/* — admin desktop portal (inside main app layout)
 * /app — mobile field app (collectors + admin preview on phone)
 */
const CollectorDashboard = () => {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();
  const isMainAppPortal = pathname.startsWith('/collector');

  if (isMainAppPortal && currentUser) {
    return <AdminCollectorPortal />;
  }

  return <MobileCollectorGrid />;
};

export default CollectorDashboard;
