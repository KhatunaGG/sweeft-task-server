import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailSenderService {
  constructor(private emailService: MailerService) {}

  async sendEmailText(to: string, subject: string, text: string) {
    try {
      const options = {
        from: 'Sweeft-task <khatunaggg12345@gmail.com>',
        to,
        subject,
        text,
      };
      const info = await this.emailService.sendMail(options);
      return info;
    } catch (e) {
      console.log(e);
    }
  }

  // async sendEmailHtml(to: string, subject: string) {
  //   const html = `
  //   <h1>Hello!</h1>
  //   `;
  //   const options = {
  //     from: 'Link-sharing-app <khatunaggg12345@gmail.com>',
  //     to,
  //     subject,
  //     html,
  //   };
  //   const info = await this.emailService.sendMail(options);
  //   console.log(info, 'Email sent successfully');
  // }

  async sendValidationEmail(
    email: string,
    companyName: string,
    validationLink: string,
  ) {
    const html = `
    <h1>Welcome to our platform, ${companyName}!</h1>
    <p>Thank you for registering. Please verify your email by clicking the link below:</p>
    <p><a href="${validationLink}">Verify Email</a></p>
    <p>This link will expire in 3 minutes.</p>
    <p>If you did not register for an account, please ignore this email.</p>
  `;
    try {
      const options = {
        from: 'Sweeft-task <khatunaggg12345@gmail.com>',
        to: email,
        html,
      };

      await this.emailService.sendMail(options);
      return true;
    } catch (e) {
      console.log('Error sending validation email:', e);
      throw new Error('Failed to send verification email');
    }
  }
}
