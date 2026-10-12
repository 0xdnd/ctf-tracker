import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CyberInput } from '../../components/common/CyberInput';

describe('CyberInput Primitive', () => {
  it('renders input with label and placeholder', () => {
    render(<CyberInput label="LHOST" placeholder="10.10.14.X" />);
    expect(screen.getByLabelText('LHOST')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('10.10.14.X')).toBeInTheDocument();
  });

  it('renders clear button when clearable and value exists', () => {
    const handleClear = vi.fn();
    render(<CyberInput label="Filter" value="admin" clearable onClear={handleClear} onChange={() => {}} />);
    const clearBtn = screen.getByRole('button', { name: /Clear input/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('displays error message with role="alert" and aria-invalid', () => {
    render(<CyberInput label="Port" error="Port must be between 1 and 65535" />);
    const input = screen.getByLabelText('Port');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Port must be between 1 and 65535');
  });
});
