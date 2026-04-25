import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Promise<{ Authorization: string } | {}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await checkAdminStatus();
    });
    
    return () => unsubscribe();
  }, []);

  const getAuthHeaders = async (): Promise<{ Authorization: string } | {}> => {
    const adminToken = localStorage.getItem('admin_token');
    if (adminToken) {
      return { Authorization: `Bearer ${adminToken}` };
    }
    
    const user = auth.currentUser;
    if (user && user.email === 'rahamansgmadil2@gmail.com') {
      const idToken = await user.getIdToken();
      return { Authorization: `Bearer ${idToken}` };
    }
    
    return {};
  };

  const checkAdminStatus = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get('/api/admin/verify', { 
        headers,
        withCredentials: true 
      });
      setIsAdmin(response.data.isAdmin);
    } catch (error) {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post('/api/admin/login', { username, password }, { withCredentials: true });
      if (response.data.success && response.data.token) {
        localStorage.setItem('admin_token', response.data.token);
      }
      setIsAdmin(response.data.isAdmin);
      return response.data.success;
    } catch (error) {
      setIsAdmin(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('admin_token');
      await axios.post('/api/admin/logout', {}, { withCredentials: true });
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout failed', error);
      setIsAdmin(false); // Force local state change
    }
  };

  return (
    <AuthContext.Provider value={{ isAdmin, isLoading, login, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
