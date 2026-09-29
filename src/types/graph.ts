export type AttackEdgeType =
  | 'pivot-ssh'
  | 'pivot-chisel'
  | 'pivot-ligolo'
  | 'pivot-socks5'
  | 'ad-trust-bidirectional'
  | 'ad-trust-parent-child'
  | 'lateral-cred-reuse'
  | 'lateral-pth-winrm'
  | 'domain-admin-path';

export type AttackEdgeStatus = 'potential' | 'compromised';

export interface AttackGraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: AttackEdgeType;
  status: AttackEdgeStatus;
  label?: string;
  port?: number;
  protocol?: string;
  notes?: string;
  createdAt: string;
}

export interface AttackNodePosition {
  x: number;
  y: number;
}

export interface AttackGraphPersistedState {
  graphNodePositions: Record<string, AttackNodePosition>;
  graphEdges: AttackGraphEdge[];
  nodePositions?: Record<string, AttackNodePosition>;
  edges?: AttackGraphEdge[];
}

export interface PivotCommandSet {
  listenerCommand: string;
  clientCommand: string;
  proxychainsSnippet: string;
  verificationCommand: string;
  quickCopyText: string;
}

export type AttackEdgeCategory = 'tunnel' | 'ad-trust' | 'lateral';

export interface AttackEdgeTypeMeta {
  type: AttackEdgeType;
  label: string;
  category: AttackEdgeCategory;
  description: string;
  defaultPort?: number;
  defaultProtocol?: string;
  color: string;
  glowColor: string;
}

export const ATTACK_EDGE_TYPES: readonly AttackEdgeType[] = [
  'pivot-ssh',
  'pivot-chisel',
  'pivot-ligolo',
  'pivot-socks5',
  'ad-trust-bidirectional',
  'ad-trust-parent-child',
  'lateral-cred-reuse',
  'lateral-pth-winrm',
  'domain-admin-path',
] as const;

export const ATTACK_EDGE_META: Record<AttackEdgeType, AttackEdgeTypeMeta> = {
  'pivot-ssh': {
    type: 'pivot-ssh',
    label: 'SSH Dynamic Tunnel',
    category: 'tunnel',
    description: 'Dynamic SOCKS proxy over SSH tunnel (-D)',
    defaultPort: 1080,
    defaultProtocol: 'ssh',
    color: '#10B981', // emerald
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  'pivot-chisel': {
    type: 'pivot-chisel',
    label: 'Chisel Reverse SOCKS',
    category: 'tunnel',
    description: 'HTTP-encapsulated reverse tunnel via Chisel',
    defaultPort: 8000,
    defaultProtocol: 'tcp',
    color: '#06B6D4', // cyan
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  'pivot-ligolo': {
    type: 'pivot-ligolo',
    label: 'Ligolo-ng TUN Pivot',
    category: 'tunnel',
    description: 'High-performance Layer 3 TUN adapter pivot',
    defaultPort: 11601,
    defaultProtocol: 'tcp',
    color: '#3B82F6', // blue
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  'pivot-socks5': {
    type: 'pivot-socks5',
    label: 'SOCKS5 Proxy Hop',
    category: 'tunnel',
    description: 'Generic SOCKS5 dynamic proxy routing hop',
    defaultPort: 1080,
    defaultProtocol: 'socks5',
    color: '#8B5CF6', // purple
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  'ad-trust-bidirectional': {
    type: 'ad-trust-bidirectional',
    label: 'AD Bidirectional Trust',
    category: 'ad-trust',
    description: 'Two-way Active Directory domain trust relationship',
    defaultPort: 88,
    defaultProtocol: 'kerberos',
    color: '#F59E0B', // amber
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  'ad-trust-parent-child': {
    type: 'ad-trust-parent-child',
    label: 'AD Parent-Child Trust',
    category: 'ad-trust',
    description: 'Hierarchical Active Directory forest/domain tree trust',
    defaultPort: 88,
    defaultProtocol: 'kerberos',
    color: '#EC4899', // pink
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  'lateral-cred-reuse': {
    type: 'lateral-cred-reuse',
    label: 'Credential Reuse',
    category: 'lateral',
    description: 'Reused passwords or cleartext tokens across hosts',
    defaultPort: 445,
    defaultProtocol: 'smb',
    color: '#F97316', // orange
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  'lateral-pth-winrm': {
    type: 'lateral-pth-winrm',
    label: 'Pass-The-Hash / WinRM',
    category: 'lateral',
    description: 'NTLM hash relay or pass-the-hash remote execution',
    defaultPort: 5985,
    defaultProtocol: 'winrm',
    color: '#EAB308', // yellow
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  'domain-admin-path': {
    type: 'domain-admin-path',
    label: 'Domain Admin Critical Path',
    category: 'lateral',
    description: 'Critical path to Domain Controller / Domain Admin takeover',
    defaultPort: 389,
    defaultProtocol: 'ldap',
    color: '#EF4444', // red
    glowColor: 'rgba(239, 68, 68, 0.5)',
  },
};
