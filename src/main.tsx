
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

// Enhanced global error handler for mobile debugging
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
  
  // Don't prevent default behavior, just log
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

// Add mobile-specific optimizations
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
  console.log('[Main] Mobile device detected, applying optimizations');
  
  // Prevent zoom on input focus for iOS
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.getElementsByTagName('head')[0].appendChild(meta);
  
  // Add touch-action optimization
  document.body.style.touchAction = 'manipulation';
}

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
  // Enhanced fallback for critical errors
  rootElement.innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      padding: 1rem;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      background: #f8f9fa;
    ">
      <div style="max-width: 400px;">
        <h1 style="margin-bottom: 1rem; color: #dc2626; font-size: 1.5rem;">Loading Error</h1>
        <p style="margin-bottom: 1rem; color: #6b7280; line-height: 1.5;">
          We're having trouble loading the page on your device. This might be due to browser compatibility issues.
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
            margin-right: 0.5rem;
          "
        >
          Refresh Page
        </button>
        <button 
          onclick="window.location.href = 'https://www.google.com/chrome/'" 
          style="
            background: #6b7280; 
            color: white; 
            padding: 0.75rem 1.5rem; 
            border: none; 
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
          "
        >
          Update Browser
        </button>
      </div>
    </div>
  `;
}
