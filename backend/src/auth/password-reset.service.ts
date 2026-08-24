import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHmac, randomInt } from 'node:crypto';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';

const BCRYPT_SALT_ROUNDS = 12;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export const GENERIC_RESET_MESSAGE =
  'Si el correo está registrado, te enviamos un código para restablecer la contraseña. Revisa tu bandeja de entrada.';
const PASSWORD_UPDATED_MESSAGE =
  'Tu contraseña se actualizó correctamente. Ya puedes iniciar sesión.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async requestReset(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    await this.prisma.passwordResetCode.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const code = randomInt(100000, 1000000).toString();

    await this.prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: this.hashCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });

    try {
      await this.mailService.sendPasswordResetCode(user.email, user.name, code);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de recuperación a ${user.email}`,
        error,
      );
    }

    return { message: GENERIC_RESET_MESSAGE };
  }

  verifyCode(dto: VerifyResetCodeDto): Promise<{ message: string }> {
    return this.assertValidCode(dto.email.trim().toLowerCase(), dto.code).then(
      () => ({
        message: 'Código verificado correctamente.',
      }),
    );
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const record = await this.assertValidCode(normalizedEmail, dto.code);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return { message: PASSWORD_UPDATED_MESSAGE };
  }

  private async assertValidCode(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new BadRequestException('El código es inválido o ha expirado');
    }

    const record = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(
        'No hay un código activo. Solicita uno nuevo.',
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un nuevo código.',
      );
    }

    const now = Date.now();

    if (record.expiresAt.getTime() < now) {
      throw new BadRequestException(
        'El código ha expirado. Solicita uno nuevo.',
      );
    }

    const matches = record.codeHash === this.hashCode(code);

    if (matches) {
      return record;
    }

    const attempts = record.attempts + 1;
    await this.prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { attempts },
    });

    if (attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Demasiados intentos fallidos. Solicita un nuevo código.',
      );
    }

    throw new BadRequestException(
      `Código incorrecto. Te quedan ${MAX_ATTEMPTS - attempts} intento(s).`,
    );
  }

  private hashCode(code: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret).update(code).digest('hex');
  }
}
