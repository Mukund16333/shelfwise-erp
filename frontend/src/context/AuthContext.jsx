import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setStoredToken, getStoredToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({
    high_risk_inventory: 0,
    unactioned_alerts: 0,
    pending_fraud_flags: 0,
  });
  const [modelStatus, setModelStatus] = useState({
    total_models: 5,
    loaded_count: 5,
    models: [],
  });

  const refreshBadges = useCallback(async () => {
    try {
      if (!getStoredToken()) return;
      const bData = await apiRequest('/dashboard/badge-counts');
      setBadges(bData);
    } catch (e) {
      // Ignore background badge refresh errors
    }
  }, []);

  const refreshModelStatus = useCallback(async () => {
    try {
      const mData = await apiRequest('/models/status');
      setModelStatus(mData);
    } catch (e) {
      // fallback
    }
  }, []);

  const loadSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const u = await apiRequest('/auth/me');
      setUser(u);
      const s = await apiRequest('/store');
      setStore(s);
      await refreshBadges();
      await refreshModelStatus();
    } catch (e) {
      console.warn('Session load failed:', e);
      setStoredToken(null);
      setUser(null);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [refreshBadges, refreshModelStatus]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.access_token);
    setUser(data.user);
    const s = await apiRequest('/store');
    setStore(s);
    await refreshBadges();
    await refreshModelStatus();
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(data.access_token);
    setUser(data.user);
    const s = await apiRequest('/store');
    setStore(s);
    return data;
  };

  const updateStoreProfile = async (updates) => {
    const updated = await apiRequest('/store', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    setStore(updated);
    return updated;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setStoredToken(null);
    setUser(null);
    setStore(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        store,
        loading,
        badges,
        modelStatus,
        login,
        signup,
        logout,
        updateStoreProfile,
        refreshBadges,
        refreshModelStatus,
      }}
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
