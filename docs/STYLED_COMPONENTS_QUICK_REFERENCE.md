# Styled-Components Quick Reference Guide

## Installation

```bash
npm install styled-components
npm install -D babel-plugin-styled-components
```

## Basic Syntax

### Creating Styled Components

```javascript
import styled from 'styled-components';

// Basic styled element
const Button = styled.button`
  padding: 10px 20px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: #2563eb;
  }
`;

// Using in JSX
<Button>Click me</Button>
```

### Extending Styled Components

```javascript
const BaseButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const PrimaryButton = styled(BaseButton)`
  background-color: #3b82f6;
  color: white;

  &:hover {
    background-color: #2563eb;
  }
`;

const DangerButton = styled(BaseButton)`
  background-color: #ef4444;
  color: white;

  &:hover {
    background-color: #dc2626;
  }
`;
```

## Props-Based Styling

### Using Props

```javascript
const Button = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  background-color: ${(props) => {
    if (props.variant === 'primary') return '#3b82f6';
    if (props.variant === 'danger') return '#ef4444';
    return '#9ca3af';
  }};
  
  color: ${(props) => props.textColor || 'white'};
  font-size: ${(props) => props.size === 'large' ? '18px' : '14px'};
`;

// Usage
<Button variant="primary">Primary</Button>
<Button variant="danger" textColor="yellow">Danger</Button>
<Button size="large">Large Button</Button>
```

### Conditional Props

```javascript
const Input = styled.input`
  padding: 10px;
  border: 1px solid ${(props) => (props.error ? '#ef4444' : '#d1d5db')};
  border-radius: 4px;

  ${(props) => props.disabled && `
    background-color: #f3f4f6;
    cursor: not-allowed;
  `}
`;

<Input error={hasError} />
<Input disabled />
```

## Layout Patterns

### Flexbox

```javascript
const FlexContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;
```

### Grid

```javascript
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
```

## Common Patterns

### Form Inputs

```javascript
const Input = styled.input`
  width: 100%;
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

  ${(props) => props.error && `
    border-color: #ef4444;
    
    &:focus {
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
    }
  `}
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;
```

### Cards

```javascript
const Card = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: box-shadow 0.3s ease;

  &:hover {
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
  margin-bottom: 16px;
`;

const CardBody = styled.div`
  margin-bottom: 16px;
`;

const CardFooter = styled.div`
  border-top: 1px solid #e5e7eb;
  padding-top: 16px;
`;
```

### Buttons

```javascript
const Button = styled.button`
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;

  background-color: ${(props) => {
    switch (props.variant) {
      case 'primary':
        return '#3b82f6';
      case 'danger':
        return '#ef4444';
      case 'success':
        return '#16a34a';
      default:
        return '#9ca3af';
    }
  }};

  color: white;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:active {
    transform: translateY(0);
  }
`;

const IconButton = styled(Button)`
  padding: 8px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LinkButton = styled.a`
  color: #3b82f6;
  text-decoration: none;
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;
```

## Animations

### Keyframes

```javascript
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const FadeInContainer = styled.div`
  animation: ${fadeIn} 0.3s ease;
`;
```

## Global Styles

### Creating Global Styles

```javascript
import styled, { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f9fafb;
    color: #1f2937;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
  }

  button {
    font-family: inherit;
  }

  input, textarea, select {
    font-family: inherit;
  }

  a {
    color: inherit;
    text-decoration: inherit;
  }
`;

// Use in your layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GlobalStyle />
        {children}
      </body>
    </html>
  );
}
```

## Responsive Design

### Media Queries

```javascript
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;

  @media (max-width: 1024px) {
    max-width: 960px;
    padding: 16px;
  }

  @media (max-width: 768px) {
    max-width: 100%;
    padding: 12px;
  }

  @media (max-width: 480px) {
    padding: 8px;
  }
`;
```

## Theming

### Theme Provider

```javascript
import styled, { ThemeProvider } from 'styled-components';

const theme = {
  colors: {
    primary: '#3b82f6',
    danger: '#ef4444',
    success: '#16a34a',
    warning: '#f59e0b',
    background: '#f9fafb',
    border: '#d1d5db',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
};

const Button = styled.button`
  background-color: ${(props) => props.theme.colors.primary};
  padding: ${(props) => props.theme.spacing.md};
  border-radius: ${(props) => props.theme.borderRadius.md};
`;

// Usage
<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>
```

## Performance Tips

### 1. Use `css` Helper for Reusable Styles

```javascript
import styled, { css } from 'styled-components';

const flexCenter = css`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Container = styled.div`
  ${flexCenter}
  width: 100%;
`;
```

### 2. Avoid Creating Components Inside Render

```javascript
// ❌ WRONG - Creates new component every render
function MyComponent() {
  const Button = styled.button`
    color: blue;
  `;
  return <Button>Click</Button>;
}

// ✅ CORRECT - Component defined outside
const Button = styled.button`
  color: blue;
`;

function MyComponent() {
  return <Button>Click</Button>;
}
```

### 3. Use `attrs` for Dynamic Attributes

```javascript
const Input = styled.input.attrs((props) => ({
  type: props.type || 'text',
  size: props.size || '20px',
}))`
  padding: ${(props) => props.size};
`;
```

## Debugging

### Add Display Name

```javascript
const Button = styled.button`
  color: blue;
`;

Button.displayName = 'Button';
```

### Use Babel Plugin

In `.babelrc` or `babel.config.js`:

```json
{
  "plugins": [
    [
      "babel-plugin-styled-components",
      {
        "displayName": true,
        "fileName": true
      }
    ]
  ]
}
```

## Common Mistakes to Avoid

1. **Creating components inside render**
   ```javascript
   // ❌ DON'T
   function Component() {
     const Button = styled.button`...`;
     return <Button />;
   }

   // ✅ DO
   const Button = styled.button`...`;
   function Component() {
     return <Button />;
   }
   ```

2. **Using string concatenation for styles**
   ```javascript
   // ❌ DON'T
   const color = 'red';
   const Button = styled.button`
     color: ${color};
   `;

   // ✅ DO
   const Button = styled.button`
     color: ${(props) => props.color || 'red'};
   `;
   ```

3. **Not handling props properly**
   ```javascript
   // ❌ DON'T - Button will receive styled props
   const Button = styled.button`
     color: ${(props) => props.color};
   `;
   <Button color="red" customProp="value" />

   // ✅ DO - Use transientProps
   const Button = styled.button`
     color: ${(props) => props.color};
   `;
   <Button $customProp="value" />
   ```

## Resources

- [Styled-Components Documentation](https://styled-components.com/)
- [Styled-Components API](https://styled-components.com/docs/api)
- [Best Practices](https://styled-components.com/docs/basics#best-practices)
