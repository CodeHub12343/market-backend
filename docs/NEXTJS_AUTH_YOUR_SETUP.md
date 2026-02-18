# 🔐 Next.js Auth Integration for University Market (Your Exact Setup)

**Project:** university-market (Next.js with `src/app/` folder structure)  
**Your Styling:** Styled Components (keeping your existing beautiful UI)  
**Auth:** Google Sign-In + Email/Password + Campus Selection  
**State Management:** React Query + Context API  

---

## 📋 Quick Overview

Your current structure:
```
university-market/src/app/
├── login/page.js (✅ Have it)
├── signup/page.js (✅ Have it)
├── page.js (✅ Have it)
└── layout.js (✅ Need to update)
```

What we'll add:
```
university-market/
├── src/
│   ├── app/
│   │   ├── (protected)/
│   │   │   ├── dashboard/page.js (NEW)
│   │   │   └── layout.js (NEW)
│   │   ├── login/page.js (UPDATE: Add auth)
│   │   ├── signup/page.js (UPDATE: Add auth)
│   │   └── layout.js (UPDATE: Add providers)
│   ├── context/AuthContext.jsx (NEW)
│   ├── hooks/ (NEW)
│   ├── services/ (NEW)
│   └── lib/ (NEW)
└── .env.local (UPDATE)
```

---

## 1. Install Dependencies

```bash
npm install axios react-query js-cookie

# Verify installation
npm list axios react-query js-cookie
```

---

## 2. Create Core Files (In Order)

### 2.1 Create `src/lib/react-query.js`

```javascript
import { QueryClient } from 'react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
```

### 2.2 Create `src/lib/cookies.js`

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

### 2.3 Create `src/lib/errors.js`

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

### 2.4 Create `src/services/api.js`

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

### 2.5 Create `src/services/auth.js`

```javascript
import api from './api';

export const verifyGoogleToken = (idToken) =>
  api.post('/auth/google-verify', { idToken });

export const completeGoogleSignup = (tempToken, campusId) =>
  api.post('/auth/google-complete', { tempToken, campusId });

export const signupWithEmail = (fullName, email, password, campus) =>
  api.post('/auth/signup', {
    fullName,
    email,
    password,
    passwordConfirm: password,
    campus,
  });

export const loginWithEmail = (email, password) =>
  api.post('/auth/login', { email, password });

export const getCurrentUser = () =>
  api.get('/auth/me');

export const logout = () =>
  api.post('/auth/logout');

export const verifyEmail = (token) =>
  api.post('/auth/verify-email', { token });

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (token, password) =>
  api.patch('/auth/reset-password', {
    token,
    password,
    passwordConfirm: password,
  });
```

### 2.6 Create `src/services/campus.js`

```javascript
import api from './api';

export const getCampuses = () =>
  api.get('/campuses');

export const getCampusById = (id) =>
  api.get(`/campuses/${id}`);
```

### 2.7 Create `src/context/AuthContext.jsx`

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
    verifyGoogle: googleVerifyMutation.mutateAsync,
    completeGoogleSignup: completeGoogleMutation.mutateAsync,
    signup: signupMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isVerifyingGoogle: googleVerifyMutation.isLoading,
    isCompletingSignup: completeGoogleMutation.isLoading,
    isSigningUp: signupMutation.isLoading,
    isLoggingIn: loginMutation.isLoading,
    isLoggingOut: logoutMutation.isLoading,
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

### 2.8 Create `src/hooks/useAuth.js`

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

### 2.9 Create `src/hooks/useProtectedRoute.js`

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

### 2.10 Create `src/hooks/useQueries.js`

```javascript
import { useQuery } from 'react-query';
import * as campusService from '@/services/campus';

export const useCampuses = () =>
  useQuery(['campuses'], () =>
    campusService.getCampuses().then((res) => res.data.data || [])
  );

export const useCampus = (campusId) =>
  useQuery(
    ['campus', campusId],
    () => campusService.getCampusById(campusId).then((res) => res.data.data),
    { enabled: !!campusId }
  );
```

### 2.11 Create `src/components/Providers.jsx`

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

## 3. Update Existing Files

### 3.1 Update `src/app/layout.js`

Replace with:

```javascript
'use client';

import { AuthProvider } from '@/context/AuthContext';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata = {
  title: 'University Market',
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

### 3.2 Update `src/app/login/page.js`

```javascript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  PageWrapper,
  Container,
  Header,
  BackButton,
  LogoSection,
  CarIcon,
  Title,
  LoginForm,
  InputGroup,
  InputIcon,
  Input,
  TogglePassword,
  Options,
  RememberMe,
  Checkmark,
  SignInButton,
  ForgotPassword,
  Divider,
  SocialLogin,
  SocialBtn,
  SignupLink,
  ErrorMessage,
} from './styles';
import { FaArrowLeft, FaCarSide, FaEnvelope, FaLock, FaEyeSlash } from 'react-icons/fa';

const LoginPage = () => {
  const router = useRouter();
  const { login, isLoggingIn, verifyGoogle, isVerifyingGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const googleButtonRef = useRef(null);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!showForm && googleButtonRef.current && window.google) {
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
        console.error('Google initialization failed:', err);
      }
    }
  }, [showForm]);

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

  const handleSubmit = async (e) => {
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

  if (showForm) {
    return (
      <PageWrapper>
        <Container>
          <Header>
            <BackButton onClick={() => setShowForm(false)}>
              <FaArrowLeft />
            </BackButton>
          </Header>

          <LogoSection>
            <CarIcon>
              <FaCarSide />
            </CarIcon>
            <Title>Sign in</Title>
          </LogoSection>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <LoginForm onSubmit={handleSubmit}>
            <InputGroup>
              <InputIcon>
                <FaEnvelope />
              </InputIcon>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoggingIn}
              />
            </InputGroup>

            <InputGroup>
              <InputIcon>
                <FaLock />
              </InputIcon>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
              />
              <TogglePassword onClick={() => setShowPassword(!showPassword)}>
                <FaEyeSlash />
              </TogglePassword>
            </InputGroup>

            <SignInButton type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Signing in...' : 'Sign in'}
            </SignInButton>
          </LoginForm>

          <ForgotPassword href="/forgot-password">Forgot the password?</ForgotPassword>

          <SignupLink>
            Don&apos;t have an account? <a href="/signup">Sign up</a>
          </SignupLink>
        </Container>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <Container>
        <Header>
          <BackButton onClick={() => router.back()}>
            <FaArrowLeft />
          </BackButton>
        </Header>

        <LogoSection>
          <CarIcon>
            <FaCarSide />
          </CarIcon>
          <Title>Login to Your Account</Title>
        </LogoSection>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Divider>
          <span>Sign in with</span>
        </Divider>

        <SocialLogin>
          <div ref={googleButtonRef} style={{ width: '100%' }} />
        </SocialLogin>

        <Divider>
          <span>or continue with</span>
        </Divider>

        <SignInButton onClick={() => setShowForm(true)} disabled={isVerifyingGoogle}>
          {isVerifyingGoogle ? 'Processing...' : 'Sign in with password'}
        </SignInButton>

        <SignupLink>
          Don&apos;t have an account? <a href="/signup">Sign up</a>
        </SignupLink>
      </Container>
    </PageWrapper>
  );
};

export default LoginPage;
```

### 3.3 Update `src/app/signup/page.js`

```javascript
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCampuses } from '@/hooks/useQueries';
import {
  PageWrapper,
  Container,
  HeaderNav,
  LogoArea,
  Title,
  Form,
  FormGroup,
  Input,
  Select,
  Options,
  CheckboxContainer,
  Checkmark,
  Button,
  Divider,
  SocialButtons,
  SocialBtn,
  FooterLink,
  ErrorMessage,
} from './styles';
import {
  FaUser,
  FaEnvelope,
  FaBuilding,
  FaLock,
  FaEyeSlash,
  FaArrowLeft,
  FaFacebook,
  FaGoogle,
  FaApple,
} from 'react-icons/fa';

const Signup = () => {
  const router = useRouter();
  const { signup, isSigningUp, verifyGoogle, isVerifyingGoogle, completeGoogleSignup, isCompletingSignup, useCampuses } = useAuth();
  const { data: campuses } = useCampuses();

  const [step, setStep] = useState('method');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    campusId: '',
    password: '',
    confirmPassword: '',
    remember: false,
  });
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleData, setGoogleData] = useState(null);
  const googleButtonRef = useRef(null);

  // Initialize Google Sign-Up
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
        console.error('Google initialization failed:', err);
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
        router.push('/dashboard');
      } else if (result.data.data?.tempToken) {
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName || !formData.email || !formData.password || !formData.campusId) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await signup({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        campus: formData.campusId,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign-up failed');
    }
  };

  const handleGoogleCampusSelect = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.campusId) {
      setError('Please select a campus');
      return;
    }

    try {
      await completeGoogleSignup({
        tempToken: googleData.tempToken,
        campusId: formData.campusId,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign-up failed');
    }
  };

  // STEP 1: Choose signup method
  if (step === 'method') {
    return (
      <PageWrapper>
        <Container>
          <HeaderNav onClick={() => router.back()}>
            <FaArrowLeft />
          </HeaderNav>

          <LogoArea>
            <FaBuilding size={80} />
          </LogoArea>

          <Title>Create Account</Title>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Divider>
            <span>Sign up with</span>
          </Divider>

          <SocialButtons>
            <div ref={googleButtonRef} style={{ width: '100%' }} />
          </SocialButtons>

          <Divider>
            <span>or continue with</span>
          </Divider>

          <Button onClick={() => setStep('email')} type="button">
            Sign up with Email
          </Button>

          <FooterLink>
            Already have an account? <a href="/login">Sign in</a>
          </FooterLink>
        </Container>
      </PageWrapper>
    );
  }

  // STEP 2: Email signup form
  if (step === 'email') {
    return (
      <PageWrapper>
        <Container>
          <HeaderNav onClick={() => { setStep('method'); setError(null); }}>
            <FaArrowLeft />
          </HeaderNav>

          <LogoArea>
            <FaBuilding size={80} />
          </LogoArea>

          <Title>Create Your Account</Title>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Form onSubmit={handleEmailSignup}>
            <FormGroup>
              <FaUser className="icon-left" />
              <Input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSigningUp}
              />
            </FormGroup>

            <FormGroup>
              <FaEnvelope className="icon-left" />
              <Input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSigningUp}
              />
            </FormGroup>

            <FormGroup>
              <FaBuilding className="icon-left" />
              <Select
                name="campusId"
                value={formData.campusId}
                onChange={handleChange}
                disabled={isSigningUp}
              >
                <option value="">Select Campus</option>
                {campuses?.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <FaLock className="icon-left" />
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSigningUp}
              />
              <FaEyeSlash className="icon-right" onClick={() => setShowPassword(!showPassword)} />
            </FormGroup>

            <FormGroup>
              <FaLock className="icon-left" />
              <Input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSigningUp}
              />
              <FaEyeSlash className="icon-right" onClick={() => setShowPassword(!showPassword)} />
            </FormGroup>

            <Options>
              <CheckboxContainer>
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                />
                <Checkmark />
                Remember me
              </CheckboxContainer>
            </Options>

            <Button type="submit" disabled={isSigningUp}>
              {isSigningUp ? 'Creating account...' : 'Sign up'}
            </Button>
          </Form>

          <FooterLink>
            Already have an account? <a href="/login">Sign in</a>
          </FooterLink>
        </Container>
      </PageWrapper>
    );
  }

  // STEP 3: Google signup - Campus selection
  if (step === 'google-campus' && googleData) {
    return (
      <PageWrapper>
        <Container>
          <HeaderNav onClick={() => { setStep('method'); setError(null); setGoogleData(null); }}>
            <FaArrowLeft />
          </HeaderNav>

          <LogoArea>
            <FaBuilding size={80} />
          </LogoArea>

          <Title>Welcome, {googleData.fullName}!</Title>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            {googleData.email}
          </p>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Form onSubmit={handleGoogleCampusSelect}>
            <FormGroup>
              <FaBuilding className="icon-left" />
              <Select
                name="campusId"
                value={formData.campusId}
                onChange={handleChange}
                disabled={isCompletingSignup}
              >
                <option value="">Select Your Campus</option>
                {campuses?.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <Button type="submit" disabled={isCompletingSignup}>
              {isCompletingSignup ? 'Completing signup...' : 'Complete Signup'}
            </Button>
          </Form>

          <FooterLink>
            Already have an account? <a href="/login">Sign in</a>
          </FooterLink>
        </Container>
      </PageWrapper>
    );
  }

  return null;
};

export default Signup;
```

### 3.4 Update `.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_API_TIMEOUT=10000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=748421078644-8ai5lvp22d2fcuguh40h6jtddr709ecl.apps.googleusercontent.com
NEXT_PUBLIC_APP_NAME=University Market
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 4. Create Protected Routes

### 4.1 Create `src/app/(protected)/layout.js`

```javascript
'use client';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function ProtectedLayout({ children }) {
  const { isProtected } = useProtectedRoute();

  if (!isProtected) {
    return null;
  }

  return <>{children}</>;
}
```

### 4.2 Create `src/app/(protected)/dashboard/page.js`

```javascript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import Image from 'next/image';

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
`;

const UserHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
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
  margin-top: 30px;
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
          <Title>University Market</Title>
          <LogoutButton onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </LogoutButton>
        </NavContainer>
      </NavBar>

      <MainContent>
        <Card>
          <UserHeader>
            {user?.avatar?.url && (
              <Image
                src={user.avatar.url}
                alt={user.fullName}
                width={80}
                height={80}
                style={{ borderRadius: '50%' }}
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

## 5. Add Styled Components to Your Files

Add these to your existing `src/app/login/styles.js`:

```javascript
// Add to your existing styled components

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

export const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
`;
```

Add these to your existing `src/app/signup/styles.js`:

```javascript
// Add to your existing styled components

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
```

---

## 6. Testing Checklist

### Backend Check
```bash
# Verify backend is running
curl http://localhost:5000/api/v1/campuses

# Expected: { "status": "success", "data": [...] }
```

### Frontend Testing Steps

1. **Test Email Login**
   - Go to `/login` → "Sign in with password"
   - Enter test credentials
   - Should redirect to `/dashboard`

2. **Test Email Signup**
   - Go to `/signup` → "Sign up with Email"
   - Fill all fields
   - Should redirect to `/dashboard`

3. **Test Google Sign-In**
   - Go to `/login`
   - Click Google button
   - Authenticate with Google
   - Should redirect to `/dashboard`

4. **Test Google Sign-Up (New User)**
   - Go to `/signup`
   - Click Google button
   - Authenticate with new account
   - Select campus
   - Should redirect to `/dashboard`

5. **Test Protected Route**
   - Logout from `/dashboard`
   - Try to access `/dashboard` directly
   - Should redirect to `/login`

---

## 7. Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Google script not loaded" | Check `<script src="https://accounts.google.com/gsi/client" />` in layout.js |
| "Can't reach backend" | Verify `NEXT_PUBLIC_API_URL` in `.env.local` |
| "Campus dropdown empty" | Check `/campuses` endpoint returns data |
| "Token not saving" | Check localStorage enabled, verify cookies in DevTools |
| "CORS error" | Ensure backend allows `http://localhost:3000` |

---

## 8. File Creation Checklist

✅ `src/lib/react-query.js`  
✅ `src/lib/cookies.js`  
✅ `src/lib/errors.js`  
✅ `src/services/api.js`  
✅ `src/services/auth.js`  
✅ `src/services/campus.js`  
✅ `src/context/AuthContext.jsx`  
✅ `src/hooks/useAuth.js`  
✅ `src/hooks/useProtectedRoute.js`  
✅ `src/hooks/useQueries.js`  
✅ `src/components/Providers.jsx`  
✅ `src/app/(protected)/layout.js`  
✅ `src/app/(protected)/dashboard/page.js`  
✅ UPDATE `src/app/layout.js`  
✅ UPDATE `src/app/login/page.js`  
✅ UPDATE `src/app/signup/page.js`  
✅ UPDATE `.env.local`  

---

**You're all set! Your frontend is now fully integrated with backend authentication! 🚀**
