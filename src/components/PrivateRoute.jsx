import { Navigate } from 'react-router-dom';
import { auth } from '../firebase';

function PrivateRoute({ children }) {
  const user = auth.currentUser;
  
  if (user === null) {
    // User is not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }
  
  // User is authenticated, render the children
  return children;
}

export default PrivateRoute;
