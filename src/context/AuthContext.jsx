import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AuthContext } from './AuthContextBase.js';

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard'
      }
    });
  }

  function login(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  function logout() {
    return supabase.auth.signOut();
  }

  function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email);
  }

  function updateEmail(email) {
    return supabase.auth.updateUser({ email });
  }

  function updatePassword(password) {
    return supabase.auth.updateUser({ password });
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
      setLoading(false);
    });

    getCurrentUser();
    
    return () => subscription.unsubscribe();
  }, []);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    setLoading(false);
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateEmail,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
