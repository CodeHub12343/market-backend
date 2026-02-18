# Migration Guide: TailwindCSS to Styled-Components

## Overview

This guide shows how to migrate your Next.js application from TailwindCSS to Styled-Components.

---

## Installation & Setup

### Step 1: Install Styled-Components

```bash
npm install styled-components
npm install -D babel-plugin-styled-components

# Or with yarn
yarn add styled-components
yarn add -D babel-plugin-styled-components
```

### Step 2: Create/Update `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
};

export default nextConfig;
```

### Step 3: Setup Registry (if not exists)

Create `src/lib/registry.jsx`:

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

### Step 4: Update Root Layout

```javascript
import { StyledComponentsRegistry } from '@/lib/registry';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
```

---

## Common Tailwind to Styled-Components Conversions

### 1. Basic Styling

#### TailwindCSS
```javascript
<div className="bg-white rounded-lg shadow p-6">
  <h1 className="text-3xl font-bold text-gray-800">Title</h1>
  <p className="text-gray-600 mt-2">Description</p>
</div>
```

#### Styled-Components
```javascript
import styled from 'styled-components';

const Container = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
`;

const Title = styled.h1`
  font-size: 30px;
  font-weight: bold;
  color: #1f2937;
`;

const Description = styled.p`
  color: #4b5563;
  margin-top: 8px;
`;

export default function Component() {
  return (
    <Container>
      <Title>Title</Title>
      <Description>Description</Description>
    </Container>
  );
}
```

### 2. Hover States

#### TailwindCSS
```javascript
<button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
  Click me
</button>
```

#### Styled-Components
```javascript
const Button = styled.button`
  background-color: #3b82f6;
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #2563eb;
  }
`;

<Button>Click me</Button>
```

### 3. Responsive Design

#### TailwindCSS
```javascript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

#### Styled-Components
```javascript
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

<Grid>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Grid>
```

### 4. Conditional Styling

#### TailwindCSS
```javascript
<button className={`px-4 py-2 rounded ${error ? 'bg-red-500' : 'bg-blue-500'} text-white`}>
  Submit
</button>
```

#### Styled-Components
```javascript
const Button = styled.button`
  padding: 10px 16px;
  border-radius: 4px;
  color: white;
  background-color: ${(props) => props.error ? '#ef4444' : '#3b82f6'};
`;

<Button error={hasError}>Submit</Button>
```

### 5. Flexbox Layout

#### TailwindCSS
```javascript
<div className="flex justify-between items-center gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```

#### Styled-Components
```javascript
const FlexContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
`;

<FlexContainer>
  <div>Left</div>
  <div>Right</div>
</FlexContainer>
```

---

## Tailwind Utilities Mapping

| Tailwind | Styled-Components |
|----------|-------------------|
| `p-4` | `padding: 16px;` |
| `px-4 py-2` | `padding: 10px 16px;` |
| `m-4` | `margin: 16px;` |
| `mt-2` | `margin-top: 8px;` |
| `rounded` | `border-radius: 4px;` |
| `rounded-lg` | `border-radius: 8px;` |
| `shadow` | `box-shadow: 0 1px 2px rgba(0,0,0,0.05);` |
| `shadow-md` | `box-shadow: 0 4px 6px rgba(0,0,0,0.1);` |
| `text-center` | `text-align: center;` |
| `text-sm` | `font-size: 14px;` |
| `text-lg` | `font-size: 18px;` |
| `text-xl` | `font-size: 20px;` |
| `font-bold` | `font-weight: bold;` |
| `font-semibold` | `font-weight: 600;` |
| `text-gray-600` | `color: #4b5563;` |
| `bg-blue-500` | `background-color: #3b82f6;` |
| `border` | `border: 1px solid;` |
| `border-gray-300` | `border: 1px solid #d1d5db;` |
| `flex` | `display: flex;` |
| `grid` | `display: grid;` |
| `justify-center` | `justify-content: center;` |
| `items-center` | `align-items: center;` |
| `gap-4` | `gap: 16px;` |

---

## Color Palette Conversion

### Common Tailwind Colors to HEX

```javascript
const colors = {
  // Gray
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',

  // Blue
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',

  // Red
  'red-500': '#ef4444',
  'red-600': '#dc2626',

  // Green
  'green-500': '#10b981',
  'green-600': '#059669',

  // Yellow
  'yellow-500': '#eab308',
  'yellow-600': '#ca8a04',

  // Orange
  'orange-500': '#f97316',
  'orange-600': '#ea580c',
};
```

---

## Migration Checklist

- [ ] Install styled-components dependencies
- [ ] Update `next.config.mjs`
- [ ] Create/update `src/lib/registry.jsx`
- [ ] Update `src/app/layout.js`
- [ ] Create styled component files for each component
- [ ] Move CSS classes to styled-components
- [ ] Update responsive breakpoints
- [ ] Test hover and focus states
- [ ] Remove TailwindCSS from `package.json` (if no longer needed)
- [ ] Test on mobile and desktop
- [ ] Verify animations work correctly

---

## Performance Considerations

### 1. Code Splitting

```javascript
// ✅ GOOD - Styled components are bundled with components
const Button = styled.button`...`;

export default function MyComponent() {
  return <Button>Click</Button>;
}
```

### 2. Avoiding Recreating Components

```javascript
// ❌ BAD - Creates new styled component every render
function MyComponent() {
  const Button = styled.button`...`;
  return <Button />;
}

// ✅ GOOD - Define outside render
const Button = styled.button`...`;

function MyComponent() {
  return <Button />;
}
```

### 3. Memoization for Complex Styles

```javascript
import { memo } from 'react';

const ComplexComponent = memo(function ComplexComponent({ items }) {
  const ItemList = styled.ul`
    list-style: none;
    padding: 0;
  `;

  return (
    <ItemList>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ItemList>
  );
});
```

---

## Troubleshooting

### Issue: Styles not applying

**Solution:** Ensure the component is properly imported and the styled component is used as JSX element:

```javascript
import styled from 'styled-components';

const Container = styled.div`
  color: blue;
`;

// ✅ Correct
export default function App() {
  return <Container>Hello</Container>;
}

// ❌ Wrong
export default function App() {
  return <div className={Container}>Hello</div>; // Don't use as class
}
```

### Issue: Props are being passed to DOM

**Solution:** Use transient props (starting with `$`):

```javascript
const Button = styled.button`
  color: ${(props) => props.color};
`;

// Will pass 'color' to button element (warning)
<Button color="red" />

// Use transient prop instead
const Button = styled.button`
  color: ${(props) => props.$color};
`;

<Button $color="red" /> // Won't pass to DOM
```

### Issue: Global styles not working

**Solution:** Use `createGlobalStyle`:

```javascript
import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, sans-serif;
  }
`;

export default GlobalStyle;
```

---

## File Structure After Migration

```
src/
├── app/
│   ├── layout.js
│   └── page.js
├── components/
│   ├── products/
│   │   ├── ProductCard.jsx
│   │   └── ProductCard.styles.js (optional - separate styles)
│   ├── common/
│   │   └── Button.jsx
│   └── Header.jsx
├── styles/
│   ├── GlobalStyles.js
│   └── theme.js
└── lib/
    ├── registry.jsx
    └── theme.js
```

---

## Optional: Organizing Styles

### Option 1: Styles in Same File

```javascript
// ProductCard.jsx
import styled from 'styled-components';

const Card = styled.div`...`;
const Title = styled.h3`...`;

export default function ProductCard() {
  return (
    <Card>
      <Title>Product</Title>
    </Card>
  );
}
```

### Option 2: Styles in Separate File

```javascript
// ProductCard.styles.js
import styled from 'styled-components';

export const Card = styled.div`...`;
export const Title = styled.h3`...`;

// ProductCard.jsx
import { Card, Title } from './ProductCard.styles';

export default function ProductCard() {
  return (
    <Card>
      <Title>Product</Title>
    </Card>
  );
}
```

---

## Next Steps

1. ✅ Complete the setup steps above
2. 🎨 Start converting components one by one
3. 🧪 Test each component thoroughly
4. 📱 Verify responsive design
5. 🚀 Deploy to production

Happy migrating! 🎉
