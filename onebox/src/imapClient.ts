import Imap from 'node-imap';
import dotenv from 'dotenv';

dotenv.config();

interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
  };
}

class ImapClient {
  private imap: Imap;
  private isConnected: boolean = false;
  private accountName: string;

  constructor(config: ImapConfig, accountName: string = 'Account') {
    this.accountName = accountName;
    
    // Validate required configuration
    if (!config.user || !config.password) {
      throw new Error(`${accountName}: IMAP user and password must be provided`);
    }

    // Initialize IMAP connection
    this.imap = new Imap(config);

    // Set up event listeners
    this.setupEventListeners();
  }


  private setupEventListeners(): void {
    this.imap.once('ready', () => {
      console.log(`[${this.accountName}] IMAP connection established successfully`);
      this.isConnected = true;
    });

    this.imap.once('error', (err: Error) => {
      console.error(`[${this.accountName}] IMAP connection error:`, err.message);
      this.isConnected = false;
    });

    this.imap.once('end', () => {
      console.log(`[${this.accountName}] IMAP connection ended`);
      this.isConnected = false;
    });

    this.imap.on('close', (hadError: boolean) => {
      if (hadError) {
        console.log(`[${this.accountName}] IMAP connection closed with error`);
      } else {
        console.log(`[${this.accountName}] IMAP connection closed normally`);
      }
      this.isConnected = false;
    });

    this.imap.on('alert', (message: string) => {
      console.log(`[${this.accountName}] IMAP Alert:`, message);
    });
  }

 
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        console.log(`[${this.accountName}] Already connected to IMAP server`);
        return resolve();
      }

      // Set up one-time listeners for this connection attempt
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

      console.log(`[${this.accountName}] Connecting to IMAP server...`);
      this.imap.connect();
    });
  }


  public disconnect(): void {
    if (this.isConnected) {
      this.imap.end();
    }
  }


  public getConnection(): Imap {
    return this.imap;
  }

  
  public isConnectionActive(): boolean {
    return this.isConnected;
  }


  public listMailboxes(): Promise<Imap.MailBoxes> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
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


  public openMailbox(boxName: string, readOnly: boolean = false): Promise<Imap.Box> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(boxName, readOnly, (err: Error | null, box: Imap.Box) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[${this.accountName}] Opened mailbox: ${boxName}`);
          resolve(box);
        }
      });
    });
  }
  

  public getAccountName(): string {
    return this.accountName;
  }

  public searchEmailsByDate(boxName: string = 'INBOX', daysBack: number = 30): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isConnected) {
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

        console.log(`[${this.accountName}] Searching for emails since ${formattedDate} (last ${daysBack} days)...`);

        this.imap.search([['SINCE', searchDate]], (err: Error | null, results: number[]) => {
          if (err) {
            console.error(`[${this.accountName}] Search error:`, err.message);
            reject(err);
          } else {
            console.log(`[${this.accountName}] Found ${results.length} emails from the last ${daysBack} days`);
            resolve(results);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }


  
  public fetchEmails(uids: number[], boxName: string = 'INBOX'): Promise<any[]> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isConnected) {
          return reject(new Error('Not connected to IMAP server'));
        }

        if (!uids || uids.length === 0) {
          console.log(`[${this.accountName}] No emails to fetch`);
          return resolve([]);
        }

        // Open the mailbox if not already open
        await this.openMailbox(boxName, true);

        const emails: any[] = [];
        
        // Fetch email headers and body
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
                // Parse headers
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
          console.error(`[${this.accountName}] Fetch error:`, err.message);
          reject(err);
        });

        fetch.once('end', () => {
          console.log(`[${this.accountName}] Successfully fetched ${emails.length} emails`);
          resolve(emails);
        });
      } catch (error) {
        reject(error);
      }
    });
  }


  
  public async fetchRecentEmails(daysBack: number = 30, boxName: string = 'INBOX'): Promise<any[]> {
    try {
      console.log(`[${this.accountName}] Fetching emails from last ${daysBack} days...`);
      
      // Search for emails in the date range
      const uids = await this.searchEmailsByDate(boxName, daysBack);
      
      if (uids.length === 0) {
        console.log(`[${this.accountName}] No emails found in the last ${daysBack} days`);
        return [];
      }

      // Fetch the email details
      const emails = await this.fetchEmails(uids, boxName);
      
      return emails;
    } catch (error) {
      console.error(`[${this.accountName}] Error fetching recent emails:`, error);
      throw error;
    }
  }
}

function createImapConfig(accountNumber: number): ImapConfig {
  const suffix = `_${accountNumber}`;
  return {
    user: process.env[`IMAP_USER${suffix}`] || '',
    password: process.env[`IMAP_PASSWORD${suffix}`] || '',
    host: process.env[`IMAP_HOST${suffix}`] || 'imap.gmail.com',
    port: parseInt(process.env[`IMAP_PORT${suffix}`] || '993'),
    tls: process.env[`IMAP_TLS${suffix}`] !== 'false', // Default to true
    tlsOptions: {
      rejectUnauthorized: false, // Set to true in production with valid certificates
    },
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Starting Two-Account IMAP Client');
  console.log('='.repeat(60));

  const config1 = createImapConfig(1);
  const config2 = createImapConfig(2);

  const client1 = new ImapClient(config1, 'Account 1');
  const client2 = new ImapClient(config2, 'Account 2');

  try {
    console.log('\nConnecting to both accounts...\n');
    await Promise.all([
      client1.connect(),
      client2.connect()
    ]);

    console.log('\n' + '='.repeat(60));
    console.log('Both accounts connected successfully!');
    console.log('='.repeat(60) + '\n');

    console.log('Fetching mailboxes from both accounts...\n');
    const [mailboxes1, mailboxes2] = await Promise.all([
      client1.listMailboxes(),
      client2.listMailboxes()
    ]);

    console.log(`[Account 1] Available mailboxes:`, Object.keys(mailboxes1));
    console.log(`[Account 2] Available mailboxes:`, Object.keys(mailboxes2));

    console.log('\nOpening INBOX for both accounts...\n');
    const [inbox1, inbox2] = await Promise.all([
      client1.openMailbox('INBOX', true),
      client2.openMailbox('INBOX', true)
    ]);

    console.log(`[Account 1] INBOX contains ${inbox1.messages.total} messages`);
    console.log(`[Account 2] INBOX contains ${inbox2.messages.total} messages`);

    // Fetch last 30 days of emails from both accounts
    console.log('\n' + '='.repeat(60));
    console.log('Fetching last 30 days of emails from both accounts...');
    console.log('='.repeat(60) + '\n');

    const [emails1, emails2] = await Promise.all([
      client1.fetchRecentEmails(30, 'INBOX'),
      client2.fetchRecentEmails(30, 'INBOX')
    ]);

    console.log('\n' + '='.repeat(60));
    console.log('Email Fetch Summary:');
    console.log('='.repeat(60));
    console.log(`[Account 1] Retrieved ${emails1.length} emails from the last 30 days`);
    console.log(`[Account 2] Retrieved ${emails2.length} emails from the last 30 days`);

    // Display sample email details (first email from each account)
    if (emails1.length > 0) {
      console.log('\n[Account 1] First Email:');
      console.log(`  From: ${emails1[0].headers.from || 'N/A'}`);
      console.log(`  To: ${emails1[0].headers.to || 'N/A'}`);
      console.log(`  Subject: ${emails1[0].headers.subject || 'N/A'}`);
      console.log(`  Date: ${emails1[0].headers.date || 'N/A'}`);
    }

    if (emails2.length > 0) {
      console.log('\n[Account 2] First Email:');
      console.log(`  From: ${emails2[0].headers.from || 'N/A'}`);
      console.log(`  To: ${emails2[0].headers.to || 'N/A'}`);
      console.log(`  Subject: ${emails2[0].headers.subject || 'N/A'}`);
      console.log(`  Date: ${emails2[0].headers.date || 'N/A'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Operation completed successfully!');
    console.log('='.repeat(60));

    console.log('\nDisconnecting from both accounts...\n');
    client1.disconnect();
    client2.disconnect();
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('ERROR OCCURRED:');
    console.error('='.repeat(60));
    console.error(error);
    console.error('='.repeat(60) + '\n');
    
    client1.disconnect();
    client2.disconnect();
    process.exit(1);
  }
}

main();

export default ImapClient;
export type { ImapConfig };

