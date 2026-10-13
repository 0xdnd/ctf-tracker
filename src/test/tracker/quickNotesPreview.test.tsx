import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickNotesField } from '../../components/tracker/QuickNotesField';
import { GlobalVariables } from '../../types';

const vars: GlobalVariables = {
  lhost: '10.10.14.7',
  lport: '9001',
  targetIp: '10.10.11.5',
  interface: 'tun0',
  customVars: {},
};

function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('Check `connect to {TARGET} on port 8080`\n\n```\necho {LHOST}\n```');
  return (
    <QuickNotesField
      aria-label="Target Field Notes"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      globalVars={vars}
      soundEnabled={false}
      targetIp="10.129.0.9"
    />
  );
}

describe('QuickNotesField preview / edit toggle', () => {
  it('starts in edit mode with the autosaving textarea', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const textarea = screen.getByLabelText('Target Field Notes');
    fireEvent.change(textarea, { target: { value: 'echo {LHOST}' } });
    expect(onChange).toHaveBeenCalledWith('echo {LHOST}');
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders code with chips and a copy button in preview, and switches back', () => {
    render(<Harness onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
    expect(screen.queryByLabelText('Target Field Notes')).not.toBeInTheDocument();
    const preview = screen.getByTestId('quick-notes-preview');
    expect(preview.querySelector('code')!.textContent).toBe('connect to 10.129.0.9 on port 8080');
    expect(preview.querySelector('pre')!.textContent).toBe('echo 10.10.14.7');
    expect(screen.getByTitle('Copy interpolated code')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Target Field Notes')).toBeInTheDocument();
  });
});
