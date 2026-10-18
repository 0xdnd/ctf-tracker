import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { interpretScanWithClaude } from '../../utils/aiScanInterpreter';
import {
  getStoredApiKey,
  saveApiKey,
  removeApiKey,
  isRememberKeyEnabled,
  getSelectedModel,
  CLAUDE_MODELS
} from '../../utils/aiClient';
import { canSkipConsentDialog, rememberRedactedConsent, clearRememberedConsent } from '../../utils/aiConsent';
import type { ScanImportResult } from '../../utils/scanParserUtils';

const scan: ScanImportResult = {
  format: 'nmap-text',
  detectedIp: '10.10.11.42',
  detectedHost: 'dc01.corp.local',
  ports: [
    {
      port: 445,
      protocol: 'tcp',
      state: 'open',
      service: 'microsoft-ds',
      version: '',
      suggestedTools: [],
      scripts: { 'smb-enum-users': 'CORP\\jsmith (RID: 1103) User: svc_backup' }
    }
  ],
  rawSummary: 'Nmap scan report for dc01.corp.local (10.10.11.42) MAC Address: 00:11:22:AA:BB:CC'
};

const opts = { targetIp: '10.10.11.42', targetName: 'dc01.corp.local' };
const REAL_VALUES = ['10.10.11.42', 'dc01.corp.local', 'CORP.LOCAL', 'jsmith', 'svc_backup', '00:11:22:AA:BB:CC'];

function sseResponse(text: string): Response {
  const enc = new TextEncoder();
  const events =
    `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text } })}\n\n`;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(events));
      controller.close();
    }
  });
  return new Response(stream, { status: 200 });
}

describe('AI scan send gating (mocked fetch)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('makes no fetch without an API key', async () => {
    await expect(
      interpretScanWithClaude(scan, { ...opts, consentGranted: true }, { onChunk: () => {} })
    ).rejects.toThrow(/API key/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('makes no fetch without consent, even with a key', async () => {
    await expect(
      interpretScanWithClaude(scan, { ...opts, apiKey: 'sk-ant-test' }, { onChunk: () => {} })
    ).rejects.toThrow(/consent/i);
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(
      interpretScanWithClaude(scan, { ...opts, apiKey: 'sk-ant-test', consentGranted: false }, { onChunk: () => {} })
    ).rejects.toThrow(/consent/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('with key + consent: fetches only api.anthropic.com, body is redacted, response is restored', async () => {
    // Echo every placeholder found in the outgoing request back in the model reply.
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const placeholders = Array.from(new Set(String(JSON.parse(String(init.body)).messages[0].content).match(/\[(?:IP|HOST|DOMAIN|USER|NET|MAC)_\d+\]/g) || []));
      return sseResponse(`Run against ${placeholders.join(' ')}`);
    });

    const chunks: string[] = [];
    const result = await interpretScanWithClaude(
      scan,
      { ...opts, apiKey: 'sk-ant-test', consentGranted: true, model: 'claude-sonnet-5-5' },
      { onChunk: (t) => chunks.push(t) }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(new URL(url as string).host).toBe('api.anthropic.com');

    const bodyStr = (init as RequestInit).body as string;
    for (const real of REAL_VALUES) {
      expect(bodyStr).not.toContain(real);
    }
    expect(bodyStr).toMatch(/\[IP_1\]/);
    // claude-sonnet-5-5 rejects sampling params
    expect(JSON.parse(bodyStr)).not.toHaveProperty('temperature');
    expect(JSON.parse(bodyStr).model).toBe('claude-sonnet-5-5');

    // Placeholders in the model's reply are restored to real values for display.
    expect(result).not.toMatch(/\[(IP|HOST|DOMAIN|USER|NET|MAC)_\d+\]/);
    expect(result).toContain('10.10.11.42');
    expect(result).toContain('dc01.corp.local');
    expect(result).toContain('jsmith');
    expect(chunks[chunks.length - 1]).toContain('10.10.11.42');
  });

  it('unredacted mode (redact=false) sends real values, only after consent', async () => {
    fetchMock.mockImplementation(async () => sseResponse('ok'));
    await interpretScanWithClaude(
      scan,
      { ...opts, apiKey: 'sk-ant-test', consentGranted: true, redact: false },
      { onChunk: () => {} }
    );
    const bodyStr = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
    expect(bodyStr).toContain('10.10.11.42');
  });
});

describe('API key storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('defaults to sessionStorage, not localStorage', () => {
    saveApiKey('sk-ant-abc');
    expect(getStoredApiKey()).toBe('sk-ant-abc');
    expect(localStorage.getItem('zerobox_anthropic_api_key')).toBeNull();
    expect(sessionStorage.getItem('zerobox_anthropic_api_key')).toBe('sk-ant-abc');
    expect(isRememberKeyEnabled()).toBe(false);
  });

  it('remember=true persists to localStorage only', () => {
    saveApiKey('sk-ant-abc', true);
    expect(localStorage.getItem('zerobox_anthropic_api_key')).toBe('sk-ant-abc');
    expect(sessionStorage.getItem('zerobox_anthropic_api_key')).toBeNull();
    expect(isRememberKeyEnabled()).toBe(true);
  });

  it('migrates a legacy localStorage key: keeps it and marks remember=true', () => {
    localStorage.setItem('zerobox_anthropic_api_key', 'sk-ant-legacy');
    expect(getStoredApiKey()).toBe('sk-ant-legacy');
    expect(isRememberKeyEnabled()).toBe(true);
    expect(localStorage.getItem('zerobox_anthropic_api_key')).toBe('sk-ant-legacy');
  });

  it('Forget key clears both storages', () => {
    saveApiKey('sk-ant-abc', true);
    sessionStorage.setItem('zerobox_anthropic_api_key', 'sk-ant-other');
    removeApiKey();
    expect(getStoredApiKey()).toBeNull();
    expect(localStorage.getItem('zerobox_anthropic_api_key')).toBeNull();
    expect(sessionStorage.getItem('zerobox_anthropic_api_key')).toBeNull();
  });
});

describe('model selection migration', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to claude-sonnet-5-5 and only lists current models', () => {
    expect(getSelectedModel()).toBe('claude-sonnet-5-5');
    expect(CLAUDE_MODELS.map((m) => m.id)).toEqual(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001']);
  });

  it('migrates retired stored model ids to the new default', () => {
    for (const legacy of ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-5-haiku-20241022', 'claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5']) {
      localStorage.setItem('zerobox_anthropic_model', legacy);
      expect(getSelectedModel()).toBe('claude-sonnet-5-5');
      expect(localStorage.getItem('zerobox_anthropic_model')).toBe('claude-sonnet-5-5');
    }
  });

  it('keeps a valid stored current model', () => {
    localStorage.setItem('zerobox_anthropic_model', 'claude-haiku-4-5-20251001');
    expect(getSelectedModel()).toBe('claude-haiku-4-5-20251001');
  });
});

describe('consent persistence', () => {
  beforeEach(() => localStorage.clear());

  it('remembered consent applies only to redacted mode; unredacted always prompts', () => {
    expect(canSkipConsentDialog(true)).toBe(false);
    rememberRedactedConsent();
    expect(canSkipConsentDialog(true)).toBe(true);
    expect(canSkipConsentDialog(false)).toBe(false);
    clearRememberedConsent();
    expect(canSkipConsentDialog(true)).toBe(false);
  });
});
