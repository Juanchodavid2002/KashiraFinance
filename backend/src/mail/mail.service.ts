import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<number>('SMTP_PORT') ?? 465);
    const secure = this.configService.get<boolean>('SMTP_SECURE') ?? true;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.from =
      this.configService.get<string>('MAIL_FROM') ??
      'KashiraFinance <no-reply@kashirafinance.com>';

    this.transporter =
      host && user && pass
        ? nodemailer.createTransport({
            host,
            port,
            secure,
            auth: { user, pass },
          })
        : null;

    if (!this.transporter) {
      this.logger.warn(
        'SMTP sin configurar (SMTP_USER/SMTP_PASS vacíos): los correos solo se imprimirán en consola.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendPasswordResetCode(
    to: string,
    name: string,
    code: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[DEV] Código de recuperación para ${to}: ${code}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `Código para restablecer tu contraseña — KashiraFinance`,
      html: this.buildResetCodeTemplate(name, code),
      text: `Hola ${name}. Tu código para restablecer la contraseña es ${code}. Expira en 10 minutos. Si no fuiste tú, ignora este mensaje.`,
    });
  }

  private buildResetCodeTemplate(name: string, code: string): string {
    const digits = code
      .split('')
      .map(
        (digit) =>
          `<td align="center" style="padding:0 6px;"><div style="width:48px;height:60px;line-height:60px;background:#0f172a;border-radius:12px;color:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;font-size:30px;font-weight:700;letter-spacing:2px;">${digit}</div></td>`,
      )
      .join('');

    return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#eef2f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;">
            <tr>
              <td style="background:#0f172a;padding:28px 32px;">
                <span style="color:#4ade80;font-size:18px;font-weight:700;text-decoration:none;">&#9632;</span>
                <span style="color:#f8fafc;font-size:18px;font-weight:700;">Kashira</span><span style="color:#4ade80;font-size:18px;font-weight:700;">Finance</span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 8px;">
                <h1 style="margin:0 0 8px;color:#0f172a;font-size:22px;">Restablece tu contrase&ntilde;a</h1>
                <p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">
                  Hola ${this.escapeHtml(name)}, usa el siguiente c&oacute;digo de 6 d&iacute;gitos para continuar. Expira en <strong>10 minutos</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 36px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                  Si no solicitaste este c&oacute;digo, puedes ignorar este correo; tu contrase&ntilde;a actual sigue siendo v&aacute;lida y nadie m&aacute;s podr&aacute; usar este c&oacute;digo.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  &copy; KashiraFinance &middot; Este es un mensaje autom&aacute;tico, no respondas a este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
