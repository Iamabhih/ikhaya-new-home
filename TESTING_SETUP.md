# Testing Setup Instructions

## Install Testing Dependencies

To enable automated testing, run the following command:

```bash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

## Running Tests

After installing dependencies, you can run tests using:

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

Test files should be placed in `src/test/__tests__/` and follow the naming convention `*.test.ts` or `*.test.tsx`.

Example test:
```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should render correctly', () => {
    expect(true).toBe(true);
  });
});
```

## Test Coverage Goals

- **Critical Paths:** 80%+ coverage
  - Payment processing
  - Order creation
  - Cart operations
  - Authentication
  
- **Overall:** 70%+ coverage

## Next Steps

1. Install testing dependencies (command above)
2. Run `npm test` to verify setup
3. Start writing tests for critical functionality
4. Add tests to CI/CD pipeline

