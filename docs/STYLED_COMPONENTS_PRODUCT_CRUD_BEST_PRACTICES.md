# Styled-Components Best Practices for Product CRUD

## Overview

This guide covers best practices for implementing styled-components in a product CRUD application.

---

## 1. Component Organization

### Recommended Structure

```
src/
├── components/
│   └── products/
│       ├── ProductCard/
│       │   ├── ProductCard.jsx
│       │   └── ProductCard.styles.js
│       ├── ProductForm/
│       │   ├── ProductForm.jsx
│       │   └── ProductForm.styles.js
│       ├── ProductGrid/
│       │   ├── ProductGrid.jsx
│       │   └── ProductGrid.styles.js
│       └── index.js
├── styles/
│   ├── GlobalStyles.js
│   ├── theme.js
│   └── mixins.js
└── pages/
    └── products/
        └── page.js
```

### Benefits

- ✅ Clean separation of concerns
- ✅ Easy to reuse styles across components
- ✅ Easier to test and maintain
- ✅ Better code organization

---

## 2. Theme Management

### Create `src/styles/theme.js`

```javascript
export const theme = {
  // Colors
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

  // Spacing scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },

  // Border radius
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    normal: '300ms ease',
    slow: '500ms ease',
  },

  // Breakpoints
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },

  // Font sizes
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },

  // Font weights
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Z-index scale
  zIndex: {
    hide: -1,
    base: 0,
    dropdown: 100,
    sticky: 200,
    fixed: 300,
    modal: 400,
    popover: 500,
    tooltip: 600,
  },
};

// Media query helpers
export const media = {
  mobile: (styles) => `
    @media (max-width: ${theme.breakpoints.mobile}) {
      ${styles}
    }
  `,
  tablet: (styles) => `
    @media (min-width: ${theme.breakpoints.mobile}) and (max-width: ${theme.breakpoints.tablet}) {
      ${styles}
    }
  `,
  desktop: (styles) => `
    @media (min-width: ${theme.breakpoints.desktop}) {
      ${styles}
    }
  `,
};

export default theme;
```

### Create `src/styles/GlobalStyles.js`

```javascript
import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${(props) => props.theme.colors.background};
    color: ${(props) => props.theme.colors.text.primary};
    line-height: 1.5;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: ${(props) => props.theme.fontWeights.semibold};
    line-height: 1.2;
  }

  h1 {
    font-size: ${(props) => props.theme.fontSizes['3xl']};
  }

  h2 {
    font-size: ${(props) => props.theme.fontSizes['2xl']};
  }

  h3 {
    font-size: ${(props) => props.theme.fontSizes.xl};
  }

  button {
    font-family: inherit;
    font-size: inherit;
  }

  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  ul, ol {
    list-style: none;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${(props) => props.theme.colors.background};
  }

  ::-webkit-scrollbar-thumb {
    background: ${(props) => props.theme.colors.border};
    border-radius: ${(props) => props.theme.radius.sm};

    &:hover {
      background: ${(props) => props.theme.colors.secondary};
    }
  }
`;

export default GlobalStyles;
```

### Update `src/app/layout.js`

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

## 3. Reusable Style Utilities

### Create `src/styles/mixins.js`

```javascript
import { css } from 'styled-components';

// Flexbox utilities
export const flexCenter = css`
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const flexBetween = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const flexColumn = css`
  display: flex;
  flex-direction: column;
`;

// Text utilities
export const truncate = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const lineClamp = (lines = 2) => css`
  display: -webkit-box;
  -webkit-line-clamp: ${lines};
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

// Focus states
export const focusRing = (color = '#3b82f6') => css`
  outline: none;
  border-color: ${color};
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
`;

// Responsive utilities
export const responsive = {
  mobile: (styles) => css`
    @media (max-width: 480px) {
      ${styles}
    }
  `,
  tablet: (styles) => css`
    @media (max-width: 768px) {
      ${styles}
    }
  `,
  desktop: (styles) => css`
    @media (min-width: 1024px) {
      ${styles}
    }
  `,
};

// Button utilities
export const buttonBase = css`
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 150ms ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Input utilities
export const inputBase = css`
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

// Card utilities
export const cardBase = css`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;
```

### Using Mixins in Components

```javascript
import styled from 'styled-components';
import { buttonBase, focusRing, responsive } from '@/styles/mixins';

const Button = styled.button`
  ${buttonBase}
  background-color: #3b82f6;
  color: white;

  &:hover:not(:disabled) {
    background-color: #2563eb;
  }

  &:focus {
    ${focusRing('#3b82f6')}
  }

  ${responsive.mobile(css`
    padding: 8px 12px;
    font-size: 12px;
  `)}
`;
```

---

## 4. Product Card Component Example

### `src/components/products/ProductCard/ProductCard.styles.js`

```javascript
import styled from 'styled-components';
import { truncate, lineClamp } from '@/styles/mixins';

export const Card = styled.div`
  background-color: ${(props) => props.theme.colors.surface};
  border-radius: ${(props) => props.theme.radius.md};
  box-shadow: ${(props) => props.theme.shadows.md};
  overflow: hidden;
  transition: box-shadow ${(props) => props.theme.transitions.normal};

  &:hover {
    box-shadow: ${(props) => props.theme.shadows.lg};
  }

  @media (max-width: ${(props) => props.theme.breakpoints.tablet}) {
    border-radius: ${(props) => props.theme.radius.sm};
  }
`;

export const ImageWrapper = styled.div`
  position: relative;
  height: 200px;
  background-color: ${(props) => props.theme.colors.background};
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const ConditionBadge = styled.span`
  position: absolute;
  top: ${(props) => props.theme.spacing.md};
  right: ${(props) => props.theme.spacing.md};
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  padding: ${(props) => `${props.theme.spacing.sm} ${props.theme.spacing.md}`};
  border-radius: ${(props) => props.theme.radius.sm};
  font-size: ${(props) => props.theme.fontSizes.xs};
  font-weight: ${(props) => props.theme.fontWeights.medium};
`;

export const ContentSection = styled.div`
  padding: ${(props) => props.theme.spacing.md};
`;

export const ProductTitle = styled.h3`
  font-size: ${(props) => props.theme.fontSizes.lg};
  font-weight: ${(props) => props.theme.fontWeights.semibold};
  margin-bottom: ${(props) => props.theme.spacing.sm};
  ${truncate}
`;

export const CategoryText = styled.p`
  font-size: ${(props) => props.theme.fontSizes.sm};
  color: ${(props) => props.theme.colors.text.secondary};
  margin-bottom: ${(props) => props.theme.spacing.sm};
  margin: 0;
`;

export const DescriptionText = styled.p`
  color: ${(props) => props.theme.colors.text.secondary};
  font-size: ${(props) => props.theme.fontSizes.sm};
  ${lineClamp(2)}
  margin-bottom: ${(props) => props.theme.spacing.md};
  margin: 0;
`;

export const PriceLocationWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.md};
`;

export const Price = styled.span`
  font-size: ${(props) => props.theme.fontSizes.xl};
  font-weight: ${(props) => props.theme.fontWeights.bold};
  color: ${(props) => props.theme.colors.success};
`;

export const Location = styled.span`
  font-size: ${(props) => props.theme.fontSizes.xs};
  color: ${(props) => props.theme.colors.text.muted};
`;

export const RatingWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${(props) => props.theme.spacing.md};

  span {
    color: #fbbf24;
    margin-right: ${(props) => props.theme.spacing.xs};
  }

  p {
    font-size: ${(props) => props.theme.fontSizes.sm};
    color: ${(props) => props.theme.colors.text.secondary};
    margin: 0;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: ${(props) => props.theme.spacing.sm};
`;

export const ViewButton = styled.a`
  flex: 1;
  background-color: ${(props) => props.theme.colors.primary};
  color: white;
  padding: ${(props) => props.theme.spacing.md};
  border-radius: ${(props) => props.theme.radius.sm};
  text-align: center;
  text-decoration: none;
  transition: background-color ${(props) => props.theme.transitions.fast};
  font-weight: ${(props) => props.theme.fontWeights.medium};

  &:hover {
    background-color: ${(props) => props.theme.colors.secondary};
  }
`;

export const ActionButton = styled.button`
  flex: 1;
  padding: ${(props) => props.theme.spacing.md};
  border: none;
  border-radius: ${(props) => props.theme.radius.sm};
  font-weight: ${(props) => props.theme.fontWeights.medium};
  cursor: pointer;
  transition: background-color ${(props) => props.theme.transitions.fast};
  color: white;

  background-color: ${(props) => {
    if (props.variant === 'edit') return props.theme.colors.warning;
    if (props.variant === 'delete') return props.theme.colors.danger;
    return props.theme.colors.primary;
  }};

  &:hover {
    background-color: ${(props) => {
      if (props.variant === 'edit') return '#ca8a04';
      if (props.variant === 'delete') return '#dc2626';
      return '#2563eb';
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

### `src/components/products/ProductCard/ProductCard.jsx`

```javascript
'use client';

import { useState } from 'react';
import Image from 'next/image';
import * as S from './ProductCard.styles';

export default function ProductCard({ product, onDelete, onEdit }) {
  const [showActions, setShowActions] = useState(false);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this product?')) {
      onDelete(product._id);
    }
  };

  const defaultImage = product?.images?.[0]?.url || '/images/placeholder.png';

  return (
    <S.Card>
      <S.ImageWrapper>
        <Image
          src={defaultImage}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.condition && (
          <S.ConditionBadge>{product.condition}</S.ConditionBadge>
        )}
      </S.ImageWrapper>

      <S.ContentSection>
        <S.ProductTitle>{product.name}</S.ProductTitle>

        {product.category && (
          <S.CategoryText>{product.category.name}</S.CategoryText>
        )}

        <S.DescriptionText>{product.description}</S.DescriptionText>

        <S.PriceLocationWrapper>
          <S.Price>₦{product.price?.toLocaleString()}</S.Price>
          {product.location && (
            <S.Location>📍 {product.location}</S.Location>
          )}
        </S.PriceLocationWrapper>

        {product.ratingsAverage && (
          <S.RatingWrapper>
            <span>★</span>
            <p>
              {product.ratingsAverage} ({product.ratingsQuantity} reviews)
            </p>
          </S.RatingWrapper>
        )}

        <S.ButtonGroup>
          <S.ViewButton href={`/products/${product._id}`}>
            View
          </S.ViewButton>

          {(onEdit || onDelete) && (
            <>
              {onEdit && (
                <S.ActionButton
                  variant="edit"
                  onClick={() => onEdit(product._id)}
                >
                  Edit
                </S.ActionButton>
              )}
              {onDelete && (
                <S.ActionButton
                  variant="delete"
                  onClick={handleDelete}
                >
                  Delete
                </S.ActionButton>
              )}
            </>
          )}
        </S.ButtonGroup>
      </S.ContentSection>
    </S.Card>
  );
}
```

---

## 5. Performance Optimization

### Memoization

```javascript
import { memo } from 'react';
import ProductCard from './ProductCard';

const MemoizedProductCard = memo(ProductCard);

export default function ProductGrid({ products }) {
  return (
    <GridContainer>
      {products.map((product) => (
        <MemoizedProductCard key={product._id} product={product} />
      ))}
    </GridContainer>
  );
}
```

### CSS Variables for Dynamic Theming

```javascript
import styled from 'styled-components';

const Button = styled.button`
  background-color: var(--primary-color);
  color: var(--text-color);
  padding: var(--spacing-md);
`;

// In layout or app level
const ThemeProvider = ({ children, theme }) => {
  return (
    <div
      style={{
        '--primary-color': theme.colors.primary,
        '--text-color': theme.colors.text.primary,
        '--spacing-md': theme.spacing.md,
      }}
    >
      {children}
    </div>
  );
};
```

---

## 6. Testing Styled Components

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
```

### Test Example

```javascript
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import ProductCard from './ProductCard';
import theme from '@/styles/theme';

describe('ProductCard', () => {
  const mockProduct = {
    _id: '1',
    name: 'Test Product',
    price: 100,
    images: [{ url: '/test.jpg' }],
  };

  it('renders product card', () => {
    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <ProductCard product={mockProduct} />
      </ThemeProvider>
    );

    expect(getByText('Test Product')).toBeInTheDocument();
  });

  it('displays price correctly', () => {
    const { getByText } = render(
      <ThemeProvider theme={theme}>
        <ProductCard product={mockProduct} />
      </ThemeProvider>
    );

    expect(getByText('₦100')).toBeInTheDocument();
  });
});
```

---

## 7. Troubleshooting

### Issue: Theme not accessible in styled components

```javascript
// ❌ WRONG
const Button = styled.button`
  color: ${theme.colors.primary}; // undefined
`;

// ✅ CORRECT
const Button = styled.button`
  color: ${(props) => props.theme.colors.primary};
`;
```

### Issue: Styles not scoped to component

```javascript
// ❌ WRONG
const globalStyle = css`
  button {
    color: blue;
  }
`;

// ✅ CORRECT
const Button = styled.button`
  color: blue;
`;
```

---

## Summary

- ✅ Use theme provider for consistent styling
- ✅ Create reusable mixins for common patterns
- ✅ Organize styles by component
- ✅ Use props for dynamic styling
- ✅ Test styled components with theme
- ✅ Optimize with memoization
- ✅ Follow naming conventions

Happy styling! 🎨
