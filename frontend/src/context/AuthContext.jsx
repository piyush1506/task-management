import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('worksphere_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('worksphere_token'));
  const [loading, setLoading] = useState(true);

  // Validate session on load
  useEffect(() => {
    const verifyUserSession = async () => {
      const storedToken = localStorage.getItem('worksphere_token');
      if (storedToken) {
        try {
          const response = await api.get('/auth/me');
          if (response.data?.success && response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('worksphere_user', JSON.stringify(response.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUserSession();
  }, []);

  const login = async (email, password, rememberMe = true) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.success) {
      const { token: receivedToken, user: receivedUser } = response.data;
      setToken(receivedToken);
      setUser(receivedUser);

      if (rememberMe) {
        localStorage.setItem('worksphere_token', receivedToken);
        localStorage.setItem('worksphere_user', JSON.stringify(receivedUser));
      } else {
        sessionStorage.setItem('worksphere_token', receivedToken);
        sessionStorage.setItem('worksphere_user', JSON.stringify(receivedUser));
        localStorage.removeItem('worksphere_token');
        localStorage.removeItem('worksphere_user');
      }

      return receivedUser;
    }
    throw new Error(response.data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('worksphere_token');
      localStorage.removeItem('worksphere_user');
      sessionStorage.removeItem('worksphere_token');
      sessionStorage.removeItem('worksphere_user');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'ADMIN',
        isEmployee: user?.role === 'EMPLOYEE',
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

