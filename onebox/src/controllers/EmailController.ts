import { ImapService } from '../services/ImapService.js';
import { ImapAccount } from '../models/ImapAccount.js';
import { Email } from '../models/Email.js';
import type { IdleOptions } from '../types/index.js';

export class EmailController {
  private services: Map<string, ImapService>;

  constructor() {
    this.services = new Map();
  }

  public addAccount(account: ImapAccount): ImapService {
    const service = new ImapService(account);
    
    // Add default error handler to prevent crashes
    service.on('error', (error: Error) => {
      console.error(`[${account.getName()}] Service error:`, error.message);
    });
    
    this.services.set(account.getName(), service);
    return service;
  }

  public getService(accountName: string): ImapService | undefined {
    return this.services.get(accountName);
  }

  public getAllServices(): ImapService[] {
    return Array.from(this.services.values());
  }

  public async connectAll(): Promise<void[]> {
    const services = Array.from(this.services.values());
    return Promise.all(services.map(service => service.connect()));
  }

  public async connectAccount(accountName: string): Promise<void> {
    const service = this.services.get(accountName);
    if (!service) {
      throw new Error(`Account ${accountName} not found`);
    }
    return service.connect();
  }

  public disconnectAll(): void {
    this.services.forEach(service => service.disconnect());
  }

  public disconnectAccount(accountName: string): void {
    const service = this.services.get(accountName);
    if (service) {
      service.disconnect();
    }
  }

  public async listAllMailboxes(): Promise<Map<string, any>> {
    const results = new Map();
    const services = Array.from(this.services.entries());
    
    await Promise.all(
      services.map(async ([name, service]) => {
        try {
          const mailboxes = await service.listMailboxes();
          results.set(name, mailboxes);
        } catch (error) {
          console.error(`[${name}] Error listing mailboxes:`, error);
          results.set(name, null);
        }
      })
    );
    
    return results;
  }

  public async openMailboxForAll(boxName: string, readOnly: boolean = true): Promise<Map<string, any>> {
    const results = new Map();
    const services = Array.from(this.services.entries());
    
    await Promise.all(
      services.map(async ([name, service]) => {
        try {
          const box = await service.openMailbox(boxName, readOnly);
          results.set(name, box);
        } catch (error) {
          console.error(`[${name}] Error opening mailbox:`, error);
          results.set(name, null);
        }
      })
    );
    
    return results;
  }

  public async fetchRecentEmailsFromAll(daysBack: number = 30, boxName: string = 'INBOX'): Promise<Map<string, Email[]>> {
    const results = new Map();
    const services = Array.from(this.services.entries());
    
    await Promise.all(
      services.map(async ([name, service]) => {
        try {
          const emails = await service.fetchRecentEmails(daysBack, boxName);
          results.set(name, emails);
        } catch (error) {
          console.error(`[${name}] Error fetching emails:`, error);
          results.set(name, []);
        }
      })
    );
    
    return results;
  }

  public async fetchEmailsFromAccount(accountName: string, daysBack: number = 30, boxName: string = 'INBOX'): Promise<Email[]> {
    const service = this.services.get(accountName);
    if (!service) {
      throw new Error(`Account ${accountName} not found`);
    }
    return service.fetchRecentEmails(daysBack, boxName);
  }

  public async startIdleOnAll(options: Omit<IdleOptions, 'mailbox'> & { mailbox?: string } = {}): Promise<void> {
    const mailbox = options.mailbox || 'INBOX';
    const services = Array.from(this.services.values());
    
    await Promise.all(
      services.map(service => {
        const idleOptions: IdleOptions = { mailbox };
        if (options.onNewMail) idleOptions.onNewMail = options.onNewMail;
        if (options.onUpdate) idleOptions.onUpdate = options.onUpdate;
        if (options.onExpunge) idleOptions.onExpunge = options.onExpunge;
        return service.startIdle(idleOptions);
      })
    );
  }

  public async startIdleOnAccount(accountName: string, options: IdleOptions): Promise<void> {
    const service = this.services.get(accountName);
    if (!service) {
      throw new Error(`Account ${accountName} not found`);
    }
    return service.startIdle(options);
  }

  public stopIdleOnAll(): void {
    this.services.forEach(service => service.stopIdle());
  }

  public stopIdleOnAccount(accountName: string): void {
    const service = this.services.get(accountName);
    if (service) {
      service.stopIdle();
    }
  }

  public getAccountStatus(accountName: string) {
    const service = this.services.get(accountName);
    if (!service) {
      return null;
    }
    return service.getAccount().getStatus();
  }

  public getAllAccountStatuses(): Map<string, any> {
    const statuses = new Map();
    this.services.forEach((service, name) => {
      statuses.set(name, service.getAccount().getStatus());
    });
    return statuses;
  }
}

