# 🔐 Complete Next.js Frontend Authentication Guide

**For:** Student Marketplace Backend (Express + MongoDB)  
**Frontend:** Next.js 14+ with JavaScript  
**Auth Flow:** Google Sign-In + Email/Password + Campus Selection  
**State Management:** React Query + Context API  
**JWT Storage:** HttpOnly Cookies (secure) + In-Memory State  

---

## 📋 Table of Contents

1. [Project Setup](#project-setup)
2. [Environment Configuration](#environment-configuration)
3. [Authentication Flow Diagram](#authentication-flow-diagram)
4. [API Service Layer](#api-service-layer)
5. [Authentication Context & Hooks](#authentication-context--hooks)
6. [Component Examples](#component-examples)
7. [Protected Routes & Middleware](#protected-routes--middleware)
8. [Error Handling & Validation](#error-handling--validation)
9. [Security Best Practices](#security-best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 1. Project Setup

### 1.1 Create Next.js Project

```bash
# Create Next.js app with TypeScript
npx create-next-app@latest frontend --ts --use-npm

# Install dependencies
cd frontend
npm install

# Essential packages
npm install axios zustand swr js-cookie react-hook-form yup clsx

# UI & Styling
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react

# Dev tools
npm install -D @types/js-cookie @types/node prettier eslint
```

### 1.2 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout + AuthProvider
│   ├── page.tsx                # Homepage
│   ├── (auth)/                 # Auth routes group
│   │   ├── signup/
│   │   │   └── page.tsx        # Google signup + campus picker
│   │   ├── login/
│   │   │   └── page.tsx        # Email/password login
│   │   └── callback/
│   │       └── page.tsx        # Google callback handler (optional)
│   ├── (protected)/            # Protected routes
│   │   ├── dashboard/
│   │   │   └── page.tsx        # User dashboard
│   │   ├── profile/
│   │   │   └── page.tsx        # Profile page
│   │   └── layout.tsx          # Protected layout (checks auth)
│   └── api/
│       └── auth/
│           └── route.ts        # Optional: server-side auth endpoints
├── components/
│   ├── auth/
│   │   ├── GoogleSignInButton.tsx
│   │   ├── CampusPicker.tsx
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── Navigation.tsx
│   └── ErrorBoundary.tsx
├── hooks/
│   ├── useAuth.ts              # Auth hook
│   └── useProtectedRoute.ts    # Route protection hook
├── context/
│   └── AuthContext.tsx         # Auth state management
├── services/
│   ├── api.ts                  # Axios instance
│   ├── auth.ts                 # Auth API calls
│   └── campus.ts               # Campus API calls
├── lib/
│   ├── validators.ts           # Validation schemas
│   ├── errors.ts               # Error handling
│   └── cookies.ts              # Cookie utilities
├── types/
│   └── auth.ts                 # TypeScript types
├── styles/
│   └── globals.css             # Tailwind imports
├── public/
│   └── (static assets)
├── .env.local                  # Local env vars
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
└── next.config.js              # Next.js config
```

---

## 2. Environment Configuration

### 2.1 Create `.env.local`

```bash
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_TIMEOUT=10000

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=748421078644-8ai5lvp22d2fcuguh40h6jtddr709ecl.apps.googleusercontent.com

# App settings
NEXT_PUBLIC_APP_NAME=Student Marketplace
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: for production
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
# NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2.2 Update `next.config.js` (CORS & Security)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile pictures
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Your Cloudinary
      },
    ],
  },
  
  // Headers for security & CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2.3 Tailwind Setup

**If not auto-configured, create `tailwind.config.ts`:**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
```

**Add to `app/globals.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 3. Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  USER VISITS SIGNUP PAGE                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ Choose Auth Method  │
                    ├─────────────────────┤
                    │ 1. Google Sign-In   │
                    │ 2. Email/Password   │
                    └─────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    ↓                   ↓
            ╔═══════════════╗  ╔══════════════════╗
            ║ GOOGLE FLOW   ║  ║ EMAIL FLOW       ║
            ╚═══════════════╝  ╚══════════════════╝
                  ↓                     ↓
            Google popup       Email/Password Form
            User authenticates  Form validation
                  ↓                     ↓
      POST /auth/google-verify  POST /auth/signup
            (ID Token)         (email, password, campus)
                  ↓                     ↓
      ┌─────────────┴────────────┐
      ↓                          ↓
 NEW USER?            EXISTING USER?
      ↓                          ↓
  Return tempToken          Return JWT
      ↓                          ↓
 Show campus picker         Save JWT
      ↓                          ↓
 Select campus           Redirect Dashboard
      ↓
 POST /auth/google-complete
 (tempToken + campusId)
      ↓
  Return JWT + User
      ↓
 Save JWT (cookie/localStorage)
      ↓
 Redirect Dashboard
      ↓
 Set AuthContext (user, token)
      ↓
 Protected pages are accessible
```

---

## 4. API Service Layer

### 4.1 `services/api.ts` - Axios Instance with Interceptors

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getCookie, setCookie, deleteCookie } from '@/lib/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000');

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true, // Include cookies in all requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token if available
api.interceptors.request.use(
  (config) => {
    // Try to get token from cookie first (secure), then localStorage (fallback)
    const token = 
      typeof window !== 'undefined' 
        ? getCookie('jwt') || localStorage.getItem('token')
        : null;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors & token expiry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // 401: Unauthorized (token expired or invalid)
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth data
        localStorage.removeItem('token');
        deleteCookie('jwt');
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    // 403: Forbidden (user not allowed)
    if (error.response?.status === 403) {
      console.error('Access forbidden');
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### 4.2 `services/auth.ts` - Auth API Endpoints

```typescript
import api from './api';
import { User, AuthResponse, GoogleVerifyResponse } from '@/types/auth';

/**
 * Step 1: Verify Google ID Token
 * Returns tempToken for new users, or JWT for existing users
 */
export const verifyGoogleToken = async (idToken: string): Promise<GoogleVerifyResponse> => {
  const response = await api.post('/auth/google-verify', { idToken });
  return response.data;
};

/**
 * Step 2: Complete Google signup with campus selection
 */
export const completeGoogleSignup = async (
  tempToken: string,
  campusId: string
): Promise<AuthResponse> => {
  const response = await api.post('/auth/google-complete', {
    tempToken,
    campusId,
  });
  return response.data;
};

/**
 * Email/Password signup
 */
export const signupWithEmail = async (
  fullName: string,
  email: string,
  password: string,
  campus: string
): Promise<AuthResponse> => {
  const response = await api.post('/auth/signup', {
    fullName,
    email,
    password,
    passwordConfirm: password,
    campus,
  });
  return response.data;
};

/**
 * Email/Password login
 */
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', {
    email,
    password,
  });
  return response.data;
};

/**
 * Get current user info
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data.data.user;
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

/**
 * Verify email
 */
export const verifyEmail = async (token: string): Promise<void> => {
  await api.post('/auth/verify-email', { token });
};

/**
 * Forgot password
 */
export const forgotPassword = async (email: string): Promise<void> => {
  await api.post('/auth/forgot-password', { email });
};

/**
 * Reset password
 */
export const resetPassword = async (
  token: string,
  password: string
): Promise<void> => {
  await api.patch('/auth/reset-password', {
    token,
    password,
    passwordConfirm: password,
  });
};
```

### 4.3 `services/campus.ts` - Campus API

```typescript
import api from './api';

export interface Campus {
  _id: string;
  name: string;
  location?: string;
  description?: string;
}

/**
 * Get all campuses
 */
export const getCampuses = async (): Promise<Campus[]> => {
  const response = await api.get('/campuses');
  return response.data.data || [];
};

/**
 * Get single campus
 */
export const getCampusById = async (id: string): Promise<Campus> => {
  const response = await api.get(`/campuses/${id}`);
  return response.data.data;
};
```

---

## 5. Authentication Context & Hooks

### 5.1 `types/auth.ts` - TypeScript Interfaces

```typescript
export interface User {
  _id: string;
  fullName: string;
  email: string;
  campus: string; // Campus ID
  avatar?: {
    url: string;
    publicId?: string;
  };
  role?: 'buyer' | 'seller' | 'service_provider' | 'admin';
  isVerified: boolean;
  googleId?: string;
  provider?: 'local' | 'google';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  status: string;
  token?: string;
  data?: {
    user?: User;
  };
}

export interface GoogleVerifyResponse {
  status: string;
  message?: string;
  token?: string; // For existing users
  data?: {
    tempToken?: string; // For new users
    email: string;
    fullName: string;
    picture?: string;
    user?: User; // If existing user
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  signupWithGoogle: (idToken: string) => Promise<GoogleVerifyResponse>;
  completeGoogleSignup: (tempToken: string, campusId: string) => Promise<void>;
  signupWithEmail: (fullName: string, email: string, password: string, campus: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}
```

### 5.2 `context/AuthContext.tsx` - Auth State Management

```typescript
'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import * as authService from '@/services/auth';
import * as campusService from '@/services/campus';
import { User, AuthContextType, GoogleVerifyResponse } from '@/types/auth';
import { setCookie, deleteCookie } from '@/lib/cookies';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get token from localStorage or cookie
        const storedToken = typeof window !== 'undefined' 
          ? localStorage.getItem('token')
          : null;
        
        if (storedToken) {
          setToken(storedToken);
          // Fetch user details
          await fetchUser();
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      localStorage.removeItem('token');
      deleteCookie('jwt');
    }
  }, []);

  // Google sign-up: Step 1 - Verify ID token
  const signupWithGoogle = useCallback(
    async (idToken: string): Promise<GoogleVerifyResponse> => {
      const result = await authService.verifyGoogleToken(idToken);
      
      // If existing user with Google account
      if (result.token) {
        setToken(result.token);
        localStorage.setItem('token', result.token);
        setCookie('jwt', result.token);
        if (result.data?.user) setUser(result.data.user);
      }
      
      return result;
    },
    []
  );

  // Google sign-up: Step 2 - Complete with campus
  const completeGoogleSignup = useCallback(
    async (tempToken: string, campusId: string) => {
      const result = await authService.completeGoogleSignup(tempToken, campusId);
      
      if (result.token) {
        setToken(result.token);
        localStorage.setItem('token', result.token);
        setCookie('jwt', result.token);
        
        if (result.data?.user) {
          setUser(result.data.user);
        } else {
          // Fetch user if not in response
          await fetchUser();
        }
      }
    },
    [fetchUser]
  );

  // Email sign-up
  const signupWithEmail = useCallback(
    async (fullName: string, email: string, password: string, campus: string) => {
      const result = await authService.signupWithEmail(fullName, email, password, campus);
      
      if (result.token) {
        setToken(result.token);
        localStorage.setItem('token', result.token);
        setCookie('jwt', result.token);
        
        if (result.data?.user) {
          setUser(result.data.user);
        } else {
          await fetchUser();
        }
      }
    },
    [fetchUser]
  );

  // Email login
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const result = await authService.loginWithEmail(email, password);
      
      if (result.token) {
        setToken(result.token);
        localStorage.setItem('token', result.token);
        setCookie('jwt', result.token);
        
        if (result.data?.user) {
          setUser(result.data.user);
        } else {
          await fetchUser();
        }
      }
    },
    [fetchUser]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      deleteCookie('jwt');
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    signupWithGoogle,
    completeGoogleSignup,
    signupWithEmail,
    loginWithEmail,
    logout,
    fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

### 5.3 `hooks/useAuth.ts` - Auth Hook

```typescript
'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { AuthContextType } from '@/types/auth';

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 5.4 `hooks/useProtectedRoute.ts` - Route Protection Hook

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useProtectedRoute = () => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  return { isProtected: isAuthenticated && !loading };
};
```

---

## 6. Component Examples

### 6.1 `components/auth/GoogleSignInButton.tsx`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: (tempToken: string, email: string, fullName: string) => void;
  onError?: (error: Error) => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
}) => {
  const router = useRouter();
  const { signupWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google) {
      console.error('Google script not loaded');
      return;
    }

    // Initialize Google Identity Services
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    // Render sign-in button
    if (buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
      });
    }
  }, []);

  const handleCredentialResponse = async (response: any) => {
    if (!response.credential) {
      const error = new Error('No credential received from Google');
      onError?.(error);
      return;
    }

    setLoading(true);
    try {
      const idToken = response.credential;
      const result = await signupWithGoogle(idToken);

      if (result.token) {
        // Existing user: redirect to dashboard
        router.push('/dashboard');
      } else if (result.data?.tempToken) {
        // New user: show campus picker
        onSuccess?.(
          result.data.tempToken,
          result.data.email,
          result.data.fullName
        );
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Sign-in failed');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div ref={buttonRef} />
      {loading && <p className="mt-2 text-sm text-gray-500">Signing in...</p>}
    </div>
  );
};
```

### 6.2 `components/auth/CampusPicker.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as campusService from '@/services/campus';
import { useAuth } from '@/hooks/useAuth';

interface CampusPickerProps {
  tempToken: string;
  email: string;
  fullName: string;
}

export const CampusPicker: React.FC<CampusPickerProps> = ({
  tempToken,
  email,
  fullName,
}) => {
  const router = useRouter();
  const { completeGoogleSignup } = useAuth();
  const [campuses, setCampuses] = useState<any[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campusLoading, setCampusLoading] = useState(true);

  // Fetch campuses on mount
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const data = await campusService.getCampuses();
        setCampuses(data);
      } catch (err) {
        setError('Failed to load campuses. Please try again.');
        console.error(err);
      } finally {
        setCampusLoading(false);
      }
    };

    fetchCampuses();
  }, []);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCampus) {
      setError('Please select a campus');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await completeGoogleSignup(tempToken, selectedCampus);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-up failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (campusLoading) {
    return <div className="text-center">Loading campuses...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Welcome, {fullName}!</h2>
      <p className="text-gray-600 mb-4">{email}</p>

      <form onSubmit={handleComplete}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select your campus:
          </label>
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a campus --</option>
            {campuses.map((campus) => (
              <option key={campus._id} value={campus._id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={!selectedCampus || loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {loading ? 'Completing signup...' : 'Complete Signup'}
        </button>
      </form>
    </div>
  );
};
```

### 6.3 `components/auth/LoginForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

type LoginFormData = yup.InferType<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const { loginWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      await loginWithEmail(data.email, data.password);
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          {...register('email')}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          {...register('password')}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>

      <p className="mt-4 text-center text-sm">
        Don't have an account?{' '}
        <a href="/signup" className="text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </form>
  );
};
```

### 6.4 `app/(auth)/signup/page.tsx` - Signup Page

```typescript
'use client';

import { useState } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { CampusPicker } from '@/components/auth/CampusPicker';
import Link from 'next/link';

export default function SignupPage() {
  const [step, setStep] = useState<'method' | 'campus'>('method');
  const [tempData, setTempData] = useState<{
    tempToken: string;
    email: string;
    fullName: string;
  } | null>(null);

  const handleGoogleSuccess = (tempToken: string, email: string, fullName: string) => {
    setTempData({ tempToken, email, fullName });
    setStep('campus');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {step === 'method' && (
          <>
            <h1 className="text-3xl font-bold text-center mb-2">Join Us!</h1>
            <p className="text-gray-600 text-center mb-6">Create your student marketplace account</p>

            <div className="space-y-4">
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={(err) => console.error(err)}
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              <Link
                href="/signup-email"
                className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center transition"
              >
                Sign up with Email
              </Link>
            </div>

            <p className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Login
              </Link>
            </p>
          </>
        )}

        {step === 'campus' && tempData && (
          <CampusPicker {...tempData} />
        )}
      </div>
    </div>
  );
}
```

### 6.5 `app/(protected)/layout.tsx` - Protected Layout

```typescript
'use client';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { ReactNode } from 'react';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { isProtected } = useProtectedRoute();

  if (!isProtected) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return <>{children}</>;
}
```

### 6.6 `app/(protected)/dashboard/page.tsx` - Dashboard

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const { isProtected } = useProtectedRoute();
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!isProtected) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Student Marketplace</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex items-center gap-4 mb-8">
            {user?.avatar?.url && (
              <Image
                src={user.avatar.url}
                alt={user.fullName}
                width={80}
                height={80}
                className="rounded-full"
              />
            )}
            <div>
              <h2 className="text-3xl font-bold">{user?.fullName}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <p className="text-sm text-gray-500 capitalize">
                Role: {user?.role || 'buyer'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Account Status</h3>
              <p className={user?.isVerified ? 'text-green-600' : 'text-yellow-600'}>
                {user?.isVerified ? '✓ Verified' : 'Pending verification'}
              </p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Auth Method</h3>
              <p className="capitalize">{user?.provider || 'email'}</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Member Since</h3>
              <p>{new Date(user?.createdAt || '').toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

---

## 7. Protected Routes & Middleware

### 7.1 `middleware.ts` (Optional - Server-side Route Protection)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const protectedPaths = ['/dashboard', '/profile', '/settings'];
const authPaths = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('jwt')?.value;
  const path = request.nextUrl.pathname;

  // Redirect to login if accessing protected route without token
  if (protectedPaths.some(p => path.startsWith(p)) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect to dashboard if accessing auth routes with token
  if (authPaths.some(p => path.startsWith(p)) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/login', '/signup'],
};
```

---

## 8. Error Handling & Validation

### 8.1 `lib/validators.ts`

```typescript
import * as yup from 'yup';

export const signupEmailSchema = yup.object({
  fullName: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .required('Full name is required'),
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
  passwordConfirm: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  campus: yup
    .string()
    .required('Please select a campus'),
});

export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email address')
    .required('Email is required'),
  password: yup
    .string()
    .required('Password is required'),
});
```

### 8.2 `lib/cookies.ts`

```typescript
export const setCookie = (name: string, value: string, days = 90) => {
  if (typeof window === 'undefined') return;

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
};

export const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;

  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return cookie.substring(nameEQ.length);
    }
  }
  return null;
};

export const deleteCookie = (name: string) => {
  setCookie(name, '', -1);
};
```

### 8.3 `lib/errors.ts`

```typescript
import { AxiosError } from 'axios';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message || error.message;
    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
};
```

---

## 9. Root Layout with Auth Provider

### 9.1 `app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Student Marketplace',
  description: 'Buy, sell, and trade on campus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## 10. Security Best Practices

### 10.1 Backend CORS Configuration

Update your Express backend (`app.js`):

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 10.2 HttpOnly Cookie Setup

Update your backend `authController.js` to set JWT in HttpOnly cookie:

```javascript
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  // Set HttpOnly cookie (secure in production)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 90, // 90 days
  });

  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token, // Still send token for localStorage fallback
    data: { user }
  });
};
```

### 10.3 Frontend Security Checklist

- ✅ Store sensitive tokens in HttpOnly cookies (set by backend)
- ✅ Use `withCredentials: true` in axios for cookie-based auth
- ✅ Implement CSRF protection (if needed)
- ✅ Never store sensitive data in localStorage
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on auth endpoints
- ✅ Add CAPTCHA to signup/login if needed
- ✅ Validate all inputs on frontend (UX) and backend (security)
- ✅ Implement proper error messages (don't leak info)
- ✅ Log security events

---

## 11. Troubleshooting

### Issue: "Google script not loaded"
**Solution:** Ensure the Google script is in `layout.tsx`:
```html
<script src="https://accounts.google.com/gsi/client" async defer />
```

### Issue: "CORS error when calling backend"
**Solution:** 
1. Ensure backend has CORS enabled for your frontend URL
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Use `withCredentials: true` in axios

### Issue: "Token expiry issues"
**Solution:**
1. Implement refresh token logic in interceptors
2. Automatically redirect to login on 401 error
3. Set reasonable token expiry (7-90 days)

### Issue: "Campus not loading"
**Solution:**
1. Ensure GET `/api/v1/campuses` is public (no auth required)
2. Check network tab for API errors
3. Verify campuses exist in database

### Issue: "Google Sign-In button not showing"
**Solution:**
1. Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
2. Ensure `NEXT_PUBLIC_` prefix for env variable
3. Check browser console for errors
4. Verify Google script loaded

### Issue: "Redirect loop between login and dashboard"
**Solution:**
1. Check token is being saved correctly
2. Verify `useProtectedRoute` logic
3. Clear localStorage/cookies and try again
4. Check middleware config

---

## 12. Quick Start Commands

```bash
# Create Next.js project
npx create-next-app@latest frontend --ts --use-npm
cd frontend

# Install dependencies
npm install axios zustand swr react-hook-form yup @hookform/resolvers
npm install -D @types/js-cookie typescript prettier eslint

# Configure Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1" > .env.local
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>" >> .env.local

# Start development
npm run dev
```

---

## 13. File Checklist

```
✅ .env.local                          (Environment variables)
✅ services/api.ts                     (Axios instance + interceptors)
✅ services/auth.ts                    (Auth API calls)
✅ services/campus.ts                  (Campus API calls)
✅ types/auth.ts                       (TypeScript interfaces)
✅ context/AuthContext.tsx             (Auth state management)
✅ hooks/useAuth.ts                    (Auth hook)
✅ hooks/useProtectedRoute.ts          (Route protection hook)
✅ lib/validators.ts                   (Form validation schemas)
✅ lib/cookies.ts                      (Cookie utilities)
✅ lib/errors.ts                       (Error handling)
✅ components/auth/GoogleSignInButton.tsx
✅ components/auth/CampusPicker.tsx
✅ components/auth/LoginForm.tsx
✅ app/layout.tsx                      (Root layout + AuthProvider)
✅ app/(auth)/signup/page.tsx          (Signup page)
✅ app/(auth)/login/page.tsx           (Login page)
✅ app/(protected)/layout.tsx          (Protected layout)
✅ app/(protected)/dashboard/page.tsx  (Dashboard)
✅ middleware.ts                       (Optional route protection)
```

---

## 14. Next Steps

1. **Copy all example files** to your Next.js project
2. **Update `.env.local`** with your actual values
3. **Test Google Sign-In** flow in browser
4. **Implement email signup** form (similar to Google flow)
5. **Add password reset** flow
6. **Setup tests** (Jest + React Testing Library)
7. **Deploy** to Vercel (frontend) and your backend hosting
8. **Monitor** errors with Sentry

---

**Happy coding! 🚀**
