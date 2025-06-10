
import { FormHTMLAttributes, ReactNode } from 'react';
import { useSecurityContext } from '@/contexts/SecurityContext';

interface SecureFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  onSecureSubmit: (e: React.FormEvent, csrfToken: string) => void;
}

export const SecureForm = ({ children, onSecureSubmit, onSubmit, ...props }: SecureFormProps) => {
  const { csrfToken } = useSecurityContext();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!csrfToken) {
      console.error('CSRF token not available');
      return;
    }
    
    onSecureSubmit(e, csrfToken);
  };

  return (
    <form {...props} onSubmit={handleSubmit}>
      <input type="hidden" name="csrf_token" value={csrfToken || ''} />
      {children}
    </form>
  );
};
