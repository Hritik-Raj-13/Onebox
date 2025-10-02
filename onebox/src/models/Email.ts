import type { EmailMessage, EmailHeaders } from '../types/index.js';

export class Email {
  public seqno: number;
  public uid: number;
  public headers: EmailHeaders;
  public body: string;
  public attributes?: any;

  constructor(data: EmailMessage) {
    this.seqno = data.seqno;
    this.uid = data.uid;
    this.headers = data.headers;
    this.body = data.body;
    this.attributes = data.attributes;
  }

  public getFrom(): string {
    return this.headers.from || 'Unknown';
  }

  public getTo(): string {
    return this.headers.to || 'Unknown';
  }

  public getSubject(): string {
    return this.headers.subject || '(No Subject)';
  }

  public getDate(): string {
    return this.headers.date || 'Unknown';
  }

  public getBodyPreview(length: number = 100): string {
    return this.body.substring(0, length) + (this.body.length > length ? '...' : '');
  }

  public toJSON() {
    return {
      seqno: this.seqno,
      uid: this.uid,
      from: this.getFrom(),
      to: this.getTo(),
      subject: this.getSubject(),
      date: this.getDate(),
      bodyPreview: this.getBodyPreview()
    };
  }
}

