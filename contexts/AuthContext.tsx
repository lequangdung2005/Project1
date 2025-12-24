import React, { createContext, useState, useContext, useEffect } from 'react';

interface User {
  username: string;
  email: string;
  id: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (username: string, email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = true) => {
    try {
      // Validate inputs
      if (!username.trim() || !password.trim()) {
        throw new Error('Username and password are required');
      }

      const response = await fetch('http://127.0.0.1:2005/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim(), password, remember_me: rememberMe }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }));
        // Clear any stale auth data
        logout();
        throw new Error(error.detail || 'Invalid username or password');
      }

      const data = await response.json();
      
      // Store token
      setToken(data.access_token);
      localStorage.setItem('auth_token', data.access_token);
      
      // Use user data from login response
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } else {
        // Fallback: store minimal user info
        const userInfo = { username: username.trim(), email: '', id: 0 };
        setUser(userInfo);
        localStorage.setItem('auth_user', JSON.stringify(userInfo));
      }
    } catch (error) {
      console.error('Login error:', error);
      // Clear any partially set state
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const signup = async (username: string, email: string, password: string, rememberMe: boolean = true) => {
    try {
      // Validate inputs
      if (!username.trim() || !email.trim() || !password.trim()) {
        throw new Error('All fields are required');
      }

      if (username.trim().length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await fetch('http://127.0.0.1:2005/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim(), 
          password,
          remember_me: rememberMe
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Signup failed' }));
        throw new Error(error.detail || 'Failed to create account');
      }

      const data = await response.json();
      
      // Signup now returns token and user data directly
      if (data.access_token && data.user) {
        // Store token
        setToken(data.access_token);
        localStorage.setItem('auth_token', data.access_token);
        
        // Store user data
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } else {
        // Fallback: auto-login if no token returned
        await login(username.trim(), password);
      }
    } catch (error) {
      console.error('Signup error:', error);
      // Clear any partially set state
      setToken(null);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        signup,
        logout,
        isAuthenticated: !!token,
      }}
    >
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
