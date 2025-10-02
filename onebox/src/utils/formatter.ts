import { Email } from '../models/Email.js';

export class Formatter {
  public static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }

  public static formatEmailList(emails: Email[]): any[] {
    return emails.map(email => ({
      uid: email.uid,
      from: email.getFrom(),
      subject: email.getSubject(),
      date: this.formatDate(email.getDate())
    }));
  }

  public static truncate(text: string, length: number = 50): string {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  public static formatAccountStatus(name: string, status: any): string {
    const connected = status.isConnected ? ' Connected' : ' Disconnected';
    const idle = status.isIdling ? ' IDLE Active' : ' IDLE Inactive';
    const mailbox = status.currentMailbox || 'None';
    
    return `${name} ${connected} | ${idle} | Mailbox: ${mailbox}`;
  }
}

