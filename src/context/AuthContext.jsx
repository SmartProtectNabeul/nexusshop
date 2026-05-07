import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [isFetchingUser, setIsFetchingUser] = useState(false);

  const refreshUser = useCallback(async (userId) => {
    setIsFetchingUser(true);
    try {
      const currentToken = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          'Authorization': currentToken ? `Bearer ${currentToken}` : ''
        }
      });
      if (res.ok) {
        const latestData = await res.json();
        setUser(latestData);
        localStorage.setItem('user', JSON.stringify(latestData));
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    } finally {
      setIsFetchingUser(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.id) {
      refreshUser(user.id);
    }
    document.body.className = theme === 'light' ? 'light-theme' : '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.className = newTheme === 'light' ? 'light-theme' : '';
  };

  const login = (userData, authToken) => {
    localStorage.setItem('user', JSON.stringify(userData));
    if (authToken) {
      localStorage.setItem('token', authToken);
      setToken(authToken);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser, theme, toggleTheme, refreshUser, isFetchingUser }}>
      {children}
    </AuthContext.Provider>
  );
};
