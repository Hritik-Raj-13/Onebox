export class Logger {
  
  public static separator(char: string = '=', length: number = 60): string {
    return char.repeat(length);
  }

  public static section(title: string): void {
    console.log('\n' + this.separator());
    console.log(title);
    console.log(this.separator() + '\n');
  }

  public static info(message: string): void {
    console.log(`ℹ  ${message}`);
  }

  public static success(message: string): void {
    console.log(` ${message}`);
  }

  public static error(message: string, error?: any): void {
    console.error(` ${message}`);
    if (error) {
      console.error(error);
    }
  }

  public static warning(message: string): void {
    console.warn(`  ${message}`);
  }

  public static newMail(accountName: string, count: number): void {
    console.log(`\n [${accountName}] New email(s) received! Count: ${count}`);
  }

  public static emailSummary(accountName: string, email: any): void {
    console.log(`\n[${accountName}] Email Summary:`);
    console.log(`  From: ${email.from || 'N/A'}`);
    console.log(`  To: ${email.to || 'N/A'}`);
    console.log(`  Subject: ${email.subject || 'N/A'}`);
    console.log(`  Date: ${email.date || 'N/A'}`);
  }

  public static table(data: any): void {
    console.table(data);
  }
}

