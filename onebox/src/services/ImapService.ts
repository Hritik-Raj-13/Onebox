import Imap from 'node-imap';
import type { ImapConfig, EmailMessage, MailboxInfo, IdleOptions } from '../types/index.js';
import { ImapAccount } from '../models/ImapAccount.js';
import { Email } from '../models/Email.js';
import { EventEmitter } from 'events';

export class ImapService extends EventEmitter {
  private imap: Imap;
  private account: ImapAccount;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 5000;
  private onNewMailCallback?: (count: number) => void;

  constructor(account: ImapAccount) {
    super();
    this.account = account;
    this.imap = this.createImapConnection(account.getConfig());
    this.setupEventListeners();
  }

  private createImapConnection(config: ImapConfig): Imap {
    const extendedConfig: any = {
      ...config,
      keepalive: config.keepalive || {
        interval: 10000,      
        idleInterval: 300000, 
        forceNoop: true        
      }
    };
    return new Imap(extendedConfig);
  }

  private setupEventListeners(): void {
    this.imap.once('ready', () => {
      console.log(`[${this.account.getName()}] IMAP connection established successfully`);
      this.account.updateStatus({ 
        isConnected: true, 
        reconnectAttempts: 0 
      });
      this.emit('ready');
    });

    this.imap.once('error', (err: Error) => {
      console.error(`[${this.account.getName()}] IMAP connection error:`, err.message);
      this.account.updateStatus({ 
        isConnected: false, 
        isIdling: false 
      });
      
      setImmediate(() => {
        this.emit('error', err);
      });
      
      this.handleReconnection();
    });

    this.imap.once('end', () => {
      console.log(`[${this.account.getName()}] IMAP connection ended`);
      this.account.updateStatus({ 
        isConnected: false, 
        isIdling: false 
      });
      
      setImmediate(() => {
        this.emit('end');
      });
      
      this.handleReconnection();
    });

    this.imap.on('close', (hadError: boolean) => {
      const message = hadError ? 'closed with error' : 'closed normally';
      console.log(`[${this.account.getName()}] IMAP connection ${message}`);
      this.account.updateStatus({ 
        isConnected: false, 
        isIdling: false 
      });
      this.emit('close', hadError);
    });

    this.imap.on('alert', (message: string) => {
      console.log(`[${this.account.getName()}] IMAP Alert:`, message);
      this.emit('alert', message);
    });

    
    this.imap.on('mail', (count: number) => {
      this.emit('mail', count);
      if (this.onNewMailCallback) {
        this.onNewMailCallback(count);
      }
    });

    this.imap.on('update', (seqno: number, info: any) => {
      console.log(`[${this.account.getName()}] Mail update - SeqNo: ${seqno}`);
      this.emit('update', seqno, info);
    });

    this.imap.on('expunge', (seqno: number) => {
      console.log(`[${this.account.getName()}] Mail deleted - SeqNo: ${seqno}`);
      this.emit('expunge', seqno);
    });
  }

 
  private handleReconnection(): void {
    const attempts = this.account.getReconnectAttempts();
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[${this.account.getName()}] Max reconnection attempts reached. Giving up.`);
      return;
    }

    const newAttempts = attempts + 1;
    this.account.updateStatus({ reconnectAttempts: newAttempts });
    const delay = this.reconnectDelay * newAttempts;
    
    console.log(`[${this.account.getName()}] Attempting to reconnect in ${delay/1000} seconds... (Attempt ${newAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        this.imap = this.createImapConnection(this.account.getConfig());
        this.setupEventListeners();
        
        await this.connect();
        
        const currentMailbox = this.account.getCurrentMailbox();
        if (currentMailbox) {
          console.log(`[${this.account.getName()}] Restoring IDLE mode on ${currentMailbox}...`);
          await this.startIdle({ mailbox: currentMailbox });
        }
      } catch (error) {
        console.error(`[${this.account.getName()}] Reconnection failed:`, error);
      }
    }, delay);
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.account.isConnected()) {
        console.log(`[${this.account.getName()}] Already connected to IMAP server`);
        return resolve();
      }

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      const cleanup = () => {
        this.imap.removeListener('ready', onReady);
        this.imap.removeListener('error', onError);
      };

      this.imap.once('ready', onReady);
      this.imap.once('error', onError);

      console.log(`[${this.account.getName()}] Connecting to IMAP server...`);
      this.imap.connect();
    });
  }

  public disconnect(): void {
    this.maxReconnectAttempts = 0; 
    if (this.account.isIdling()) {
      this.stopIdle();
    }
    if (this.account.isConnected()) {
      this.imap.end();
    }
  }

  public getConnection(): Imap {
    return this.imap;
  }

  public listMailboxes(): Promise<Imap.MailBoxes> {
    return new Promise((resolve, reject) => {
      if (!this.account.isConnected()) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.getBoxes((err: Error | null, boxes: Imap.MailBoxes) => {
        if (err) {
          reject(err);
        } else {
          resolve(boxes);
        }
      });
    });
  }

  public openMailbox(boxName: string, readOnly: boolean = false): Promise<MailboxInfo> {
    return new Promise((resolve, reject) => {
      if (!this.account.isConnected()) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(boxName, readOnly, (err: Error | null, box: Imap.Box) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[${this.account.getName()}] Opened mailbox: ${boxName}`);
          resolve(box as MailboxInfo);
        }
      });
    });
  }

  public searchEmailsByDate(boxName: string = 'INBOX', daysBack: number = 30): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.account.isConnected()) {
          return reject(new Error('Not connected to IMAP server'));
        }

        await this.openMailbox(boxName, true);

        const searchDate = new Date();
        searchDate.setDate(searchDate.getDate() - daysBack);
        
        const day = searchDate.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[searchDate.getMonth()];
        const year = searchDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        console.log(`[${this.account.getName()}] Searching for emails since ${formattedDate} (last ${daysBack} days)...`);

        this.imap.search([['SINCE', searchDate]], (err: Error | null, results: number[]) => {
          if (err) {
            console.error(`[${this.account.getName()}] Search error:`, err.message);
            reject(err);
          } else {
            console.log(`[${this.account.getName()}] Found ${results.length} emails from the last ${daysBack} days`);
            resolve(results);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public fetchEmails(uids: number[], boxName: string = 'INBOX'): Promise<Email[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.account.isConnected()) {
          return reject(new Error('Not connected to IMAP server'));
        }

        if (!uids || uids.length === 0) {
          console.log(`[${this.account.getName()}] No emails to fetch`);
          return resolve([]);
        }

        await this.openMailbox(boxName, true);

        const emails: EmailMessage[] = [];
        
        const fetch = this.imap.fetch(uids, {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true
        });

        fetch.on('message', (msg: any, seqno: number) => {
          const emailData: any = {
            seqno,
            headers: {},
            body: ''
          };

          msg.on('body', (stream: NodeJS.ReadableStream, info: any) => {
            let buffer = '';
            stream.on('data', (chunk: Buffer) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
              if (info.which === 'TEXT') {
                emailData.body = buffer;
              } else {
                const lines = buffer.split('\r\n');
                lines.forEach(line => {
                  const match = line.match(/^([^:]+):\s*(.+)$/);
                  if (match && match[1] && match[2]) {
                    const key = match[1].toLowerCase();
                    emailData.headers[key] = match[2];
                  }
                });
              }
            });
          });

          msg.once('attributes', (attrs: any) => {
            emailData.attributes = attrs;
            emailData.uid = attrs.uid;
          });

          msg.once('end', () => {
            emails.push(emailData);
          });
        });

        fetch.once('error', (err: Error) => {
          console.error(`[${this.account.getName()}] Fetch error:`, err.message);
          reject(err);
        });

        fetch.once('end', () => {
          console.log(`[${this.account.getName()}] Successfully fetched ${emails.length} emails`);
          const emailModels = emails.map(data => new Email(data));
          resolve(emailModels);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async fetchRecentEmails(daysBack: number = 30, boxName: string = 'INBOX'): Promise<Email[]> {
    try {
      console.log(`[${this.account.getName()}] Fetching emails from last ${daysBack} days...`);
      
      const uids = await this.searchEmailsByDate(boxName, daysBack);
      
      if (uids.length === 0) {
        console.log(`[${this.account.getName()}] No emails found in the last ${daysBack} days`);
        return [];
      }

      const emails = await this.fetchEmails(uids, boxName);
      
      return emails;
    } catch (error) {
      console.error(`[${this.account.getName()}] Error fetching recent emails:`, error);
      throw error;
    }
  }

 
  public async startIdle(options: IdleOptions): Promise<void> {
    try {
      if (!this.account.isConnected()) {
        throw new Error('Not connected to IMAP server');
      }

      if (this.account.isIdling()) {
        console.log(`[${this.account.getName()}] Already in IDLE mode on ${this.account.getCurrentMailbox()}`);
        return;
      }

      console.log(`[${this.account.getName()}] Starting IDLE mode on ${options.mailbox}...`);
      
      await this.openMailbox(options.mailbox, true);
      this.account.updateStatus({ 
        currentMailbox: options.mailbox,
        isIdling: true 
      });
      
      if (options.onNewMail) {
        this.onNewMailCallback = options.onNewMail;
      }

      console.log(`[${this.account.getName()}] IDLE mode active - listening for new emails...`);
      console.log(`[${this.account.getName()}] Connection will persist and notify on new mail via 'mail' event`);
    } catch (error) {
      console.error(`[${this.account.getName()}] Failed to start IDLE mode:`, error);
      this.account.updateStatus({ isIdling: false });
      throw error;
    }
  }

   
  public stopIdle(): void {
    if (this.account.isIdling()) {
      console.log(`[${this.account.getName()}] Stopping IDLE mode...`);
      this.account.updateStatus({ 
        isIdling: false, 
        currentMailbox: null 
      });
    }
  }

  public getAccount(): ImapAccount {
    return this.account;
  }
}

