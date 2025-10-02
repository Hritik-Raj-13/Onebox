declare module 'node-imap' {
  import { EventEmitter } from 'events';

  namespace Imap {
    interface Config {
      user: string;
      password: string;
      host: string;
      port: number;
      tls: boolean;
      tlsOptions?: {
        rejectUnauthorized?: boolean;
      };
      authTimeout?: number;
      connTimeout?: number;
      keepalive?: boolean;
    }

    interface Box {
      name: string;
      readOnly: boolean;
      newKeywords: boolean;
      uidvalidity: number;
      uidnext: number;
      flags: string[];
      permFlags: string[];
      persistentUIDs: boolean;
      messages: {
        total: number;
        new: number;
      };
    }

    interface MailBoxes {
      [key: string]: {
        attribs: string[];
        delimiter: string;
        children: MailBoxes | null;
        parent: MailBoxes | null;
      };
    }
  }

  class Imap extends EventEmitter {
    constructor(config: Imap.Config);
    connect(): void;
    end(): void;
    destroy(): void;
    openBox(
      mailboxName: string,
      openReadOnly: boolean,
      callback: (error: Error | null, mailbox: Imap.Box) => void
    ): void;
    getBoxes(callback: (error: Error | null, boxes: Imap.MailBoxes) => void): void;
    search(
      criteria: any[],
      callback: (error: Error | null, results: number[]) => void
    ): void;
    fetch(source: any, options: any): EventEmitter;
  }

  export = Imap;
}

