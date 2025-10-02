import dotenv from 'dotenv';
import type { ImapConfig } from '../types/index.js';

dotenv.config();

export class ConfigLoader {
  
  public static loadImapConfig(accountNumber: number): ImapConfig {
    const suffix = `_${accountNumber}`;
    
    const user = process.env[`IMAP_USER${suffix}`] || '';
    const password = process.env[`IMAP_PASSWORD${suffix}`] || '';
    
    if (!user || !password) {
      throw new Error(`Missing IMAP credentials for account ${accountNumber}. Please check your .env file.`);
    }

    return {
      user,
      password,
      host: process.env[`IMAP_HOST${suffix}`] || 'imap.gmail.com',
      port: parseInt(process.env[`IMAP_PORT${suffix}`] || '993'),
      tls: process.env[`IMAP_TLS${suffix}`] !== 'false',
      tlsOptions: {
        rejectUnauthorized: process.env[`IMAP_REJECT_UNAUTHORIZED${suffix}`] === 'true',
      }
    };
  }

  public static loadImapConfigWithIdle(accountNumber: number, enableIdle: boolean = true): ImapConfig {
    const config = this.loadImapConfig(accountNumber);
    
    if (enableIdle) {
      return {
        ...config,
        keepalive: {
          interval: parseInt(process.env.IMAP_KEEPALIVE_INTERVAL || '10000'),
          idleInterval: parseInt(process.env.IMAP_IDLE_INTERVAL || '300000'),
          forceNoop: process.env.IMAP_FORCE_NOOP !== 'false'
        }
      };
    }
    
    return config;
  }

  public static getAccountCount(): number {
    const count = parseInt(process.env.IMAP_ACCOUNT_COUNT || '2');
    return count;
  }

  public static getAppConfig() {
    return {
      accountCount: this.getAccountCount(),
      defaultMailbox: process.env.DEFAULT_MAILBOX || 'INBOX',
      defaultDaysBack: parseInt(process.env.DEFAULT_DAYS_BACK || '30'),
      enableIdle: process.env.ENABLE_IDLE !== 'false',
      maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5'),
      reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '5000')
    };
  }
}

