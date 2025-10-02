# OneBox - Email Aggregator

An advanced email aggregator with IMAP support built with TypeScript and Node.js.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `onebox` directory with your IMAP credentials:

```env
# IMAP Server Configuration
IMAP_USER=yourEmail
IMAP_PASSWORD=yourAppPassword
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_TLS=true
```

#### For Gmail Users:

 **Note:** You need to use an **App Password**, not your regular Gmail password.

1. Enable 2-Step Verification on your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an App Password for "Mail"
4. Use this 16-character password in your `.env` file

## Running the Application

### Development Mode (with ts-node)

```bash
npm run dev
```

### Build and Run

```bash
npm run build
npm start
```

## Features

### IMAP Client

The `ImapClient` class provides:

- ✅ **Connection Management**: Connect/disconnect from IMAP servers
- ✅ **Event Handling**: Comprehensive event listeners for connection states
- ✅ **Mailbox Operations**: List and open mailboxes
- ✅ **Error Handling**: Robust error handling with detailed logging
- ✅ **Environment Configuration**: Secure credential management via `.env`

### Example Usage

```typescript
import ImapClient from './imapClient';

async function example() {
  const client = new ImapClient();

  try {
    // Connect to IMAP server
    await client.connect();

    // List all mailboxes
    const mailboxes = await client.listMailboxes();
    console.log('Available mailboxes:', Object.keys(mailboxes));

    // Open INBOX
    const inbox = await client.openMailbox('INBOX', true);
    console.log(`INBOX contains ${inbox.messages.total} messages`);

    // Disconnect
    client.disconnect();
  } catch (error) {
    console.error('Error:', error);
    client.disconnect();
  }
}
```


## Scripts

- `npm run dev` - Run in development mode with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript



### Common Issues

- **Missing .env file**: Create `.env` with your IMAP credentials
- **TypeScript errors**: Run `npm install` to ensure all dependencies are installed
- **Port blocked**: Ensure port 993 (IMAP SSL) is not blocked by your firewall
