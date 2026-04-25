import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-netflix-red" size={48} />
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Or return a message, but typically we just don't render the protected component
  }

  return <>{children}</>;
};
