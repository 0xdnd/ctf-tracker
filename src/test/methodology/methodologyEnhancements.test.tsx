import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalHudVarsBar } from '../../components/methodology/GlobalHudVarsBar';
import { FileTransferCheatsheet } from '../../components/methodology/FileTransferCheatsheet';
import { TtyStabilizationCheatsheet } from '../../components/methodology/TtyStabilizationCheatsheet';
import { PowerShellEncoderTool } from '../../components/methodology/PowerShellEncoderTool';
import { useCtfStore } from '../../store/useCtfStore';
import { encodeUtf16LeBase64 } from '../../utils/shellEncoders';

describe('Methodology Enhancements & Offensive Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCtfStore.setState({
      globalVars: {
        lhost: '10.10.14.55',
        lport: '9001',
        targetIp: '10.10.10.100',
        interface: 'tun0',
        domain: 'HTB.LOCAL',
        dcIp: '10.10.10.1',
        user: 'svc_backup',
        cred: 'Password123!',
        wordlist: '/usr/share/seclists/Passwords/common.txt',
        customVars: {},
      },
    });
  });

  describe('GlobalHudVarsBar', () => {
    it('renders all HUD inputs with active store values', () => {
      render(<GlobalHudVarsBar />);

      expect(screen.getByDisplayValue('10.10.14.55')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10.10.10.100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('HTB.LOCAL')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10.10.10.1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('svc_backup')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Password123!')).toBeInTheDocument();
    });

    it('detects NTLM hash in CRED and displays PTH Active badge', () => {
      useCtfStore.setState({
        globalVars: {
          ...useCtfStore.getState().globalVars,
          cred: 'aad3b435b51404eeaad3b435b51404ee',
        },
      });

      render(<GlobalHudVarsBar />);
      expect(screen.getByText(/PTH Active \(NTLM\)/i)).toBeInTheDocument();
    });

    it('updates globalVars in store when typing into inputs', () => {
      render(<GlobalHudVarsBar />);
      const userInput = screen.getByDisplayValue('svc_backup');
      fireEvent.change(userInput, { target: { value: 'administrator' } });

      expect(useCtfStore.getState().globalVars.user).toBe('administrator');
    });
  });

  describe('FileTransferCheatsheet', () => {
    it('renders transfers with interpolated LHOST and LPORT', () => {
      render(<FileTransferCheatsheet />);

      expect(screen.getByText(/Python 3 HTTP Staging Server/i)).toBeInTheDocument();
      expect(screen.getByText(/Certutil Cache Split/i)).toBeInTheDocument();
      // Should show interpolated values
      expect(screen.getAllByText(/10\.10\.14\.55/i).length).toBeGreaterThan(0);
    });

    it('filters by target operating system', () => {
      render(<FileTransferCheatsheet />);

      fireEvent.click(screen.getByText(/Windows Target Downloads/i));
      expect(screen.getByText(/Certutil Cache Split/i)).toBeInTheDocument();
      expect(screen.queryByText(/Linux Curl File Download/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByText(/Linux Target Downloads/i));
      expect(screen.getByText(/Linux Curl File Download/i)).toBeInTheDocument();
      expect(screen.queryByText(/Certutil Cache Split/i)).not.toBeInTheDocument();
    });
  });

  describe('TtyStabilizationCheatsheet', () => {
    it('renders all 5 sequential steps', () => {
      render(<TtyStabilizationCheatsheet />);

      expect(screen.getByText(/Spawn PTY in Catch Shell/i)).toBeInTheDocument();
      expect(screen.getByText(/Background Netcat Shell/i)).toBeInTheDocument();
      expect(screen.getByText(/Raw Mode & Foreground Job/i)).toBeInTheDocument();
      expect(screen.getByText(/Set Terminal Profile & Shell/i)).toBeInTheDocument();
      expect(screen.getByText(/Set Rows & Columns/i)).toBeInTheDocument();
    });
  });

  describe('PowerShellEncoderTool', () => {
    it('correctly encodes UTF-16LE Base64 PowerShell command', () => {
      render(<PowerShellEncoderTool />);

      const testCmd = 'whoami';
      const encoded = encodeUtf16LeBase64(testCmd);

      const textarea = screen.getByPlaceholderText(/Enter raw PowerShell command.../i);
      fireEvent.change(textarea, { target: { value: testCmd } });

      expect(screen.getByText(new RegExp(encoded))).toBeInTheDocument();
    });
  });
});
