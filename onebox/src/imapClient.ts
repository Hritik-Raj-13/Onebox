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

