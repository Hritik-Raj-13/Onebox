import type { ImapConfig, ConnectionStatus } from '../types/index.js';

export class ImapAccount {
  private config: ImapConfig;
  private accountName: string;
  private status: ConnectionStatus;

  constructor(config: ImapConfig, accountName: string) {
    this.config = config;
    this.accountName = accountName;
    this.status = {
      isConnected: false,
      isIdling: false,
      currentMailbox: null,
      reconnectAttempts: 0
    };
  }

  public getConfig(): ImapConfig {
    return { ...this.config };
  }

  public getName(): string {
    return this.accountName;
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  public updateStatus(status: Partial<ConnectionStatus>): void {
    this.status = { ...this.status, ...status };
  }

  public isConnected(): boolean {
    return this.status.isConnected;
  }

  public isIdling(): boolean {
    return this.status.isIdling;
  }

  public getCurrentMailbox(): string | null {
    return this.status.currentMailbox;
  }

  public getReconnectAttempts(): number {
    return this.status.reconnectAttempts;
  }

  public toJSON() {
    return {
      accountName: this.accountName,
      user: this.config.user,
      host: this.config.host,
      port: this.config.port,
      status: this.status
    };
  }
}

