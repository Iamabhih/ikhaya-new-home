
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyMobileOptimizations } from './utils/mobileOptimization'
import { validateEnvironment } from './utils/validateEnv'

// Validate environment variables before app initialization
try {
  validateEnvironment();
} catch (error) {
  console.error(error);
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem; background: #fef2f2;">
      <div style="max-width: 600px; background: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #dc2626; margin-bottom: 1rem;">Configuration Error</h1>
        <pre style="background: #f3f4f6; padding: 1rem; border-radius: 0.375rem; overflow-x: auto; font-size: 0.875rem;">${error instanceof Error ? error.message : 'Unknown error'}</pre>
      </div>
    </div>
  `;
  throw error;
}

// Mobile debugging and error handling (only in development)
if (import.meta.env.DEV) {
  console.log('[Main] Initializing app on:', {
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });
}

// Enhanced global error handler
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  });
  
  // Prevent the default console error
  event.preventDefault();
});

// Apply comprehensive mobile optimizations
applyMobileOptimizations();
console.log('[Main] Mobile optimizations applied');

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('[Main] Root element not found');
  throw new Error('Root element not found');
}

// Hide emergency fallback once React takes over
const emergencyFallback = document.getElementById('emergency-fallback');
if (emergencyFallback) {
  emergencyFallback.style.display = 'none';
}

console.log('[Main] Root element found, creating React root');

try {
  const root = createRoot(rootElement);
  console.log('[Main] React root created, rendering app');
  root.render(<App />);
  console.log('[Main] App render initiated');
} catch (error) {
  console.error('[Main] Failed to create or render app:', error);
  
  // Show emergency fallback
  if (emergencyFallback) {
    emergencyFallback.style.display = 'flex';
    emergencyFallback.innerHTML = `
      <div style="max-width: 400px; text-align: center;">
        <h1 style="margin-bottom: 1rem; color: #dc2626; font-size: 1.5rem;">Loading Error</h1>
        <p style="margin-bottom: 1rem; color: #6b7280; line-height: 1.5;">
          Unable to start the application. This might be due to browser compatibility issues.
        </p>
        <div style="margin-bottom: 1rem; text-align: left; background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; font-size: 0.875rem;">
          <strong>Browser:</strong> ${navigator.userAgent.split(' ')[0]}<br>
          <strong>Device:</strong> ${/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
        </div>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #2563eb; 
            color: white; 
            padding: 0.75rem 1.5rem; 
            border: none; 
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          "
        >
          Refresh Page
        </button>
      </div>
    `;
  }
}
