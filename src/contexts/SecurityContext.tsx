
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SecurityContextType {
  csrfToken: string | null;
  generateCSRFToken: () => string;
  validateCSRFToken: (token: string) => boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider = ({ children }: SecurityProviderProps) => {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const generateCSRFToken = (): string => {
    const token = crypto.randomUUID();
    setCsrfToken(token);
    sessionStorage.setItem('csrf_token', token);
    return token;
  };

  const validateCSRFToken = (token: string): boolean => {
    const storedToken = sessionStorage.getItem('csrf_token');
    return storedToken === token && token === csrfToken;
  };

  useEffect(() => {
    // Generate initial CSRF token
    const existingToken = sessionStorage.getItem('csrf_token');
    if (existingToken) {
      setCsrfToken(existingToken);
    } else {
      generateCSRFToken();
    }

    // Regenerate token every 30 minutes
    const interval = setInterval(() => {
      generateCSRFToken();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SecurityContext.Provider
      value={{
        csrfToken,
        generateCSRFToken,
        validateCSRFToken,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};
