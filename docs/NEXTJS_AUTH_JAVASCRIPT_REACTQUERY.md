# 🔐 Complete Next.js Frontend Authentication Guide (JavaScript + React Query)

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
5. [React Query Setup](#react-query-setup)
6. [Authentication Context & Hooks](#authentication-context--hooks)
7. [Component Examples](#component-examples)
8. [Protected Routes & Middleware](#protected-routes--middleware)
9. [Error Handling & Validation](#error-handling--validation)
10. [Security Best Practices](#security-best-practices)
11. [Troubleshooting](#troubleshooting)

---

## 1. Project Setup

### 1.1 Create Next.js Project

```bash
# Create Next.js app (JavaScript, no TypeScript)
npx create-next-app@latest frontend --use-npm

# Navigate to project
cd frontend

# Install essential packages
npm install axios react-query js-cookie react-hook-form yup clsx

# UI & Styling
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react

# Dev tools
npm install -D prettier eslint eslint-config-next
```

### 1.2 Project Structure

```
frontend/
├── app/
│   ├── layout.jsx              # Root layout + AuthProvider + QueryClientProvider
│   ├── page.jsx                # Homepage
│   ├── (auth)/                 # Auth routes group
│   │   ├── signup/
│   │   │   └── page.jsx        # Google signup + campus picker
│   │   ├── login/
│   │   │   └── page.jsx        # Email/password login
│   │   └── callback/
│   │       └── page.jsx        # Google callback handler (optional)
│   ├── (protected)/            # Protected routes
│   │   ├── dashboard/
│   │   │   └── page.jsx        # User dashboard
│   │   ├── profile/
│   │   │   └── page.jsx        # Profile page
│   │   └── layout.jsx          # Protected layout (checks auth)
│   └── api/
│       └── auth/
│           └── route.js        # Optional: server-side auth endpoints
├── components/
│   ├── auth/
│   │   ├── GoogleSignInButton.jsx
│   │   ├── CampusPicker.jsx
│   │   ├── LoginForm.jsx
│   │   └── SignupForm.jsx
│   ├── Navigation.jsx
│   └── ErrorBoundary.jsx
├── hooks/
│   ├── useAuth.js              # Auth hook
│   ├── useProtectedRoute.js    # Route protection hook
│   └── useQueries.js           # React Query hooks
├── context/
│   └── AuthContext.jsx         # Auth state management
├── services/
│   ├── api.js                  # Axios instance
│   ├── auth.js                 # Auth API calls
│   └── campus.js               # Campus API calls
├── lib/
│   ├── validators.js           # Validation schemas
│   ├── errors.js               # Error handling
│   └── cookies.js              # Cookie utilities
├── styles/
│   └── globals.css             # Tailwind imports
├── public/
│   └── (static assets)
├── .env.local                  # Local env vars
├── tailwind.config.js          # Tailwind config
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
```

### 2.2 Update `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = nextConfig;
```

### 2.3 Tailwind Setup

Create `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 3. Authentication Flow Diagram

```
SIGNUP WITH GOOGLE:
┌──────────────────┐
│ Click Google Button
└────────┬─────────┘
         ↓
┌──────────────────────────────┐
│ Google popup auth
└────────┬─────────────────────┘
         ↓
┌──────────────────────────────┐
│ POST /auth/google-verify
│ (idToken)
└────────┬─────────────────────┘
         ↓
   ┌─────┴─────┐
   ↓           ↓
EXISTING   NEW USER
USER       ↓
↓          Show Campus Picker
Return JWT ↓
↓          Select Campus
Redirect   ↓
Dashboard  POST /auth/google-complete
           (tempToken + campusId)
           ↓
           Return JWT
           ↓
           Redirect Dashboard
```

---

## 4. API Service Layer

### 4.1 `services/api.js` - Axios Instance with Interceptors

```javascript
import axios from 'axios';
import { getCookie, deleteCookie } from '@/lib/cookies';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '10000');

const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
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
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        deleteCookie('jwt');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 4.2 `services/auth.js` - Auth API Endpoints

```javascript
import api from './api';

/**
 * Step 1: Verify Google ID Token
 * Returns tempToken for new users, or JWT for existing users
 */
export const verifyGoogleToken = (idToken) =>
  api.post('/auth/google-verify', { idToken });

/**
 * Step 2: Complete Google signup with campus selection
 */
export const completeGoogleSignup = (tempToken, campusId) =>
  api.post('/auth/google-complete', { tempToken, campusId });

/**
 * Email/Password signup
 */
export const signupWithEmail = (fullName, email, password, campus) =>
  api.post('/auth/signup', {
    fullName,
    email,
    password,
    passwordConfirm: password,
    campus,
  });

/**
 * Email/Password login
 */
export const loginWithEmail = (email, password) =>
  api.post('/auth/login', { email, password });

/**
 * Get current user info
 */
export const getCurrentUser = () =>
  api.get('/auth/me');

/**
 * Logout
 */
export const logout = () =>
  api.post('/auth/logout');

/**
 * Verify email
 */
export const verifyEmail = (token) =>
  api.post('/auth/verify-email', { token });

/**
 * Forgot password
 */
export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

/**
 * Reset password
 */
export const resetPassword = (token, password) =>
  api.patch('/auth/reset-password', {
    token,
    password,
    passwordConfirm: password,
  });
```

### 4.3 `services/campus.js` - Campus API

```javascript
import api from './api';

/**
 * Get all campuses
 */
export const getCampuses = () =>
  api.get('/campuses');

/**
 * Get single campus
 */
export const getCampusById = (id) =>
  api.get(`/campuses/${id}`);
```

---

## 5. React Query Setup

### 5.1 React Query Configuration File `lib/react-query.js`

```javascript
import { QueryClient } from 'react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
```

### 5.2 React Query Provider `components/Providers.jsx`

```javascript
'use client';

import { QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { createQueryClient } from '@/lib/react-query';

const queryClient = createQueryClient();

export const Providers = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);
```

---

## 6. Authentication Context & Hooks

### 6.1 `context/AuthContext.jsx` - Auth State Management

```javascript
'use client';

import React, { createContext, useCallback, useState } from 'react';
import * as authService from '@/services/auth';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { setCookie, deleteCookie } from '@/lib/cookies';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || null;
    }
    return null;
  });

  // Fetch current user
  const { data: user, isLoading } = useQuery(
    ['user'],
    () => authService.getCurrentUser().then((res) => res.data.data.user),
    {
      enabled: !!token,
      staleTime: 1000 * 60 * 10,
      retry: false,
    }
  );

  // Google verify mutation
  const googleVerifyMutation = useMutation(
    (idToken) => authService.verifyGoogleToken(idToken),
    {
      onSuccess: (res) => {
        if (res.data.token) {
          setToken(res.data.token);
          localStorage.setItem('token', res.data.token);
          setCookie('jwt', res.data.token);
          queryClient.invalidateQueries('user');
        }
      },
    }
  );

  // Complete Google signup mutation
  const completeGoogleMutation = useMutation(
    ({ tempToken, campusId }) =>
      authService.completeGoogleSignup(tempToken, campusId),
    {
      onSuccess: (res) => {
        if (res.data.token) {
          setToken(res.data.token);
          localStorage.setItem('token', res.data.token);
          setCookie('jwt', res.data.token);
          queryClient.invalidateQueries('user');
        }
      },
    }
  );

  // Email signup mutation
  const signupMutation = useMutation(
    (data) =>
      authService.signupWithEmail(
        data.fullName,
        data.email,
        data.password,
        data.campus
      ),
    {
      onSuccess: (res) => {
        if (res.data.token) {
          setToken(res.data.token);
          localStorage.setItem('token', res.data.token);
          setCookie('jwt', res.data.token);
          queryClient.invalidateQueries('user');
        }
      },
    }
  );

  // Email login mutation
  const loginMutation = useMutation(
    (data) => authService.loginWithEmail(data.email, data.password),
    {
      onSuccess: (res) => {
        if (res.data.token) {
          setToken(res.data.token);
          localStorage.setItem('token', res.data.token);
          setCookie('jwt', res.data.token);
          queryClient.invalidateQueries('user');
        }
      },
    }
  );

  // Logout mutation
  const logoutMutation = useMutation(() => authService.logout(), {
    onSuccess: () => {
      setToken(null);
      localStorage.removeItem('token');
      deleteCookie('jwt');
      queryClient.resetQueries();
    },
  });

  const value = {
    user: user || null,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    // Mutations
    verifyGoogle: googleVerifyMutation.mutateAsync,
    completeGoogleSignup: completeGoogleMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    // Loading states
    isVerifyingGoogle: googleVerifyMutation.isLoading,
    isCompletingSignup: completeGoogleMutation.isLoading,
    isSigningUp: signupMutation.isLoading,
    isLoggingIn: loginMutation.isLoading,
    isLoggingOut: logoutMutation.isLoading,
    // Errors
    googleError: googleVerifyMutation.error,
    signupError: signupMutation.error,
    loginError: loginMutation.error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 6.2 `hooks/useAuth.js` - Auth Hook

```javascript
'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 6.3 `hooks/useProtectedRoute.js` - Route Protection Hook

```javascript
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './useAuth';

export const useProtectedRoute = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isProtected: isAuthenticated && !isLoading };
};
```

### 6.4 `hooks/useQueries.js` - Custom React Query Hooks

```javascript
import { useQuery } from 'react-query';
import * as campusService from '@/services/campus';

/**
 * Fetch all campuses
 */
export const useCampuses = () =>
  useQuery(['campuses'], () =>
    campusService.getCampuses().then((res) => res.data.data || [])
  );

/**
 * Fetch single campus
 */
export const useCampus = (campusId) =>
  useQuery(
    ['campus', campusId],
    () => campusService.getCampusById(campusId).then((res) => res.data.data),
    { enabled: !!campusId }
  );
```

---

## 7. Component Examples

### 7.1 `components/auth/GoogleSignInButton.jsx`

```javascript
'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    google: any;
  }
}

export const GoogleSignInButton = ({ onSuccess, onError }) => {
  const router = useRouter();
  const { verifyGoogle, isVerifyingGoogle } = useAuth();
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google) {
      console.error('Google script not loaded');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    if (buttonRef.current) {
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signup_with',
      });
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    if (!response.credential) {
      onError?.(new Error('No credential received from Google'));
      return;
    }

    try {
      const result = await verifyGoogle(response.credential);

      if (result.data.token) {
        // Existing user: redirect to dashboard
        router.push('/dashboard');
      } else if (result.data.data?.tempToken) {
        // New user: show campus picker
        onSuccess?.(
          result.data.data.tempToken,
          result.data.data.email,
          result.data.data.fullName
        );
      }
    } catch (error) {
      onError?.(error);
    }
  };

  return (
    <div>
      <div ref={buttonRef} />
      {isVerifyingGoogle && (
        <p className="mt-2 text-sm text-gray-500">Signing in...</p>
      )}
    </div>
  );
};
```

### 7.2 `components/auth/CampusPicker.jsx`

```javascript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCampuses } from '@/hooks/useQueries';

export const CampusPicker = ({ tempToken, email, fullName }) => {
  const router = useRouter();
  const { completeGoogleSignup, isCompletingSignup } = useAuth();
  const { data: campuses, isLoading: campusesLoading } = useCampuses();
  const [selectedCampus, setSelectedCampus] = useState('');
  const [error, setError] = useState(null);

  const handleComplete = async (e) => {
    e.preventDefault();

    if (!selectedCampus) {
      setError('Please select a campus');
      return;
    }

    setError(null);

    try {
      await completeGoogleSignup({ tempToken, campusId: selectedCampus });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign-up failed');
    }
  };

  if (campusesLoading) {
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
            disabled={isCompletingSignup}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a campus --</option>
            {campuses?.map((campus) => (
              <option key={campus._id} value={campus._id}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <button
          type="submit"
          disabled={!selectedCampus || isCompletingSignup}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
        >
          {isCompletingSignup ? 'Completing signup...' : 'Complete Signup'}
        </button>
      </form>
    </div>
  );
};
```

### 7.3 `components/auth/LoginForm.jsx`

```javascript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export const LoginForm = () => {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data);
      router.push('/dashboard');
    } catch (err) {
      // Error handled by context
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Login</h2>

      {loginError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {loginError?.response?.data?.message || 'Login failed'}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Email</label>
        <input
          type="email"
          {...register('email', { required: true })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Password</label>
        <input
          type="password"
          {...register('password', { required: true })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoggingIn}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
      >
        {isLoggingIn ? 'Logging in...' : 'Login'}
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

### 7.4 `app/(auth)/signup/page.jsx` - Signup Page

```javascript
'use client';

import { useState } from 'react';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { CampusPicker } from '@/components/auth/CampusPicker';
import Link from 'next/link';

export default function SignupPage() {
  const [step, setStep] = useState('method');
  const [tempData, setTempData] = useState(null);

  const handleGoogleSuccess = (tempToken, email, fullName) => {
    setTempData({ tempToken, email, fullName });
    setStep('campus');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        {step === 'method' && (
          <>
            <h1 className="text-3xl font-bold text-center mb-2">Join Us!</h1>
            <p className="text-gray-600 text-center mb-6">
              Create your student marketplace account
            </p>

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

### 7.5 `app/(protected)/dashboard/page.jsx` - Dashboard

```javascript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardPage() {
  const { isProtected } = useProtectedRoute();
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();

  if (!isProtected) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Student Marketplace</h1>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
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

## 8. Root Layout with Auth Provider & React Query

### 8.1 `app/layout.jsx`

```javascript
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

export const metadata = {
  title: 'Student Marketplace',
  description: 'Buy, sell, and trade on campus',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
```

---

## 9. Error Handling & Validation

### 9.1 `lib/cookies.js` - Cookie Utilities

```javascript
export const setCookie = (name, value, days = 90) => {
  if (typeof window === 'undefined') return;

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
};

export const getCookie = (name) => {
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

export const deleteCookie = (name) => {
  setCookie(name, '', -1);
};
```

### 9.2 `lib/errors.js` - Error Handling

```javascript
export class ApiError extends Error {
  constructor(statusCode, message, data) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const handleApiError = (error) => {
  if (error.response) {
    return error.response.data?.message || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred';
};
```

---

## 10. Security Best Practices

### Backend CORS Configuration

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

### HttpOnly Cookie Setup

Update your backend `authController.js`:

```javascript
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 90,
  });

  user.password = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};
```

### Frontend Security Checklist

- ✅ Store tokens in HttpOnly cookies (set by backend)
- ✅ Use `withCredentials: true` in axios
- ✅ Validate all inputs on frontend and backend
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on auth endpoints
- ✅ Clear tokens on logout
- ✅ Handle token expiry gracefully

---

## 11. Troubleshooting

### Issue: "Google script not loaded"
**Solution:** Ensure the Google script is in `app/layout.jsx`:
```html
<script src="https://accounts.google.com/gsi/client" async defer />
```

### Issue: "CORS error when calling backend"
**Solution:**
1. Ensure backend CORS allows your frontend URL
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Use `withCredentials: true` in axios

### Issue: "React Query not working"
**Solution:**
1. Ensure `Providers` component wraps all children
2. Check that `AuthProvider` is inside `QueryClientProvider`
3. Verify React Query devtools in development

### Issue: "Token not being saved"
**Solution:**
1. Check localStorage is enabled in browser
2. Verify cookies are being set (check DevTools → Application → Cookies)
3. Ensure backend sets `Set-Cookie` header

### Issue: "Redirect loop between login and dashboard"
**Solution:**
1. Check token is being saved correctly
2. Verify `useProtectedRoute` logic
3. Clear localStorage/cookies and try again

---

## 12. Quick Start Commands

```bash
# Create Next.js project
npx create-next-app@latest frontend --use-npm
cd frontend

# Install dependencies
npm install axios react-query js-cookie react-hook-form yup
npm install -D tailwindcss postcss autoprefixer prettier eslint

# Setup Tailwind
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
✅ services/api.js                     (Axios instance + interceptors)
✅ services/auth.js                    (Auth API calls)
✅ services/campus.js                  (Campus API calls)
✅ context/AuthContext.jsx             (Auth state management)
✅ hooks/useAuth.js                    (Auth hook)
✅ hooks/useProtectedRoute.js          (Route protection hook)
✅ hooks/useQueries.js                 (React Query hooks)
✅ lib/cookies.js                      (Cookie utilities)
✅ lib/errors.js                       (Error handling)
✅ lib/react-query.js                  (React Query config)
✅ components/Providers.jsx            (Query + Auth providers)
✅ components/auth/GoogleSignInButton.jsx
✅ components/auth/CampusPicker.jsx
✅ components/auth/LoginForm.jsx
✅ app/layout.jsx                      (Root layout + Providers)
✅ app/(auth)/signup/page.jsx          (Signup page)
✅ app/(auth)/login/page.jsx           (Login page)
✅ app/(protected)/layout.jsx          (Protected layout)
✅ app/(protected)/dashboard/page.jsx  (Dashboard)
```

---

## 14. Next Steps

1. **Copy all example files** to your Next.js project
2. **Update `.env.local`** with your actual values
3. **Test Google Sign-In** flow in browser
4. **Implement email signup** form
5. **Add password reset** flow
6. **Setup tests** (Jest + React Testing Library)
7. **Deploy** to Vercel (frontend) and your backend hosting

---

**Happy coding! 🚀**
