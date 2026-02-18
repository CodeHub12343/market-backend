# 🚀 Next.js Auth Implementation - Quick Reference

**Full Guide:** `docs/NEXTJS_AUTH_COMPLETE_GUIDE.md`

---

## 📍 Quick Setup (5 minutes)

### 1. Create Next.js Project
```bash
npx create-next-app@latest frontend --ts --use-npm
cd frontend
npm install axios zustand swr react-hook-form yup @hookform/resolvers
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Set Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=748421078644-8ai5lvp22d2fcuguh40h6jtddr709ecl.apps.googleusercontent.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Copy Core Files
Copy these from the complete guide to your project:
- `services/api.ts` — Axios setup + JWT handling
- `services/auth.ts` — Auth API calls
- `services/campus.ts` — Campus API calls
- `context/AuthContext.tsx` — Auth state
- `hooks/useAuth.ts` — Auth hook
- `types/auth.ts` — TypeScript types
- `lib/cookies.ts` — Cookie utilities
- `app/layout.tsx` — Root layout (with AuthProvider)

### 4. Copy Components
- `components/auth/GoogleSignInButton.tsx`
- `components/auth/CampusPicker.tsx`
- `components/auth/LoginForm.tsx`

### 5. Copy Pages
- `app/(auth)/signup/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/layout.tsx`

### 6. Update Root Layout
Ensure `app/layout.tsx` includes:
```tsx
<head>
  <script src="https://accounts.google.com/gsi/client" async defer />
</head>
<body>
  <AuthProvider>{children}</AuthProvider>
</body>
```

### 7. Start Dev Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🔄 Auth Flow (Visual)

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

## 📁 Essential Files to Create

### 1. `services/api.ts`
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### 2. `services/auth.ts`
```ts
import api from './api';

export const verifyGoogleToken = (idToken: string) =>
  api.post('/auth/google-verify', { idToken });

export const completeGoogleSignup = (tempToken: string, campusId: string) =>
  api.post('/auth/google-complete', { tempToken, campusId });

export const loginWithEmail = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const signupWithEmail = (fullName: string, email: string, password: string, campus: string) =>
  api.post('/auth/signup', { fullName, email, password, passwordConfirm: password, campus });

export const getCurrentUser = () => api.get('/auth/me');

export const logout = () => api.post('/auth/logout');
```

### 3. `context/AuthContext.tsx`
```tsx
'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import * as authService from '@/services/auth';

export const AuthContext = createContext<any>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setToken(token);
      authService.getCurrentUser().then((res) => setUser(res.data.data.user));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (idToken: string) => {
    const res = await authService.verifyGoogleToken(idToken);
    if (res.data.token) {
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      setUser(res.data.data?.user || null);
      return res.data;
    }
    return res.data;
  }, []);

  const completeSignup = useCallback(async (tempToken: string, campusId: string) => {
    const res = await authService.completeGoogleSignup(tempToken, campusId);
    setToken(res.data.token);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.data?.user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, completeSignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 4. `hooks/useAuth.ts`
```ts
'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

### 5. `app/layout.tsx`
```tsx
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'Student Marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 6. `app/(auth)/signup/page.tsx`
```tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { CampusPicker } from '@/components/auth/CampusPicker';

export default function SignupPage() {
  const [step, setStep] = useState<'method' | 'campus'>('method');
  const [tempData, setTempData] = useState(null);

  return (
    <div className="min-h-screen flex items-center justify-center">
      {step === 'method' && (
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <h1 className="text-3xl font-bold mb-4">Sign Up</h1>
          <GoogleSignInButton
            onSuccess={(tempToken, email, fullName) => {
              setTempData({ tempToken, email, fullName });
              setStep('campus');
            }}
          />
        </div>
      )}

      {step === 'campus' && tempData && <CampusPicker {...tempData} />}
    </div>
  );
}
```

### 7. `components/auth/GoogleSignInButton.tsx`
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

declare global {
  interface Window {
    google: any;
  }
}

export const GoogleSignInButton = ({ onSuccess, onError }: any) => {
  const { login } = useAuth();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: async (response: any) => {
        try {
          const result = await login(response.credential);
          if (result.data?.tempToken) {
            onSuccess(result.data.tempToken, result.data.email, result.data.fullName);
          }
        } catch (err) {
          onError?.(err);
        }
      },
    });
    if (ref.current) window.google.accounts.id.renderButton(ref.current, {});
  }, [login, onSuccess, onError]);

  return <div ref={ref} />;
};
```

### 8. `components/auth/CampusPicker.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export const CampusPicker = ({ tempToken, email, fullName }: any) => {
  const router = useRouter();
  const { completeSignup } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/campuses`)
      .then((r) => r.json())
      .then((d) => setCampuses(d.data || []));
  }, []);

  const handle = async () => {
    await completeSignup(tempToken, selected);
    router.push('/dashboard');
  };

  return (
    <div className="max-w-md p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Select Campus</h2>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full border rounded p-2 mb-4"
      >
        <option value="">Choose a campus</option>
        {campuses.map((c: any) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
      <button
        onClick={handle}
        disabled={!selected}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Complete Signup
      </button>
    </div>
  );
};
```

### 9. `app/(protected)/dashboard/page.tsx`
```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return <div>Loading...</div>;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user.fullName}</h1>
      <p className="mb-4">Email: {user.email}</p>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}
```

---

## 🔧 Testing the Flow

### Step 1: Verify Backend Running
```bash
curl http://localhost:5000/api/v1/campuses
# Should return list of campuses
```

### Step 2: Start Next.js Dev
```bash
npm run dev
# Visit http://localhost:3000/signup
```

### Step 3: Click Google Sign-In
- Authenticate with Google
- Select campus
- Redirect to dashboard
- See user info

---

## ✅ Checklist

- [ ] Create Next.js project
- [ ] Install dependencies
- [ ] Set `.env.local` variables
- [ ] Copy all core files
- [ ] Update `app/layout.tsx` with AuthProvider
- [ ] Create signup page
- [ ] Create Google button component
- [ ] Create campus picker component
- [ ] Create dashboard page
- [ ] Test Google Sign-In flow
- [ ] Test logout
- [ ] Add email signup (optional)
- [ ] Deploy to Vercel

---

## 🚀 Next Steps

1. **Implement Email Signup** — Add signup form for non-Google users
2. **Add Password Reset** — Implement forgot password flow
3. **Profile Management** — Allow users to edit profile
4. **Testing** — Add Jest + React Testing Library tests
5. **Monitoring** — Add Sentry for error tracking
6. **Deployment** — Deploy frontend to Vercel, backend to Render/Heroku
7. **Analytics** — Add event tracking (Google Analytics, Mixpanel)

---

## 📚 Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Google Identity Services](https://developers.google.com/identity)
- [Axios Docs](https://axios-http.com/docs)
- [React Hook Form](https://react-hook-form.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**For detailed implementation, see: `docs/NEXTJS_AUTH_COMPLETE_GUIDE.md`**
