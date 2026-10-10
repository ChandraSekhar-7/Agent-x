import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('talentlens_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('talentlens_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('talentlens_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Auth token expired or invalid', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password, role) => {
    const res = await api.post('/auth/login', { email, password, role });
    const { token: newTok, user: newUser } = res.data;
    
    setToken(newTok);
    setUser(newUser);
    localStorage.setItem('talentlens_token', newTok);
    localStorage.setItem('talentlens_user', JSON.stringify(newUser));
    return newUser;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { token: newTok, user: newUser } = res.data;
    
    setToken(newTok);
    setUser(newUser);
    localStorage.setItem('talentlens_token', newTok);
    localStorage.setItem('talentlens_user', JSON.stringify(newUser));
    return newUser;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('talentlens_token');
    localStorage.removeItem('talentlens_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
