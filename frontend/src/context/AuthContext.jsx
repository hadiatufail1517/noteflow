import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI, tokenService } from '../services/api';
import { LS } from '../utils/localStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => LS.get('noteflow_user', null));
  const [token, setToken] = useState(() => tokenService.get());
  const [loading, setLoading] = useState(false);

  // Verify JWT on startup
  React.useEffect(() => {
    const checkSession = async () => {
      if (token) {
        try {
          const profile = await authAPI.getMe();
          setUser(profile);
          LS.set('noteflow_user', profile);
        } catch {
          setUser(null);
          setToken(null);
          tokenService.clear();
          LS.remove('noteflow_user');
        }
      }
    };
    checkSession();
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      setToken(res.token);
      setUser(res.user);
      tokenService.set(res.token);
      LS.set('noteflow_user', res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.register(name, email, password);
      setToken(res.token);
      setUser(res.user);
      tokenService.set(res.token);
      LS.set('noteflow_user', res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    tokenService.clear();
    LS.remove('noteflow_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuth: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
