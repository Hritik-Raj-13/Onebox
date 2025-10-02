// Type definitions for the IMAP Email Client

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
  keepalive?: boolean | {
    interval: number;
    idleInterval: number;
    forceNoop: boolean;
  };
}

export interface EmailHeaders {
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  [key: string]: string | undefined;
}

export interface EmailMessage {
  seqno: number;
  uid: number;
  headers: EmailHeaders;
  body: string;
  attributes?: any;
}

export interface MailboxInfo {
  name: string;
  readOnly: boolean;
  newKeywords: boolean;
  uidvalidity: number;
  uidnext: number;
  flags: string[];
  permFlags: string[];
  persistentUIDs: boolean;
  messages: {
    total: number;
    new: number;
  };
}

export interface ConnectionStatus {
  isConnected: boolean;
  isIdling: boolean;
  currentMailbox: string | null;
  reconnectAttempts: number;
}

export interface IdleOptions {
  mailbox: string;
  onNewMail?: (count: number) => void;
  onUpdate?: (seqno: number, info: any) => void;
  onExpunge?: (seqno: number) => void;
}

export interface SearchCriteria {
  since?: Date;
  before?: Date;
  from?: string;
  to?: string;
  subject?: string;
  unseen?: boolean;
}

export interface FetchOptions {
  bodies?: string[];
  struct?: boolean;
  markSeen?: boolean;
}

export type ConnectionEventType = 'ready' | 'error' | 'end' | 'close' | 'mail' | 'update' | 'expunge' | 'alert';

