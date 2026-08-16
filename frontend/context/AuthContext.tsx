import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { getToken, saveToken, removeToken } from '../services/storage';

interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
} 

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Při načtení appky ověříme uložený token
    const loadSavedToken = async () => {
      try {
        const savedToken = await getToken();
        if (savedToken) {
          setToken(savedToken);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadSavedToken();
  }, []);

  const login = async (credentials: any) => {
    const res = await apiFetch('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    const newToken = res.data.token;
    await saveToken(newToken);
    setToken(newToken);
  };

  const register = async (userData: any) => {
    const res = await apiFetch('auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    const newToken = res.data.token;
    await saveToken(newToken);
    setToken(newToken);
  };

  const logout = async () => {
    await removeToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth musí být použit uvnitř AuthProvideru');
  return context;
};