import { useCtfStore } from '../store/useCtfStore';
import { useToastStore } from '../store/useToastStore';
import { playCyberSound, safeCopyToClipboard } from './helpers';
import type { CptsNoteEntry } from './obsidianManualUtils';

type NoteNames = Pick<CptsNoteEntry, 'title'> & Partial<Pick<CptsNoteEntry, 'titleEn'>>;

export function copyNoteMarkdown(markdown: string, soundEnabled: boolean): void {
  safeCopyToClipboard(markdown);
  if (soundEnabled) playCyberSound('copy');
  useToastStore.getState().addToast({ type: 'success', message: 'Copied note markdown to clipboard' });
}

export function downloadNoteMarkdown(n: NoteNames, markdown: string, soundEnabled: boolean): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeTitle = (n.titleEn || n.title || 'note').replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (soundEnabled) playCyberSound('root');
  useToastStore.getState().addToast({ type: 'success', message: 'Downloaded note as .md file' });
}

/**
 * Syncs the note into the engaged target's writeup and opens the report generator. With no target
 * at all it downloads the markdown instead; `n` only names that file.
 */
export function sendNoteToReport(markdown: string, soundEnabled: boolean, n: NoteNames = { title: 'note' }): void {
  const st = useCtfStore.getState();
  const targetId = st.activeTargetId || st.machines[0]?.id;
  if (targetId) {
    st.updateMachine(targetId, { writeupMarkdown: markdown });
    st.setReportMachineId(targetId);
    if (soundEnabled) playCyberSound('root');
    useToastStore.getState().addToast({
      type: 'success',
      message: 'Synced note to target writeup & opened Pentest Report generator',
    });
  } else {
    downloadNoteMarkdown(n, markdown, soundEnabled);
  }
}
