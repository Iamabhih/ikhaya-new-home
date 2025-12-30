import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with default variant and size', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should render with text content', () => {
    const { getByText } = render(<Button>Test Button</Button>);
    expect(getByText('Test Button')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { getByRole } = render(<Button className="custom-class">Button</Button>);
    const button = getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    const button = getByRole('button', { name: /click me/i });

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled Button</Button>);
    const button = getByRole('button', { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it('should not trigger onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { getByRole } = render(<Button onClick={handleClick} disabled>Click me</Button>);
    const button = getByRole('button', { name: /click me/i });

    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('Button variants', () => {
    it('should render with default variant', () => {
      const { getByRole } = render(<Button variant="default">Default</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with destructive variant', () => {
      const { getByRole } = render(<Button variant="destructive">Delete</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with outline variant', () => {
      const { getByRole } = render(<Button variant="outline">Outline</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with secondary variant', () => {
      const { getByRole } = render(<Button variant="secondary">Secondary</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with ghost variant', () => {
      const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with link variant', () => {
      const { getByRole } = render(<Button variant="link">Link</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Button sizes', () => {
    it('should render with default size', () => {
      const { getByRole } = render(<Button size="default">Default Size</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with small size', () => {
      const { getByRole } = render(<Button size="sm">Small</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with large size', () => {
      const { getByRole } = render(<Button size="lg">Large</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with icon size', () => {
      const { getByRole } = render(<Button size="icon" aria-label="Icon button">X</Button>);
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Button with type attribute', () => {
    it('should render with type="button"', () => {
      const { getByRole } = render(<Button type="button">Button</Button>);
      const button = getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should render with type="submit"', () => {
      const { getByRole } = render(<Button type="submit">Submit</Button>);
      const button = getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  it('should support ref forwarding', () => {
    const ref = { current: null };
    render(<Button ref={ref as React.RefObject<HTMLButtonElement>}>Button</Button>);
    expect(ref.current).toBeTruthy();
  });
});