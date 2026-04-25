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
      await checkAdminStatus(user);
    });
    
    return () => unsubscribe();
  }, []);

  const getAuthHeaders = async (): Promise<{ Authorization: string } | {}> => {
    const user = auth.currentUser;
    if (user) {
      const idToken = await user.getIdToken();
      return { Authorization: `Bearer ${idToken}` };
    }
    
    return {};
  };

  const checkAdminStatus = async (user = auth.currentUser) => {
    try {
      const userEmail = user?.email?.toLowerCase();
      if (!user || !userEmail || userEmail !== 'rahamansgmadil2@gmail.com') {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      // Consistently set to true for the owner email on frontend
      setIsAdmin(true);

      const headers = await getAuthHeaders();
      const response = await axios.get('/api/admin/verify', { 
        headers
      });
      
      // Only update if the server gives a definitive answer, 
      // but keep it true if we know it's the owner email
      if (response.data.isAdmin !== undefined) {
        setIsAdmin(response.data.isAdmin || userEmail === 'rahamansgmadil2@gmail.com');
      }
    } catch (error) {
      console.error('Admin verification failed:', error);
      // Fallback to email check if server is down but user is logged in as owner
      setIsAdmin(user?.email?.toLowerCase() === 'rahamansgmadil2@gmail.com');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (_username: string, _password: string): Promise<boolean> => {
    return false; // Manual login disabled
  };

  const logout = async () => {
    setIsAdmin(false);
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
