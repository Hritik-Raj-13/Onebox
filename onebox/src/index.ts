import { EmailController } from './controllers/EmailController.js';
import { ImapAccount } from './models/ImapAccount.js';
import { ConfigLoader } from './config/config.js';
import { Logger } from './utils/logger.js';
import { Formatter } from './utils/formatter.js';

async function main() {
  Logger.section('Starting Multi-Account IMAP Client with IDLE Mode');

  const appConfig = ConfigLoader.getAppConfig();
  const controller = new EmailController();

  try {
    Logger.info(`Loading ${appConfig.accountCount} email account(s)...`);

    for (let i = 1; i <= appConfig.accountCount; i++) {
      const config = ConfigLoader.loadImapConfigWithIdle(i, appConfig.enableIdle);
      const account = new ImapAccount(config, `Account ${i}`);
      controller.addAccount(account);
      Logger.success(`Account ${i} (${config.user}) configured`);
    }

    Logger.section('Connecting to All Accounts');
    await controller.connectAll();
    Logger.success('All accounts connected successfully!');

    Logger.section('Fetching Mailbox Information');
    const mailboxes = await controller.listAllMailboxes();
    
    mailboxes.forEach((boxes: any, accountName: string) => {
      if (boxes) {
        console.log(`[${accountName}] Available mailboxes:`, Object.keys(boxes));
      }
    });

    Logger.section('Opening INBOX for All Accounts');
    const inboxes = await controller.openMailboxForAll('INBOX', true);
    
    inboxes.forEach((inbox: any, accountName: string) => {
      if (inbox) {
        console.log(`[${accountName}] INBOX contains ${inbox.messages.total} messages (${inbox.messages.new} new)`);
      }
    });

    Logger.section(`Fetching Last ${appConfig.defaultDaysBack} Days of Emails`);
    const emailResults = await controller.fetchRecentEmailsFromAll(appConfig.defaultDaysBack);
    
    Logger.section('Email Fetch Summary');
    emailResults.forEach((emails: any, accountName: string) => {
      console.log(`[${accountName}] Retrieved ${emails.length} emails from the last ${appConfig.defaultDaysBack} days`);
      
      if (emails.length > 0) {
        Logger.emailSummary(accountName, emails[0].toJSON());
      }
    });

    if (appConfig.enableIdle) {
      Logger.section('Starting IDLE Mode for Real-Time Email Updates');

      const handleNewMail = (accountName: string) => (count: number) => {
        Logger.newMail(accountName, count);
      };

      await controller.startIdleOnAll({
        mailbox: appConfig.defaultMailbox,
        onNewMail: (count: number) => {
        }
      });

      controller.getAllServices().forEach((service: any) => {
        const accountName = service.getAccount().getName();
        
        service.on('mail', handleNewMail(accountName));
        
        service.on('error', (error: Error) => {
          Logger.error(`[${accountName}] Connection error: ${error.message}`);
          console.log(`[${accountName}] Will attempt to reconnect...`);
        });
        
        service.on('ready', () => {
          Logger.success(`[${accountName}] Reconnected successfully!`);
        });
        
        service.on('close', (hadError: boolean) => {
          if (hadError) {
            Logger.warning(`[${accountName}] Connection closed with error`);
          }
        });
      });

      Logger.section('IDLE Mode Active on All Accounts');
      console.log('Listening for new emails in real-time...');


      setInterval(() => {
        const statuses = controller.getAllAccountStatuses();
        console.log('\n Account Status:');
        statuses.forEach((status: any, name: string) => {
          console.log(Formatter.formatAccountStatus(name, status));
        });
      }, 300000); 

      process.on('SIGINT', () => {
        Logger.section('Shutting Down Gracefully');
        
        controller.stopIdleOnAll();
        
        setTimeout(() => {
          controller.disconnectAll();
          Logger.success('Disconnected from all accounts');
          process.exit(0);
        }, 1000);
      });

    } else {
      Logger.info('IDLE mode is disabled. Disconnecting...');
      controller.disconnectAll();
      Logger.success('All accounts disconnected');
    }

  } catch (error) {
    Logger.section('ERROR OCCURRED');
    Logger.error('An error occurred during execution:', error);
    
    controller.disconnectAll();
    process.exit(1);
  }
}

main();

export { EmailController } from './controllers/EmailController.js';
export { ImapService } from './services/ImapService.js';
export { ImapAccount } from './models/ImapAccount.js';
export { Email } from './models/Email.js';
export { ConfigLoader } from './config/config.js';
export { Logger } from './utils/logger.js';
export { Formatter } from './utils/formatter.js';
export * from './types/index.js';

