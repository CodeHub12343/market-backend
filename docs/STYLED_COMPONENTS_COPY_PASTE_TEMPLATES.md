# Styled-Components Copy-Paste Templates

Quick copy-paste code snippets for common components and patterns.

---

## 1. Basic Setup Files

### `next.config.mjs`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
```

### `src/lib/registry.jsx`
```javascript
'use client';

import React, { useState } from 'react';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import { useServerInsertedHTML } from 'next/navigation';

export function StyledComponentsRegistry({ children }) {
  const [styledComponentsStyleSheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = styledComponentsStyleSheet.getStyleTag();
    styledComponentsStyleSheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') return <>{children}</>;

  return (
    <StyleSheetManager sheet={styledComponentsStyleSheet.instance}>
      {children}
    </StyleSheetManager>
  );
}
```

### `src/app/layout.js`
```javascript
'use client';

import { ThemeProvider } from 'styled-components';
import { StyledComponentsRegistry } from '@/lib/registry';
import GlobalStyles from '@/styles/GlobalStyles';
import theme from '@/styles/theme';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <ThemeProvider theme={theme}>
            <GlobalStyles />
            {children}
          </ThemeProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

---

## 2. Theme Files

### `src/styles/theme.js`
```javascript
export const theme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#16a34a',
    danger: '#ef4444',
    warning: '#eab308',
    background: '#f9fafb',
    surface: '#ffffff',
    border: '#d1d5db',
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      muted: '#9ca3af',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
  },
};

export default theme;
```

### `src/styles/GlobalStyles.js`
```javascript
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: ${(props) => props.theme.colors.background};
    color: ${(props) => props.theme.colors.text.primary};
    line-height: 1.5;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
  }

  button {
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
  }
`;

export default GlobalStyles;
```

---

## 3. Common Components

### Button
```javascript
import styled from 'styled-components';

const Button = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 150ms ease;

  background-color: ${(props) => {
    if (props.variant === 'primary') return props.theme.colors.primary;
    if (props.variant === 'danger') return props.theme.colors.danger;
    if (props.variant === 'success') return props.theme.colors.success;
    return props.theme.colors.secondary;
  }};

  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default Button;
```

### Input
```javascript
import styled from 'styled-components';

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid ${(props) => (props.error ? props.theme.colors.danger : props.theme.colors.border)};
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: ${(props) => props.theme.colors.text.muted};
  }

  ${(props) => props.disabled && `
    background-color: ${props.theme.colors.background};
    cursor: not-allowed;
  `}
`;

export default Input;
```

### Loading Spinner
```javascript
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Spinner = styled.div`
  width: ${(props) => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '48px';
    return '32px';
  }};
  height: ${(props) => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '48px';
    return '32px';
  }};
  border: 4px solid ${(props) => props.theme.colors.border};
  border-top: 4px solid ${(props) => props.theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

function LoadingSpinner({ size = 'md' }) {
  return (
    <SpinnerContainer>
      <Spinner size={size} />
    </SpinnerContainer>
  );
}

export default LoadingSpinner;
```

### Error Alert
```javascript
import { useState } from 'react';
import styled from 'styled-components';

const AlertContainer = styled.div`
  background-color: #fef2f2;
  border: 1px solid ${(props) => props.theme.colors.danger};
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  display: ${(props) => (props.show ? 'flex' : 'none')};
`;

const Icon = styled.span`
  font-size: 20px;
`;

const Content = styled.div`
  flex: 1;

  h3 {
    color: #7f1d1d;
    margin: 0;
  }

  p {
    color: #b91c1c;
    font-size: 14px;
    margin: 4px 0 0 0;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => props.theme.colors.danger};
  cursor: pointer;
  font-weight: bold;
  font-size: 18px;

  &:hover {
    color: #991b1b;
  }
`;

function ErrorAlert({ message, onClose }) {
  const [show, setShow] = useState(true);

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  return (
    <AlertContainer show={show}>
      <Icon>⚠️</Icon>
      <Content>
        <h3>Error</h3>
        <p>{message}</p>
      </Content>
      <CloseButton onClick={handleClose}>✕</CloseButton>
    </AlertContainer>
  );
}

export default ErrorAlert;
```

---

## 4. Page Layout Templates

### Products List Page
```javascript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { useProducts } from '@/hooks/useProducts';
import ProductGrid from '@/components/products/ProductGrid';

const PageContainer = styled.div`
  min-height: 100vh;
  background-color: ${(props) => props.theme.colors.background};
  padding: 24px;
`;

const Container = styled.div`
  max-width: 1280px;
  margin: 0 auto;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: 16px;
  }
`;

const Heading = styled.h1`
  font-size: 30px;
  font-weight: bold;
  margin: 0;
`;

const AddButton = styled(Link)`
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  padding: 10px 24px;
  border-radius: 8px;
  text-decoration: none;

  &:hover {
    background-color: #2563eb;
  }
`;

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useProducts(page, 12);

  return (
    <PageContainer>
      <Container>
        <HeaderContainer>
          <Heading>Products</Heading>
          <AddButton href="/products/new">+ Add Product</AddButton>
        </HeaderContainer>

        <ProductGrid
          products={data?.data || []}
          isLoading={isLoading}
          error={error}
        />
      </Container>
    </PageContainer>
  );
}
```

---

## 5. Form Components

### Product Form Container
```javascript
import styled from 'styled-components';

export const FormContainer = styled.form`
  max-width: 800px;
  margin: 0 auto;
  background-color: ${(props) => props.theme.colors.surface};
  padding: 24px;
  border-radius: 8px;
  box-shadow: ${(props) => props.theme.shadows.md};
`;

export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

export const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${(props) => props.theme.colors.text.primary};
`;

export const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid ${(props) => (props.error ? props.theme.colors.danger : props.theme.colors.border)};
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid ${(props) => (props.error ? props.theme.colors.danger : props.theme.colors.border)};
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid ${(props) => (props.error ? props.theme.colors.danger : props.theme.colors.border)};
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: ${(props) => props.theme.colors.primary};
  }
`;

export const ErrorText = styled.span`
  color: ${(props) => props.theme.colors.danger};
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

export const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 24px;
`;
```

---

## 6. Responsive Grid

```javascript
import styled from 'styled-components';

const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  @media (max-width: ${(props) => props.theme.breakpoints.desktop}) {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${(props) => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

export default ResponsiveGrid;
```

---

## 7. Installation Command

```bash
npm install styled-components && npm install -D babel-plugin-styled-components
```

---

## 🎯 Usage

Copy and paste these templates, then:

1. Update imports to match your file structure
2. Adjust colors/spacing to match your theme
3. Replace placeholder content with your data
4. Test responsive design

Happy coding! 🚀
