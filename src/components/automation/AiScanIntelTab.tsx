import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Terminal,
  Key,
  Check,
  Copy,
  Square,
  Play,
  ShieldAlert,
  Cpu,
  Save,
  AlertTriangle,
  Zap,
  Info,
  Trash2,
  ShieldOff,
  ShieldCheck
} from 'lucide-react';
import { Machine } from '../../types';
import { ScanImportResult } from '../../utils/scanParserUtils';
import {
  getStoredApiKey,
  saveApiKey,
  removeApiKey,
  isRememberKeyEnabled,
  getSelectedModel,
  setSelectedModel,
  CLAUDE_MODELS,
  testAnthropicConnection
} from '../../utils/aiClient';
import { interpretScanWithClaude, buildRedactedScanPrompt, CYBER_TACTICAL_SYSTEM_PROMPT } from '../../utils/aiScanInterpreter';
import { canSkipConsentDialog, rememberRedactedConsent } from '../../utils/aiConsent';
import { AiConsentDialog } from './AiConsentDialog';
import { playCyberSound } from '../../utils/helpers';

interface AiScanIntelTabProps {
  targetMachine?: Machine | null;
  parsedResults?: ScanImportResult | null;
  onApplyToTargetNotes?: (markdownContent: string) => void;
  isTargetFrozen?: boolean;
}

export const AiScanIntelTab: React.FC<AiScanIntelTabProps> = ({
  targetMachine,
  parsedResults,
  onApplyToTargetNotes,
  isTargetFrozen = false
}) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [hasStoredKey, setHasStoredKey] = useState<boolean>(false);
  const [showKeyDrawer, setShowKeyDrawer] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>('');
  const [rememberKey, setRememberKey] = useState<boolean>(isRememberKeyEnabled());
  const [testingKey, setTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  const [redactEnabled, setRedactEnabled] = useState<boolean>(true);
  const [pendingSend, setPendingSend] = useState<{ prompt: string; map: ReturnType<typeof buildRedactedScanPrompt>['map'] } | null>(null);

  const [selectedModel, setModel] = useState<string>(getSelectedModel());
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIntel, setCopiedIntel] = useState<boolean>(false);
  const [appliedNotes, setAppliedNotes] = useState<boolean>(false);

  const abortControllerRef = useRef<boolean>(false);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const existing = getStoredApiKey();
    if (existing) {
      setApiKey(existing);
      setHasStoredKey(true);
    } else {
      setShowKeyDrawer(true);
    }
    setModel(getSelectedModel());
  }, []);

  // Auto-scroll output container as tokens stream in
  useEffect(() => {
    if (isGenerating && outputContainerRef.current) {
      outputContainerRef.current.scrollTop = outputContainerRef.current.scrollHeight;
    }
  }, [aiOutput, isGenerating]);

  const handleSaveApiKey = () => {
    if (!keyInput.trim()) return;
    saveApiKey(keyInput.trim(), rememberKey);
    setApiKey(keyInput.trim());
    setHasStoredKey(true);
    setShowKeyDrawer(false);
    setKeyInput('');
    playCyberSound('click');
  };

  const handleForgetKey = () => {
    removeApiKey();
    setApiKey('');
    setHasStoredKey(false);
    setKeyInput('');
    setTestResult(null);
    setShowKeyDrawer(true);
    playCyberSound('click');
  };

  const handleTestConnection = async () => {
    const keyToTest = keyInput.trim() || apiKey;
    if (!keyToTest) return;
    setTestingKey(true);
    setTestResult(null);

    const res = await testAnthropicConnection(keyToTest);
    setTestingKey(false);
    if (res.success) {
      setTestResult({ success: true, msg: `Verified: Connected to ${res.modelUsed}` });
      playCyberSound('root');
    } else {
      setTestResult({ success: false, msg: res.error || 'Connection failed' });
      playCyberSound('alert');
    }
  };

  const handleModelSelect = (modelId: string) => {
    setModel(modelId);
    setSelectedModel(modelId);
    playCyberSound('click');
  };

  const runAnalysis = async (consentGranted: boolean) => {
    if (!parsedResults) return;

    setIsGenerating(true);
    setAiOutput('');
    setErrorMsg(null);
    setAppliedNotes(false);
    abortControllerRef.current = false;
    playCyberSound('click');

    try {
      await interpretScanWithClaude(
        parsedResults,
        {
          targetIp: targetMachine?.ip,
          targetName: targetMachine?.name,
          targetOs: targetMachine?.os,
          difficulty: targetMachine?.difficulty,
          model: selectedModel,
          apiKey,
          redact: redactEnabled,
          consentGranted
        },
        {
          onChunk: (cumulativeText) => {
            if (abortControllerRef.current) return;
            setAiOutput(cumulativeText);
          },
          onDone: () => {
            setIsGenerating(false);
            playCyberSound('root');
          },
          onError: (err) => {
            setIsGenerating(false);
            setErrorMsg(err.message || 'Error communicating with Claude API.');
            playCyberSound('alert');
          }
        }
      );
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMsg(err.message || 'Execution error.');
    }
  };

  const handleStartAnalysis = () => {
    if (!parsedResults || parsedResults.ports.length === 0) {
      setErrorMsg('No scan parsed yet. Please paste or upload an Nmap/Rustscan file in the Importer tab first.');
      playCyberSound('alert');
      return;
    }

    if (!apiKey) {
      setShowKeyDrawer(true);
      setErrorMsg('Please configure your Anthropic API Key first.');
      playCyberSound('alert');
      return;
    }

    if (canSkipConsentDialog(redactEnabled)) {
      void runAnalysis(true);
      return;
    }

    // Build the exact post-redaction payload for the consent preview before sending anything.
    const { prompt, map } = buildRedactedScanPrompt(parsedResults, {
      targetIp: targetMachine?.ip,
      targetName: targetMachine?.name,
      targetOs: targetMachine?.os,
      difficulty: targetMachine?.difficulty,
      redact: redactEnabled
    });
    setPendingSend({ prompt, map });
  };

  const handleConsentCancel = () => {
    setPendingSend(null);
    playCyberSound('click');
  };

  const handleConsentSend = (shouldRemember: boolean) => {
    setPendingSend(null);
    if (shouldRemember) rememberRedactedConsent();
    void runAnalysis(true);
  };

  const handleStopAnalysis = () => {
    abortControllerRef.current = true;
    setIsGenerating(false);
    playCyberSound('click');
  };

  const handleCopyIntel = () => {
    if (!aiOutput) return;
    navigator.clipboard.writeText(aiOutput).catch(() => {});
    setCopiedIntel(true);
    playCyberSound('click');
    setTimeout(() => setCopiedIntel(false), 2000);
  };

  const handleApplyToNotes = () => {
    if (!aiOutput || !onApplyToTargetNotes || isTargetFrozen) return;
    const timestamp = new Date().toLocaleTimeString();
    const formattedPayload = `\n\n### 🧠 Claude AI Scan Intelligence [${selectedModel}] (${timestamp})\n` +
      `- **Target**: ${targetMachine?.name || 'Active Machine'} (${targetMachine?.ip || 'N/A'})\n` +
      `- **Assumed OS**: ${targetMachine?.os || 'N/A'}\n\n` +
      `${aiOutput}\n`;

    onApplyToTargetNotes(formattedPayload);
    setAppliedNotes(true);
    playCyberSound('root');
    setTimeout(() => setAppliedNotes(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-hidden gap-3 font-sans">
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-surface-sunken border border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary">Claude AI Recon Intelligence</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold border border-accent/20">
                BYOK
              </span>
            </div>
            <p className="text-[11px] text-muted">
              No telemetry. AI is optional and uses your own key.
            </p>
          </div>
        </div>

        {/* Model Selector Pills */}
        <div className="flex items-center gap-1.5 bg-surface-card p-1 rounded-lg border border-subtle">
          {CLAUDE_MODELS.map((m) => {
            const isSelected = selectedModel === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModelSelect(m.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
                title={m.description}
              >
                <span>{m.name}</span>
                {m.tier === 'fast' && <Zap className="w-3 h-3 text-amber-400" />}
              </button>
            );
          })}
        </div>

        {/* Redaction Toggle */}
        <button
          type="button"
          onClick={() => setRedactEnabled((v) => !v)}
          title={redactEnabled ? 'IPs, hostnames, AD domains, and usernames are redacted before sending' : 'Warning: real values will be sent unredacted'}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            redactEnabled
              ? 'bg-surface-card border-subtle text-secondary hover:border-accent'
              : 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
          }`}
        >
          {redactEnabled ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          <span>{redactEnabled ? 'Redaction ON' : 'Redaction OFF'}</span>
        </button>

        {/* Key Settings Button */}
        <button
          type="button"
          onClick={() => setShowKeyDrawer(!showKeyDrawer)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            hasStoredKey
              ? 'bg-surface-card border-subtle text-secondary hover:border-accent'
              : 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg animate-pulse'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasStoredKey ? 'API Key Configured' : 'Configure Anthropic Key'}</span>
        </button>
      </div>

      {/* API Key Drawer (collapsible) */}
      {showKeyDrawer && (
        <div className="p-3 rounded-xl bg-surface-card border border-subtle space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-semibold text-primary flex items-center gap-1.5">
              <Key className="w-4 h-4 text-accent" />
              <span>Enter Anthropic API Key (sk-ant-...)</span>
            </span>
            <span className="text-[10px] text-muted flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-callout-success-fg" />
              <span>Stored only in your browser. No telemetry.</span>
            </span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-3 py-1.5 rounded-lg bg-accent text-on-accent font-semibold text-xs hover:brightness-110 active:scale-[0.98] flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Key</span>
            </button>
            <button
              type="button"
              disabled={testingKey}
              onClick={handleTestConnection}
              className="px-3 py-1.5 rounded-lg bg-surface-sunken border border-subtle hover:border-strong text-secondary font-medium text-xs flex items-center gap-1"
            >
              <span>{testingKey ? 'Testing...' : 'Test Key'}</span>
            </button>
            {hasStoredKey && (
              <button
                type="button"
                onClick={handleForgetKey}
                className="px-3 py-1.5 rounded-lg bg-surface-sunken border border-subtle hover:border-callout-danger-border hover:text-callout-danger-fg text-secondary font-medium text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Forget Key</span>
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            <span>Remember key on this device (persists across browser restarts). Off by default - key is kept only for this session.</span>
          </label>

          {testResult && (
            <div className={`text-[11px] font-medium flex items-center gap-1.5 ${
              testResult.success ? 'text-callout-success-fg' : 'text-callout-danger-fg'
            }`}>
              {testResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>{testResult.msg}</span>
            </div>
          )}
        </div>
      )}

      {/* Target & Scan Context Summary Banner */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-card border border-subtle text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted" />
          <span className="text-secondary">Target:</span>
          <strong className="text-primary">{targetMachine?.name || 'No Target Selected'}</strong>
          <span className="font-mono text-muted tabular-nums">({targetMachine?.ip || 'N/A'})</span>
          <span className="text-muted">·</span>
          <span className="text-secondary">{parsedResults?.ports.length || 0} Open Ports detected</span>
        </div>

        <div className="flex items-center gap-2">
          {isGenerating ? (
            <button
              type="button"
              onClick={handleStopAnalysis}
              className="px-3 py-1.5 rounded-lg bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-[0.98]"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Halt Stream</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={!parsedResults || parsedResults.ports.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-accent text-on-accent font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-[0.98] shadow-sm disabled:opacity-50 disabled:pointer-events-none"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Analyze Scan with Claude</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg text-xs flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stream Output Console Window */}
      <div
        ref={outputContainerRef}
        className="flex-1 p-4 rounded-xl bg-surface-sunken border border-subtle overflow-y-auto font-mono text-xs text-primary leading-relaxed whitespace-pre-wrap select-text relative"
      >
        {aiOutput ? (
          <div>{aiOutput}</div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted p-8 space-y-3 font-sans">
            <div className="w-12 h-12 rounded-2xl bg-surface-card border border-subtle flex items-center justify-center text-muted">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="max-w-md space-y-1">
              <div className="font-semibold text-sm text-primary">Awaiting Recon Telemetry</div>
              <p className="text-xs text-muted">
                Import or paste an Nmap/Rustscan output in the Importer tab, then click &ldquo;Analyze Scan with Claude&rdquo; to synthesize tactical exploit hypotheses and custom attack playbooks.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Tray */}
      {aiOutput && (
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-2 text-muted text-[11px]">
            <Info className="w-3.5 h-3.5" />
            <span>Output generated with {selectedModel}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyIntel}
              className="px-3 py-1.5 rounded-lg bg-surface-card border border-subtle hover:border-strong text-secondary hover:text-primary font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              {copiedIntel ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedIntel ? 'Copied to Clipboard' : 'Copy Full Intel'}</span>
            </button>

            {onApplyToTargetNotes && (
              <button
                type="button"
                onClick={handleApplyToNotes}
                disabled={isTargetFrozen}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors ${
                  appliedNotes
                    ? 'bg-callout-success-bg border border-callout-success-border text-callout-success-fg'
                    : 'bg-accent text-on-accent hover:brightness-110 active:scale-[0.98]'
                }`}
              >
                {appliedNotes ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{appliedNotes ? 'Synced to Target Notes!' : 'Sync Intel to Target Notes'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <AiConsentDialog
        isOpen={!!pendingSend}
        redacted={redactEnabled}
        model={selectedModel}
        systemPrompt={CYBER_TACTICAL_SYSTEM_PROMPT}
        userPrompt={pendingSend?.prompt || ''}
        onCancel={handleConsentCancel}
        onSend={handleConsentSend}
      />
    </div>
  );
};
