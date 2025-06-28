
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Mobile debugging and error handling
console.log('[Main] Initializing app on:', {
  userAgent: navigator.userAgent,
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight
  },
  screen: {
    width: screen.width,
    height: screen.height
  }
});

// Global error handler for mobile debugging
window.addEventListener('error', (event) => {
  console.error('[Global Error Handler]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    userAgent: navigator.userAgent
  });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    userAgent: navigator.userAgent
  });
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error('[Main] Root element not found - this could cause white screen');
  throw new Error('Root element not found');
}

console.log('[Main] Root element found, creating React root');

try {
  const root = createRoot(rootElement);
  console.log('[Main] React root created, rendering app');
  root.render(<App />);
  console.log('[Main] App render initiated');
} catch (error) {
  console.error('[Main] Failed to create or render app:', error);
  // Fallback for critical errors
  rootElement.innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      padding: 1rem;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
    ">
      <div>
        <h1 style="margin-bottom: 1rem; color: #dc2626;">Loading Error</h1>
        <p style="margin-bottom: 1rem; color: #6b7280;">
          We're having trouble loading the page. Please refresh to try again.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: #2563eb; 
            color: white; 
            padding: 0.5rem 1rem; 
            border: none; 
            border-radius: 0.375rem;
            cursor: pointer;
          "
        >
          Refresh Page
        </button>
      </div>
    </div>
  `;
}
