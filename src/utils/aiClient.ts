/**
 * aiClient.ts
 * Client-Side Anthropic Claude API Client for ZeroBox Tactical Cyber Suite.
 * Optional, user-initiated feature: direct HTTPS calls from browser
 * to api.anthropic.com with Bring-Your-Own-Key (BYOK). Zero intermediate servers.
 *
 * No telemetry. AI is optional and uses your own key.
 *
 * Key storage model:
 * - Default: sessionStorage (cleared when the tab/browser closes).
 * - Opt-in "Remember key on this device": localStorage (persists across sessions).
 * - Legacy migration: earlier builds always wrote the key to localStorage under
 *   STORAGE_KEY_API_KEY with no remember flag. On first read we detect that shape
 *   and mark remember=true rather than silently relocating/dropping the key.
 */

export interface AiModelOption {
  id: string;
  name: string;
  description: string;
  tier: 'elite' | 'standard' | 'fast';
}

// Current model IDs (per coordinator, supersedes the claude-api skill snapshot). Anthropic-version
// header and browser-access header shape are unchanged from prior integration.
export const CLAUDE_MODELS: AiModelOption[] = [
  {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    description: 'Top-tier reasoning for complex multi-hop exploit chains and Active Directory topologies.',
    tier: 'elite'
  },
  {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    description: 'Capable default for exploit chaining, Nmap analysis, and scripting.',
    tier: 'standard'
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'High-speed, low-cost reconnaissance and port banner summarization.',
    tier: 'fast'
  }
];

const DEFAULT_MODEL_ID = 'claude-sonnet-5-5';
const FAST_TEST_MODEL_ID = 'claude-haiku-4-5-20251001';

// Model IDs that are no longer served; any stored selection matching one of these
// is migrated to DEFAULT_MODEL_ID rather than sent to the API.
const LEGACY_MODEL_IDS = new Set([
  'claude-3-5-sonnet-20241022',
  'claude-3-opus-20240229',
  'claude-3-5-haiku-20241022',
  // Earlier ZeroBox builds of this feature used the undated/short IDs below.
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-haiku-4-5'
]);

// Models whose current API rejects top-level sampling params (temperature/top_p/top_k)
// with a 400 (thinking is on by default / adaptive-only). Only Haiku 4.5 (the
// "older" tier model here) still accepts classic sampling params.
function modelSupportsSampling(model: string): boolean {
  return model === FAST_TEST_MODEL_ID;
}

const STORAGE_KEY_API_KEY = 'zerobox_anthropic_api_key';
const STORAGE_KEY_REMEMBER = 'zerobox_anthropic_remember_key';
const SESSION_KEY_API_KEY = 'zerobox_anthropic_api_key'; // sessionStorage, separate store from localStorage
const STORAGE_KEY_MODEL = 'zerobox_anthropic_model';

/** Whether "Remember key on this device" (localStorage persistence) is enabled. */
export function isRememberKeyEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true';
  } catch {
    return false;
  }
}

/**
 * One-time migration: builds prior to the remember-key feature always stored the
 * key in localStorage with no remember flag at all. If we find that shape, treat
 * it as an implicit remember=true (keep the key, don't drop it silently) instead
 * of relocating it out from under the user.
 */
function migrateLegacyKeyIfNeeded(): void {
  try {
    const legacyKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    const rememberFlag = localStorage.getItem(STORAGE_KEY_REMEMBER);
    if (legacyKey && rememberFlag === null) {
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
    }
  } catch {
    // Ignore storage errors
  }
}

export function getStoredApiKey(): string | null {
  try {
    migrateLegacyKeyIfNeeded();
    if (isRememberKeyEnabled()) {
      const remembered = localStorage.getItem(STORAGE_KEY_API_KEY);
      if (remembered) return remembered;
    }
    return sessionStorage.getItem(SESSION_KEY_API_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Save the API key. Defaults to sessionStorage; pass remember=true to persist to
 * localStorage instead ("Remember key on this device"). Switching modes clears
 * the other storage so the key never lives in both places at once.
 */
export function saveApiKey(key: string, remember: boolean = isRememberKeyEnabled()): void {
  const trimmed = key.trim();
  if (!trimmed) {
    removeApiKey();
    return;
  }
  try {
    if (remember) {
      localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'true');
      sessionStorage.removeItem(SESSION_KEY_API_KEY);
    } else {
      sessionStorage.setItem(SESSION_KEY_API_KEY, trimmed);
      localStorage.removeItem(STORAGE_KEY_API_KEY);
      localStorage.setItem(STORAGE_KEY_REMEMBER, 'false');
    }
  } catch {
    // Ignore storage errors
  }
}

/** "Forget key": clears the key from both sessionStorage and localStorage. */
export function removeApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
    sessionStorage.removeItem(SESSION_KEY_API_KEY);
    localStorage.setItem(STORAGE_KEY_REMEMBER, 'false');
  } catch {
    // Ignore storage errors
  }
}

export function getSelectedModel(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_MODEL);
    if (!stored) return DEFAULT_MODEL_ID;
    const isKnown = CLAUDE_MODELS.some((m) => m.id === stored);
    if (LEGACY_MODEL_IDS.has(stored) || !isKnown) {
      // Migrate a retired/unknown stored model choice to the current default.
      localStorage.setItem(STORAGE_KEY_MODEL, DEFAULT_MODEL_ID);
      return DEFAULT_MODEL_ID;
    }
    return stored;
  } catch {
    return DEFAULT_MODEL_ID;
  }
}

export function setSelectedModel(modelId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MODEL, modelId);
  } catch {
    // Ignore storage errors
  }
}

export interface ApiTestResult {
  success: boolean;
  modelUsed?: string;
  error?: string;
}

/**
 * Validate Anthropic API key with minimal test request. This is an explicit,
 * user-initiated connectivity check (clicking "Test Key") and carries no scan
 * data, so it is not gated behind the data-sending consent flow.
 */
export async function testAnthropicConnection(apiKey?: string): Promise<ApiTestResult> {
  const key = apiKey || getStoredApiKey();
  if (!key) {
    return { success: false, error: 'No Anthropic API key provided or found in storage.' };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: FAST_TEST_MODEL_ID,
        max_tokens: 15,
        messages: [{ role: 'user', content: 'Reply with "ZEROBOX_ONLINE"' }]
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      return { success: false, error: msg };
    }

    const data = await response.json();
    return {
      success: true,
      modelUsed: data.model || FAST_TEST_MODEL_ID
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to api.anthropic.com'
    };
  }
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: Error) => void;
}

/**
 * Send request to Claude Messages API with streaming support.
 *
 * Requires `options.consentGranted === true`. This is the single choke point
 * all scan-data sends pass through, so the consent gate (and the key gate)
 * cannot be bypassed by a caller that forgets to check first: no fetch happens
 * without both a key and explicit consent.
 */
export async function streamClaudeMessage(
  systemPrompt: string,
  userPrompt: string,
  callbacks: StreamCallbacks,
  options?: { model?: string; maxTokens?: number; temperature?: number; apiKey?: string; consentGranted?: boolean }
): Promise<string> {
  const key = options?.apiKey || getStoredApiKey();
  if (!key) {
    const err = new Error('No Anthropic API key configured. Enter your key in Settings or the Recon modal.');
    callbacks.onError?.(err);
    throw err;
  }

  if (!options?.consentGranted) {
    const err = new Error('Consent required before sending data to Anthropic.');
    callbacks.onError?.(err);
    throw err;
  }

  const model = options?.model || getSelectedModel();
  const maxTokens = options?.maxTokens || 3500;
  const temperature = options?.temperature ?? 0.2;

  try {
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      stream: true,
      messages: [{ role: 'user', content: userPrompt }]
    };
    // claude-opus-5-5 / claude-sonnet-5-5 run adaptive thinking by default and reject
    // top-level sampling params (temperature/top_p/top_k) with a 400. Only send
    // temperature for older models that still accept it (e.g. claude-haiku-4-5-20251001).
    if (modelSupportsSampling(model)) {
      body.temperature = temperature;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
      const err = new Error(msg);
      callbacks.onError?.(err);
      throw err;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body stream is not available');
    }

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const chunk = parsed.delta.text || '';
            fullText += chunk;
            callbacks.onChunk(chunk);
          }
        } catch {
          // Ignore partial SSE JSON parse attempts
        }
      }
    }

    callbacks.onDone?.(fullText);
    return fullText;
  } catch (err: any) {
    callbacks.onError?.(err);
    throw err;
  }
}
