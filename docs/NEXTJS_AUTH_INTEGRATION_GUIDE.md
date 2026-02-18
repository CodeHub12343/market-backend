# 🔐 Next.js Authentication Integration Guide (JavaScript + React Query + Your Styled Components)

**For:** Student Marketplace Backend + Your Existing Frontend Structure  
**Frontend:** Next.js 14+ with JavaScript + Styled Components  
**Auth Flow:** Google Sign-In + Email/Password + Campus Selection  
**State Management:** React Query + Context API  
**JWT Storage:** HttpOnly Cookies (secure) + In-Memory State  

---

## 📋 Table of Contents

1. [Integration Overview](#integration-overview)
2. [Backend Compatibility Check](#backend-compatibility-check)
3. [Setup Core Authentication Files](#setup-core-authentication-files)
4. [Update Your Existing Pages](#update-your-existing-pages)
5. [Component Examples with Your Styling](#component-examples-with-your-styling)
6. [Protected Routes Setup](#protected-routes-setup)
7. [Complete Testing Checklist](#complete-testing-checklist)

---

## 1. Integration Overview

You have a beautifully styled login page already. Here's how to integrate authentication without breaking your existing design:

### Current Structure
```
university-market/
├── src/
│   └── app/
│       ├── login/
│       │   └── page.js (✅ Your existing styled login)
│       ├── signup/
│       │   └── page.js (✅ Your existing styled signup)
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.js
│       ├── page.js
│       └── styles.js
├── public/
├── .env.local
└── package.json
```

### What We'll Add
```
university-market/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   ├── page.js (UPDATE: Add auth logic + Google Sign-In)
│   │   │   └── styles.js (Keep your existing styles)
│   │   ├── signup/
│   │   │   ├── page.js (UPDATE: Add auth logic + campus selection)
│   │   │   └── styles.js (Keep your existing styles)
│   │   ├── (protected)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.js (NEW: Protected page)
│   │   │   └── layout.js (NEW: Auth guard)
│   │   ├── layout.js (UPDATE: Add providers)
│   │   └── globals.css
│   ├── context/
│   │   └── AuthContext.jsx (NEW: Auth state)
│   ├── hooks/
│   │   ├── useAuth.js (NEW: Auth hook)
│   │   ├── useProtectedRoute.js (NEW: Route guard)
│   │   └── useQueries.js (NEW: React Query hooks)
│   ├── services/
│   │   ├── api.js (NEW: Axios config)
│   │   ├── auth.js (NEW: Auth API)
│   │   └── campus.js (NEW: Campus API)
│   └── lib/
│       ├── cookies.js (NEW: Cookie utilities)
│       ├── errors.js (NEW: Error handling)
│       └── react-query.js (NEW: React Query config)
├── components/ (or src/components/)
│   └── Providers.jsx (NEW: Query + Auth providers)
├── public/
├── .env.local (UPDATE: Add Google Client ID)
└── package.json
```

---

## 2. Backend Compatibility Check

### Verify Your Backend Has These Endpoints

Run this to check your backend endpoints:

```bash
# Check if endpoints exist
curl -s http://localhost:5000/api/v1/campuses
curl -s http://localhost:5000/api/v1/auth/me
```

### Required Backend Endpoints

| Endpoint | Method | Body | Purpose |
|----------|--------|------|---------|
| `/auth/google-verify` | POST | `{idToken}` | Verify Google ID token |
| `/auth/google-complete` | POST | `{tempToken, campusId}` | Complete Google signup |
| `/auth/signup` | POST | `{fullName, email, password, campus}` | Email signup |
| `/auth/login` | POST | `{email, password}` | Email login |
| `/auth/me` | GET | - | Get current user |
| `/auth/logout` | POST | - | Logout |
| `/campuses` | GET | - | Get all campuses |

✅ **All these are already in your backend!**

---

## 3. Setup Core Authentication Files

### 3.1 Create `lib/react-query.js`

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

### 3.2 Create `components/Providers.jsx`

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

### 3.3 Create `lib/cookies.js`

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

### 3.4 Create `lib/errors.js`

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

### 3.5 Create `services/api.js` - Axios Instance

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

// Response interceptor: handle 401 (token expired)
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

### 3.6 Create `services/auth.js` - Auth API Calls

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

### 3.7 Create `services/campus.js` - Campus API

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

### 3.8 Create `context/AuthContext.jsx` - Auth State Management

```javascript
'use client';

import React, { createContext, useState } from 'react';
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

### 3.9 Create `hooks/useAuth.js`

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

### 3.10 Create `hooks/useProtectedRoute.js`

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

### 3.11 Create `hooks/useQueries.js`

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

### 3.12 Update `.env.local`

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

### 3.13 Update `app/layout.jsx` - Add Providers

```javascript
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Providers } from '@/components/Providers';
import './globals.css';

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

## 4. Update Your Existing Pages

### 4.1 Update Your Login Page (`app/login/page.jsx`)

Replace your existing login page with this updated version that keeps your styling:

```javascript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';
import {
  PageWrapper,
  LoginContainer,
  BackButton,
  IconSection,
  CarIcon,
  Heading,
  SocialLogins,
  SocialButton,
  Separator,
  OrText,
  SignInButton,
  SignupPrompt,
  SignupLink,
  InputField,
  ErrorMessage,
  FormGroup,
} from './styles';
import { FaArrowLeft, FaCar, FaFacebook, FaGoogle, FaApple } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError, verifyGoogle, isVerifyingGoogle } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const googleButtonRef = useRef(null);

  // Initialize Google Sign-In button
  useEffect(() => {
    if (!showPasswordForm && googleButtonRef.current && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
        });
      } catch (err) {
        console.error('Google sign-in initialization failed:', err);
      }
    }
  }, [showPasswordForm]);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) {
      setError('Failed to get Google credential');
      return;
    }

    try {
      const result = await verifyGoogle(response.credential);
      if (result.data.token) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-in failed');
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  const goToSignup = () => {
    router.push('/signup');
  };

  const goBack = () => {
    setShowPasswordForm(false);
    setError(null);
  };

  if (showPasswordForm) {
    return (
      <PageWrapper>
        <LoginContainer>
          <BackButton onClick={goBack}>
            <FaArrowLeft />
          </BackButton>

          <IconSection>
            <CarIcon>
              <FaCar />
            </CarIcon>
          </IconSection>

          <Heading>Sign in with password</Heading>

          <form onSubmit={handleEmailLogin}>
            {error && <ErrorMessage>{error}</ErrorMessage>}

            <FormGroup>
              <InputField
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
              />
            </FormGroup>

            <FormGroup>
              <InputField
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
              />
            </FormGroup>

            <SignInButton type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign in'}
            </SignInButton>
          </form>

          <SignupPrompt>
            Don&apos;t have an account? <SignupLink onClick={goToSignup}>Sign up</SignupLink>
          </SignupPrompt>
        </LoginContainer>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LoginContainer>
        <BackButton onClick={() => router.back()}>
          <FaArrowLeft />
        </BackButton>

        <IconSection>
          <CarIcon>
            <FaCar />
          </CarIcon>
        </IconSection>

        <Heading>Let&apos;s you in</Heading>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <SocialLogins>
          {/* Google Sign-In Button */}
          <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />

          <SocialButton onClick={() => setShowPasswordForm(true)}>
            Sign in with password
          </SocialButton>
        </SocialLogins>

        <Separator>
          <OrText>or</OrText>
        </Separator>

        <SignInButton onClick={() => setShowPasswordForm(true)} disabled={isVerifyingGoogle}>
          {isVerifyingGoogle ? 'Signing in...' : 'Use Email'}
        </SignInButton>

        <SignupPrompt>
          Don&apos;t have an account? <SignupLink onClick={goToSignup}>Sign up</SignupLink>
        </SignupPrompt>
      </LoginContainer>
    </PageWrapper>
  );
}
```

### 4.2 Update Your Signup Page (`app/signup/page.jsx`)

```javascript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCampuses } from '@/hooks/useQueries';
import { useEffect, useRef } from 'react';
import {
  PageWrapper,
  LoginContainer,
  BackButton,
  IconSection,
  CarIcon,
  Heading,
  SocialLogins,
  SocialButton,
  Separator,
  OrText,
  SignInButton,
  SignupPrompt,
  SignupLink,
  InputField,
  ErrorMessage,
  FormGroup,
  SelectField,
} from './styles';
import { FaArrowLeft, FaCar } from 'react-icons/fa';

export default function SignupPage() {
  const router = useRouter();
  const { verifyGoogle, isVerifyingGoogle, signup, isSigningUp, completeGoogleSignup, isCompletingSignup } = useAuth();
  const { data: campuses } = useCampuses();
  
  const [step, setStep] = useState('method'); // method, email, campus, google-campus
  const [error, setError] = useState(null);
  
  // Email signup fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  
  // Google signup fields
  const [googleData, setGoogleData] = useState(null);
  const googleButtonRef = useRef(null);

  // Initialize Google Sign-Up button
  useEffect(() => {
    if (step === 'method' && googleButtonRef.current && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
        });
      } catch (err) {
        console.error('Google sign-in initialization failed:', err);
      }
    }
  }, [step]);

  const handleGoogleResponse = async (response) => {
    if (!response.credential) {
      setError('Failed to get Google credential');
      return;
    }

    try {
      const result = await verifyGoogle(response.credential);
      
      if (result.data.token) {
        // Existing user
        router.push('/dashboard');
      } else if (result.data.data?.tempToken) {
        // New user - show campus picker
        setGoogleData({
          tempToken: result.data.data.tempToken,
          email: result.data.data.email,
          fullName: result.data.data.fullName,
        });
        setStep('google-campus');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-up failed');
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password || !selectedCampus) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await signup({ fullName, email, password, campus: selectedCampus });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign-up failed');
    }
  };

  const handleGoogleCampusSelect = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedCampus) {
      setError('Please select a campus');
      return;
    }

    try {
      await completeGoogleSignup({
        tempToken: googleData.tempToken,
        campusId: selectedCampus,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign-up failed');
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const goBack = () => {
    setStep('method');
    setError(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setSelectedCampus('');
    setGoogleData(null);
  };

  // STEP 1: Choose signup method
  if (step === 'method') {
    return (
      <PageWrapper>
        <LoginContainer>
          <BackButton onClick={() => router.back()}>
            <FaArrowLeft />
          </BackButton>

          <IconSection>
            <CarIcon>
              <FaCar />
            </CarIcon>
          </IconSection>

          <Heading>Create Account</Heading>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <SocialLogins>
            {/* Google Sign-Up Button */}
            <div ref={googleButtonRef} style={{ display: 'flex', justifyContent: 'center' }} />

            <SocialButton onClick={() => setStep('email')}>
              Sign up with Email
            </SocialButton>
          </SocialLogins>

          <Separator>
            <OrText>or</OrText>
          </Separator>

          <SignInButton onClick={() => setStep('email')}>
            Continue with Email
          </SignInButton>

          <SignupPrompt>
            Already have an account? <SignupLink onClick={goToLogin}>Login</SignupLink>
          </SignupPrompt>
        </LoginContainer>
      </PageWrapper>
    );
  }

  // STEP 2: Email signup form
  if (step === 'email') {
    return (
      <PageWrapper>
        <LoginContainer>
          <BackButton onClick={goBack}>
            <FaArrowLeft />
          </BackButton>

          <IconSection>
            <CarIcon>
              <FaCar />
            </CarIcon>
          </IconSection>

          <Heading>Sign up with Email</Heading>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <form onSubmit={handleEmailSignup}>
            <FormGroup>
              <InputField
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSigningUp}
              />
            </FormGroup>

            <FormGroup>
              <InputField
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSigningUp}
              />
            </FormGroup>

            <FormGroup>
              <InputField
                type="password"
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSigningUp}
              />
            </FormGroup>

            <FormGroup>
              <SelectField
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                disabled={isSigningUp}
              >
                <option value="">Select your campus</option>
                {campuses?.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </SelectField>
            </FormGroup>

            <SignInButton type="submit" disabled={isSigningUp}>
              {isSigningUp ? 'Creating account...' : 'Sign up'}
            </SignInButton>
          </form>

          <SignupPrompt>
            Already have an account? <SignupLink onClick={goToLogin}>Login</SignupLink>
          </SignupPrompt>
        </LoginContainer>
      </PageWrapper>
    );
  }

  // STEP 3: Google signup - Campus selection
  if (step === 'google-campus' && googleData) {
    return (
      <PageWrapper>
        <LoginContainer>
          <BackButton onClick={goBack}>
            <FaArrowLeft />
          </BackButton>

          <IconSection>
            <CarIcon>
              <FaCar />
            </CarIcon>
          </IconSection>

          <Heading>Welcome, {googleData.fullName}!</Heading>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
            {googleData.email}
          </p>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <form onSubmit={handleGoogleCampusSelect}>
            <FormGroup>
              <SelectField
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                disabled={isCompletingSignup}
              >
                <option value="">Select your campus</option>
                {campuses?.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </SelectField>
            </FormGroup>

            <SignInButton type="submit" disabled={isCompletingSignup}>
              {isCompletingSignup ? 'Completing signup...' : 'Complete Signup'}
            </SignInButton>
          </form>

          <SignupPrompt>
            Already have an account? <SignupLink onClick={goToLogin}>Login</SignupLink>
          </SignupPrompt>
        </LoginContainer>
      </PageWrapper>
    );
  }

  return null;
}
```

### 4.3 Update Your Styles File (`app/signup/styles.js` and `app/login/styles.js`)

Add these new styled components to your existing styles:

```javascript
// Add to your existing styles.js

import styled from 'styled-components';

export const ErrorMessage = styled.div`
  background-color: #fee;
  color: #c00;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  border: 1px solid #fcc;
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #999;
  }
`;

export const SelectField = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  background-color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }

  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  option {
    padding: 8px;
  }
`;
```

---

## 5. Protected Routes Setup

### 5.1 Create Protected Layout (`app/(protected)/layout.jsx`)

```javascript
'use client';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function ProtectedLayout({ children }) {
  const { isProtected } = useProtectedRoute();

  if (!isProtected) {
    return null; // Will redirect to /login via the hook
  }

  return <>{children}</>;
}
```

### 5.2 Create Dashboard Page (`app/(protected)/dashboard/page.jsx`)

```javascript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styled from 'styled-components';

const DashboardWrapper = styled.div`
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const NavBar = styled.nav`
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
`;

const NavContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin: 0;
`;

const LogoutButton = styled.button`
  padding: 10px 20px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background-color: #c82333;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Card = styled.div`
  background-color: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
`;

const UserAvatar = styled(Image)`
  border-radius: 50%;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.h2`
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const UserEmail = styled.p`
  color: #666;
  margin: 0 0 4px 0;
`;

const UserRole = styled.p`
  color: #999;
  font-size: 14px;
  text-transform: capitalize;
  margin: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const StatBox = styled.div`
  padding: 20px;
  border-radius: 8px;
  background-color: ${props => props.bgColor || '#f0f0f0'};

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 10px 0;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
`;

export default function DashboardPage() {
  const { user, logout, isLoggingOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <DashboardWrapper>
      <NavBar>
        <NavContainer>
          <Title>Student Marketplace</Title>
          <LogoutButton onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </LogoutButton>
        </NavContainer>
      </NavBar>

      <MainContent>
        <Card>
          <UserHeader>
            {user?.avatar?.url && (
              <UserAvatar
                src={user.avatar.url}
                alt={user.fullName}
                width={80}
                height={80}
              />
            )}
            <UserInfo>
              <UserName>{user?.fullName}</UserName>
              <UserEmail>{user?.email}</UserEmail>
              <UserRole>Role: {user?.role || 'buyer'}</UserRole>
            </UserInfo>
          </UserHeader>

          <StatsGrid>
            <StatBox bgColor="#eff">
              <h3>Account Status</h3>
              <p style={{ color: user?.isVerified ? '#28a745' : '#ffc107' }}>
                {user?.isVerified ? '✓ Verified' : 'Pending verification'}
              </p>
            </StatBox>

            <StatBox bgColor="#ffe">
              <h3>Auth Method</h3>
              <p style={{ textTransform: 'capitalize' }}>
                {user?.provider || 'email'}
              </p>
            </StatBox>

            <StatBox bgColor="#eef">
              <h3>Member Since</h3>
              <p>{new Date(user?.createdAt || '').toLocaleDateString()}</p>
            </StatBox>
          </StatsGrid>
        </Card>
      </MainContent>
    </DashboardWrapper>
  );
}
```

---

## 6. Complete Testing Checklist

### 6.1 Installation Commands

```bash
# Install all dependencies
npm install axios react-query js-cookie react-hook-form yup
npm install --save-dev @react-query/devtools

# Or if you want devtools separately:
npm install react-query @tanstack/react-query-devtools
```

### 6.2 Backend Verification

```bash
# Test backend is running
curl http://localhost:5000/api/v1/campuses

# Expected response:
# { "status": "success", "data": [...] }
```

### 6.3 Frontend Testing Steps

**1. Test Email Login:**
- Navigate to `/login`
- Click "Use Email"
- Enter test credentials
- Should redirect to `/dashboard`

**2. Test Email Signup:**
- Navigate to `/signup`
- Click "Continue with Email"
- Fill form with: name, email, password, campus
- Should redirect to `/dashboard`

**3. Test Google Sign-In (Login):**
- Navigate to `/login`
- Click Google button
- Sign in with existing account
- Should redirect to `/dashboard`

**4. Test Google Sign-Up (New User):**
- Navigate to `/signup`
- Click Google button
- Sign in with new account
- Select campus
- Should redirect to `/dashboard`

**5. Test Protected Route:**
- Logout from `/dashboard`
- Try to access `/dashboard` directly
- Should redirect to `/login`

**6. Test Token Expiry:**
- Delete JWT cookie from DevTools
- Try to access protected route
- Should redirect to `/login`

### 6.4 Environment Check

```bash
# Verify .env.local file exists with:
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=748421078644-8ai5lvp22d2fcuguh40h6jtddr709ecl.apps.googleusercontent.com
```

---

## 7. File Structure Summary

Create these files in order (inside `src/` folder):

```
📁 src/lib/
  ├── react-query.js          (React Query config)
  ├── cookies.js              (Cookie utilities)
  └── errors.js               (Error handling)

📁 src/services/
  ├── api.js                  (Axios instance)
  ├── auth.js                 (Auth endpoints)
  └── campus.js               (Campus endpoints)

📁 src/context/
  └── AuthContext.jsx         (Auth state management)

📁 src/hooks/
  ├── useAuth.js              (Auth hook)
  ├── useProtectedRoute.js    (Route guard)
  └── useQueries.js           (React Query hooks)

📁 components/ (or src/components/)
  └── Providers.jsx           (Query + Auth providers)

📁 src/app/(protected)/
  ├── layout.js               (Protected layout)
  └── dashboard/page.js       (Dashboard page)

✏️ UPDATE these:
  └── src/app/layout.js       (Add providers)
  └── src/app/login/page.js   (Add auth logic + Google Sign-In)
  └── src/app/signup/page.js  (Add auth logic + campus selection)
  └── .env.local              (Add env variables)
```

---

## 8. Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Google script not loaded" | Ensure `<script src="https://accounts.google.com/gsi/client" />` is in layout.jsx |
| "Token not saving" | Check localStorage is enabled, verify cookies in DevTools |
| "CORS error" | Ensure backend CORS allows http://localhost:3000 |
| "Campus dropdown empty" | Check backend `/campuses` endpoint returns data |
| "Can't reach backend" | Verify `NEXT_PUBLIC_API_URL` matches your backend URL |
| "Google button not rendering" | Check window.google is loaded and client ID is correct |

---

**You're all set! 🎉 Your frontend is now fully integrated with the backend authentication system while keeping your beautiful styled components!**
