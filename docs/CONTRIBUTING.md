# Contributing to Student Marketplace

We love your input! We want to make contributing to Student Marketplace as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process
We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the docs/ with details of changes to the API.
3. The PR may be merged once you have the sign-off of at least one other developer.

## Code Style Guide

### JavaScript

- Use ES6+ features
- Use async/await over promises where possible
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Follow the existing error handling patterns

Example:
```javascript
/**
 * Creates a new user in the system
 * @param {Object} userData - The user data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @returns {Promise<Object>} Created user object
 * @throws {AppError} If user already exists
 */
const createUser = async (userData) => {
  // Implementation
};
```

### API Design Guidelines

1. Use RESTful conventions
2. Version all APIs (v1, v2, etc.)
3. Use appropriate HTTP methods
4. Implement proper error responses
5. Include proper validation

### Error Handling

1. Use the `AppError` class for operational errors
2. Use `catchAsync` wrapper for async functions
3. Implement proper error messages
4. Log errors appropriately

Example:
```javascript
const handleDuplicateFieldsDB = (err) => {
  const value = err.keyValue[Object.keys(err.keyValue)[0]];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};
```

### Testing Guidelines

1. Write unit tests for utilities and helpers
2. Write integration tests for API endpoints
3. Use proper test descriptions
4. Mock external services
5. Test error cases

Example:
```javascript
describe('User API', () => {
  describe('POST /api/v1/users', () => {
    it('should create a new user with valid data', async () => {
      // Test implementation
    });

    it('should return error for duplicate email', async () => {
      // Test implementation
    });
  });
});
```

### Documentation

1. Update API documentation (OpenAPI/Swagger)
2. Include JSDoc comments
3. Update README when adding features
4. Document environment variables

### Commit Messages

Follow the conventional commits specification:

- feat: (new feature)
- fix: (bug fix)
- docs: (documentation changes)
- style: (formatting, missing semi colons, etc)
- refactor: (code change that neither fixes a bug nor adds a feature)
- test: (adding missing tests)
- chore: (updating grunt tasks etc)

Example:
```
feat: add user authentication endpoint
```

### Branch Naming

- feature/feature-name
- bugfix/bug-name
- hotfix/fix-name
- release/version-number

### Security Guidelines

1. Never commit sensitive information
2. Use environment variables for secrets
3. Implement proper input validation
4. Follow security best practices
5. Regular dependency updates

## License
By contributing, you agree that your contributions will be licensed under its MIT License.