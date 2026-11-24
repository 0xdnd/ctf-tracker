import React from 'react';
import { ArrowLeft, ArrowRight, ClipboardCheck, Crosshair, ExternalLink, Eye, EyeOff, FileText, Flag, ListChecks, Maximize2, Pencil, Share2 } from 'lucide-react';
import type { Machine, PipelineStatus } from '../../types';
import { playCyberSound, sanitizeExternalUrl } from '../../utils/helpers';
import { STARTING_POINT_HUB_LABEL, isStartingPointHubUrl } from '../../utils/roomLink';
import { copyShareLink } from '../../utils/shareLink';
import { isPlaceholderIp } from '../../utils/ipInput';
import { STAGE_LABEL, STAGE_ORDER } from '../../utils/pipeline';
import type { OverflowItem } from '../common/OverflowMenu';

const MENU_ICON = 'h-3.5 w-3.5';

export interface TargetMenuHandlers {
  onToggleHint: (e: React.MouseEvent, machineId: string) => void;
  onOpenDetail: (id: string) => void;
  onOpenReport: (id: string) => void;
  onOpenWriteup: (id: string) => void;
  /** Called with the outcome after "Share link" tried to copy. */
  onShareResult: (ok: boolean) => void;
  /** Phone card only (`opts.phone`). */
  onSelectMachine?: (id: string) => void;
  onEngageTarget?: (id: string) => void;
  onSetIp?: (id: string) => void;
  /** Phone card only: when set, the menu offers the next and previous stage. */
  onStatusChange?: (id: string, status: PipelineStatus) => void;
  /** Phone only: when both are set, the menu offers marking or clearing the user and root flags. */
  onToggleUserFlag?: (id: string) => void;
  onToggleRootFlag?: (id: string, hasRoot: boolean) => void;
}

export interface TargetMenuOptions {
  isHintRevealed: boolean;
  soundEnabled: boolean;
  /** The phone card also puts stage moves, Checklist, Engage and Set IP in the menu (the desktop card has buttons for them). */
  phone?: { isActiveTarget: boolean };
  /** False where the surface has no place to show a hint (the phone table); default true. */
  showHint?: boolean;
}

/** The "More actions" menu of a tracker card, shared by the desktop card and the phone card. */
export function buildTargetMenuItems(m: Machine, handlers: TargetMenuHandlers, opts: TargetMenuOptions): OverflowItem[] {
  const { isHintRevealed, soundEnabled, phone, showHint = true } = opts;
  const roomHref = sanitizeExternalUrl(m.roomUrl);

  const stageIdx = STAGE_ORDER.indexOf(m.status);
  const nextStage = stageIdx >= 0 && stageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[stageIdx + 1] : undefined;
  const prevStage = stageIdx > 0 ? STAGE_ORDER[stageIdx - 1] : undefined;
  const { onStatusChange } = handlers;
  const stageItems: OverflowItem[] =
    phone && onStatusChange
      ? [
          ...(nextStage
            ? [{
                id: 'stage-next',
                label: `Move to ${STAGE_LABEL[nextStage]}`,
                ariaLabel: `Move ${m.name} to ${STAGE_LABEL[nextStage]}`,
                icon: <ArrowRight className={MENU_ICON} />,
                onSelect: () => onStatusChange(m.id, nextStage),
              }]
            : []),
          ...(prevStage
            ? [{
                id: 'stage-prev',
                label: `Move back to ${STAGE_LABEL[prevStage]}`,
                ariaLabel: `Move ${m.name} back to ${STAGE_LABEL[prevStage]}`,
                icon: <ArrowLeft className={MENU_ICON} />,
                onSelect: () => onStatusChange(m.id, prevStage),
              }]
            : []),
        ]
      : [];

  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);
  const { onToggleUserFlag, onToggleRootFlag } = handlers;
  const flagItems: OverflowItem[] =
    phone && !m.isActive && onToggleUserFlag && onToggleRootFlag
      ? [
          {
            id: 'flag-user',
            label: hasUser ? 'Clear user flag' : 'Mark user flag',
            ariaLabel: hasUser ? `Clear user flag for ${m.name}` : `Mark user flag captured for ${m.name}`,
            icon: <Flag className={MENU_ICON} />,
            onSelect: () => onToggleUserFlag(m.id),
          },
          {
            id: 'flag-root',
            label: hasRoot ? 'Clear root flag' : 'Mark root flag',
            ariaLabel: hasRoot ? `Clear root flag for ${m.name}` : `Mark root flag captured for ${m.name}`,
            icon: <Flag className={MENU_ICON} />,
            onSelect: () => onToggleRootFlag(m.id, hasRoot),
          },
        ]
      : [];

  const hasIp = Boolean(m.ip) && !isPlaceholderIp(m.ip);
  const phoneItems: OverflowItem[] = phone
    ? [
        {
          id: 'checklist',
          label: 'Checklist',
          ariaLabel: m.isActive ? `Open active target compliance details for ${m.name}` : `Open attack methodology checklist for ${m.name}`,
          icon: <ListChecks className={MENU_ICON} />,
          onSelect: () => handlers.onSelectMachine?.(m.id),
        },
        {
          id: 'engage',
          label: phone.isActiveTarget ? 'Engaged' : 'Engage',
          ariaLabel: phone.isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`,
          icon: <Crosshair className={MENU_ICON} />,
          onSelect: () => handlers.onEngageTarget?.(m.id),
        },
        ...(m.isActive
          ? []
          : [{
              id: 'ip',
              label: hasIp ? 'Change IP' : 'Set IP',
              ariaLabel: hasIp ? `Change IP for ${m.name}` : `Set IP for ${m.name}`,
              icon: <Pencil className={MENU_ICON} />,
              onSelect: () => handlers.onSetIp?.(m.id),
            }]),
      ]
    : [];

  return [
    ...stageItems,
    ...flagItems,
    ...(showHint && m.hint && !m.isActive
      ? [{
          id: 'hint',
          label: isHintRevealed ? 'Hide hint' : 'Peek hint',
          ariaLabel: isHintRevealed ? `Hide intel hint for ${m.name}` : `Peek intel hint for ${m.name}`,
          icon: isHintRevealed ? <EyeOff className={MENU_ICON} /> : <Eye className={MENU_ICON} />,
          onSelect: () => handlers.onToggleHint({ stopPropagation: () => undefined } as React.MouseEvent, m.id),
        }]
      : []),
    ...phoneItems,
    {
      id: 'share',
      label: 'Share link',
      ariaLabel: `Share direct link to ${m.name}`,
      icon: <Share2 className={MENU_ICON} />,
      onSelect: () => {
        void copyShareLink(`/target/${m.id}`).then((ok) => {
          if (ok && soundEnabled) playCyberSound('copy');
          handlers.onShareResult(ok);
        });
      },
    },
    {
      id: 'dossier',
      label: 'Mission dossier',
      ariaLabel: `Open dedicated mission dossier for ${m.name}`,
      icon: <Maximize2 className={MENU_ICON} />,
      onSelect: () => handlers.onOpenDetail(m.id),
    },
    ...(m.isActive
      ? []
      : [
          {
            id: 'report',
            label: 'Pre-report',
            ariaLabel: `Open executive pentest pre-report for ${m.name}`,
            icon: <ClipboardCheck className={MENU_ICON} />,
            onSelect: () => handlers.onOpenReport(m.id),
          },
          {
            id: 'writeup',
            label: 'Writeup studio',
            ariaLabel: `Open writeup studio for ${m.name}`,
            icon: <FileText className={MENU_ICON} />,
            onSelect: () => handlers.onOpenWriteup(m.id),
          },
        ]),
    ...(roomHref
      ? [{
          id: 'room',
          label: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : 'Room link',
          ariaLabel: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : `Open external room link for ${m.name}`,
          icon: <ExternalLink className={MENU_ICON} />,
          onSelect: () => {
            window.open(roomHref, '_blank', 'noopener,noreferrer');
          },
        }]
      : []),
  ];
}
