/**
 * Environment Variable Validation
 * Ensures all required environment variables are present at application startup
 */

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_PROJECT_ID',
] as const;

const OPTIONAL_ENV_VARS = [
  'VITE_APP_URL',
  'VITE_SENTRY_DSN',
] as const;

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  present: string[];
}

/**
 * Validates that all required environment variables are present
 * @throws {Error} If any required environment variables are missing
 */
export function validateEnvironment(): ValidationResult {
  const missing: string[] = [];
  const present: string[] = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach((key) => {
    if (!import.meta.env[key]) {
      missing.push(key);
    } else {
      present.push(key);
    }
  });

  // Log optional variables status in development
  if (import.meta.env.DEV) {
    OPTIONAL_ENV_VARS.forEach((key) => {
      if (!import.meta.env[key]) {
        console.warn(`[ENV] Optional variable not set: ${key}`);
      }
    });
  }

  const result: ValidationResult = {
    isValid: missing.length === 0,
    missing,
    present,
  };

  if (!result.isValid) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missing.map((key) => `   - ${key}`),
      '',
      '📝 Please check your .env file and ensure all required variables are set.',
      '📄 See .env.example for a template.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  if (import.meta.env.DEV) {
    console.log('✅ Environment validation passed');
    console.log(`   Found ${present.length} required variables`);
  }

  return result;
}

/**
 * Gets an environment variable with a fallback value
 */
export function getEnv(key: string, fallback?: string): string {
  const value = import.meta.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Environment variable ${key} is not set and no fallback provided`);
  }
  return value || fallback || '';
}

/**
 * Checks if app is running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Checks if app is running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}
