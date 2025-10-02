# OneBox - Email Aggregator

An advanced email aggregator with IMAP support built with TypeScript and Node.js, following a structured layered architecture pattern.

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

## Architecture

OneBox follows a **layered architecture** with clear separation of concerns:

```
src/
├── types/          # TypeScript type definitions
├── models/         # Domain models (Email, ImapAccount)
├── services/       # Business logic (ImapService)
├── controllers/    # Orchestration (EmailController)
├── config/         # Configuration management
└── utils/          # Helper functions (Logger, Formatter)
```


## Features
### Core Capabilities

The application provides:

- ✅ **Connection Management**: Connect/disconnect from IMAP servers
- ✅ **Event Handling**: Comprehensive event listeners for connection states
- ✅ **Mailbox Operations**: List and open mailboxes
- ✅ **Email Fetching**: Fetch emails from the last 30 days (or custom date range)
- ✅ **Date-based Search**: Search for emails within specific date ranges
- ✅ **Error Handling**: Robust error handling with detailed logging
- ✅ **Environment Configuration**: Secure credential management via `.env`
- ✅ **Real-Time Updates (IDLE Mode)**: Persistent IMAP connections for instant email notifications
- ✅ **Auto-Reconnection**: Automatic reconnection with exponential backoff on connection failures
- ✅ **Multi-Account Support**: Manage multiple email accounts simultaneously





## Real-Time Email Updates with IDLE Mode

The application now supports **persistent IMAP connections** with IDLE mode for real-time email notifications. This means:

- **Automatic keepalive** - connections stay open and reconnect automatically
- **Event-driven architecture** - react to new emails as they arrive

### How It Works

When you run the application, it:
1. Connects to both configured email accounts
2. Opens the INBOX on each account
3. Enters IDLE mode to listen for new emails
4. Triggers a callback whenever new mail arrives
5. Automatically handles reconnections if the connection drops

### Testing Real-Time Updates

To test the IDLE mode:
1. Run the application: `npm run dev`
2. Send a test email to one of your configured accounts
3. Watch the console for instant notifications like:
   ```
   [Account 1]  New mail detected! Count: 1
    [Account 1] New email(s) received! Count: 1
   ```

## Scripts

- `npm run dev` - Run in development mode with real-time monitoring
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript



### Common Issues

- **Missing .env file**: Create `.env` with your IMAP credentials
- **TypeScript errors**: Run `npm install` to ensure all dependencies are installed
- **Port blocked**: Ensure port 993 (IMAP SSL) is not blocked by your firewall
- **IDLE timeout**: Some servers (like Gmail) may disconnect after ~29 minutes. The client automatically reconnects and resumes IDLE mode.
