/**
 * aiClient.ts
 * Client-Side Anthropic Claude API Client for ZeroBox Tactical Cyber Suite.
 * Adheres strictly to Zero-Egress invariants: Direct HTTPS calls from browser
 * to api.anthropic.com with Bring-Your-Own-Key (BYOK). Zero intermediate servers.
 */

export interface AiModelOption {
  id: string;
  name: string;
  description: string;
  tier: 'elite' | 'standard' | 'fast';
}

export const CLAUDE_MODELS: AiModelOption[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Premier choice for exploit chaining, Nmap analysis, and scripting.',
    tier: 'elite'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    description: 'Deep strategic reasoning for complex multi-hop and Active Directory topologies.',
    tier: 'elite'
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'High-speed, low-cost reconnaissance and port banner summarization.',
    tier: 'fast'
  }
];

const STORAGE_KEY_API_KEY = 'zerobox_anthropic_api_key';
const STORAGE_KEY_MODEL = 'zerobox_anthropic_model';

export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_API_KEY) || null;
  } catch {
    return null;
  }
}

export function saveApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
  } else {
    removeApiKey();
  }
}

export function removeApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getSelectedModel(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_MODEL) || 'claude-3-5-sonnet-20241022';
  } catch {
    return 'claude-3-5-sonnet-20241022';
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
 * Validate Anthropic API key with minimal test request
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
        model: 'claude-3-5-haiku-20241022',
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
      modelUsed: data.model || 'claude-3-5-haiku-20241022'
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
 * Send request to Claude Messages API with streaming support
 */
export async function streamClaudeMessage(
  systemPrompt: string,
  userPrompt: string,
  callbacks: StreamCallbacks,
  options?: { model?: string; maxTokens?: number; temperature?: number; apiKey?: string }
): Promise<string> {
  const key = options?.apiKey || getStoredApiKey();
  if (!key) {
    const err = new Error('No Anthropic API key configured. Enter your key in Settings or the Recon modal.');
    callbacks.onError?.(err);
    throw err;
  }

  const model = options?.model || getSelectedModel();
  const maxTokens = options?.maxTokens || 3500;
  const temperature = options?.temperature ?? 0.2;

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
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        stream: true,
        messages: [{ role: 'user', content: userPrompt }]
      })
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
