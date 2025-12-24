# Comprehensive Testing Setup

This document outlines the complete testing infrastructure for the Ikhaya e-commerce platform.

## Table of Contents

1. [Overview](#overview)
2. [Testing Stack](#testing-stack)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Structure](#test-structure)
6. [Coverage Requirements](#coverage-requirements)
7. [GitHub Actions CI/CD](#github-actions-cicd)
8. [Best Practices](#best-practices)

## Overview

The project uses a comprehensive testing setup with:
- ✅ Unit tests for utilities and functions
- ✅ Component tests for React components
- ✅ Hook tests for custom React hooks
- ✅ Integration tests for complex workflows
- ✅ Automated CI/CD pipeline via GitHub Actions
- ✅ Code coverage tracking and reporting

## Testing Stack

All testing dependencies are already installed:

- **Vitest** - Fast unit test framework for Vite projects
- **@testing-library/react** - React component testing utilities
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Custom DOM matchers
- **jsdom** - DOM implementation for Node.js
- **@vitest/ui** - Interactive UI for test results
- **@vitest/coverage-v8** - Code coverage reporting

## Running Tests

### Local Development

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run all tests once
npm run test:run

# Run tests with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Continuous Integration

Tests run automatically on:
- Every push to `main`, `develop`, or `claude/**` branches
- Every pull request to `main` or `develop`
- Daily scheduled runs for coverage tracking

## Writing Tests

### Test File Location

Tests are organized in `src/test/__tests__/` with the following structure:

```
src/test/
├── setup.ts                          # Test configuration and global mocks
└── __tests__/
    ├── components/                   # Component tests
    │   └── Button.test.tsx
    ├── hooks/                        # Hook tests
    │   └── use-mobile.test.tsx
    ├── utils/                        # Utility function tests
    │   └── validation.test.ts
    └── contexts/                     # Context tests
        └── (your context tests here)
```

### Unit Test Example

```typescript
// src/test/__tests__/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '@/utils/validation';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

### Component Test Example

```typescript
// src/test/__tests__/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with text content', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hook Test Example

```typescript
// src/test/__tests__/hooks/use-mobile.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile Hook', () => {
  it('should return true for mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });
});
```

## Test Structure

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Describe blocks: Use component/function name
- Test cases: Use "should..." format for clarity

### Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should add items to cart', () => {
     // Arrange
     const cart = createCart();
     const item = { id: 1, name: 'Product' };

     // Act
     cart.addItem(item);

     // Assert
     expect(cart.items).toContain(item);
   });
   ```

2. **Test One Thing at a Time**
   - Each test should verify a single behavior
   - Use multiple tests for different scenarios

3. **Use Descriptive Names**
   - Good: `it('should validate email format correctly')`
   - Bad: `it('works')`

4. **Mock External Dependencies**
   ```typescript
   import { vi } from 'vitest';

   const mockFetch = vi.fn();
   global.fetch = mockFetch;
   ```

5. **Clean Up After Tests**
   - Use `afterEach` for cleanup
   - Reset mocks between tests

## Coverage Requirements

The project enforces the following coverage thresholds:

| Metric     | Threshold |
|------------|-----------|
| Lines      | 70%       |
| Functions  | 70%       |
| Branches   | 70%       |
| Statements | 70%       |

### Priority Areas (Target 80%+ coverage)

- 🔐 **Authentication & Authorization**
  - Login/logout flows
  - Session management
  - Role-based access control

- 💳 **Payment Processing**
  - PayFast integration
  - Payment validation
  - Transaction handling

- 🛒 **E-commerce Core**
  - Cart operations (add, remove, update)
  - Order creation and management
  - Product catalog operations

- 🔒 **Security**
  - Input validation
  - XSS prevention
  - Data sanitization

### Viewing Coverage Reports

After running `npm run test:coverage`:

1. **Terminal Output**: See summary in console
2. **HTML Report**: Open `coverage/index.html` in browser
3. **Detailed JSON**: Check `coverage/coverage-final.json`

## GitHub Actions CI/CD

### Workflows

#### 1. Test Workflow (`.github/workflows/test.yml`)
- Runs on push and PR
- Tests on Node.js 18.x and 20.x
- Generates coverage reports
- Uploads artifacts to Codecov

#### 2. PR Checks (`.github/workflows/pr-checks.yml`)
- Validates TypeScript compilation
- Runs linter
- Checks coverage thresholds
- Performs security scans
- Comments coverage on PR

#### 3. Coverage Report (`.github/workflows/coverage.yml`)
- Runs daily at 2 AM UTC
- Generates comprehensive coverage reports
- Uploads to Codecov
- Stores historical coverage data

### Viewing CI Results

1. **GitHub Actions Tab**: See all workflow runs
2. **PR Comments**: Automatic coverage reports on PRs
3. **Codecov Dashboard**: Detailed coverage tracking (if configured)

## Configuration Files

### vitest.config.ts

Key configurations:
- `globals: true` - Enable global test APIs
- `environment: 'jsdom'` - Browser-like environment
- `setupFiles: ['./src/test/setup.ts']` - Global test setup
- Coverage thresholds and exclusions
- Test timeout: 10 seconds

### src/test/setup.ts

Global test setup includes:
- Testing Library matchers
- Automatic cleanup after each test
- Mock implementations for:
  - IntersectionObserver
  - ResizeObserver
  - matchMedia
  - scrollTo

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
```bash
# Check Node.js version (requires 18.x or 20.x)
node --version

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Coverage below threshold**
```bash
# View which files need more tests
npm run test:coverage

# Focus on critical paths first
# Check coverage/index.html for details
```

**Tests timeout**
```bash
# Increase timeout in specific test
it('slow test', async () => {
  // test code
}, { timeout: 15000 });
```

## Next Steps

1. ✅ Testing infrastructure is set up
2. ✅ Example tests are provided
3. ✅ CI/CD pipeline is configured
4. 📝 Write tests for critical features:
   - Payment processing (`src/utils/payment/`)
   - Cart operations (`src/hooks/useCart.ts`)
   - Authentication (`src/contexts/SecurityContext.tsx`)
   - Order management
5. 📊 Monitor coverage and aim for 70%+ overall
6. 🔄 Run tests before every commit
7. 🎯 Achieve 80%+ coverage for critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Status**: ✅ Comprehensive testing infrastructure is fully configured and operational.
