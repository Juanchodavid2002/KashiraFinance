import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnvelopeFrequency, PaymentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContributeEnvelopeDto } from './dto/contribute-envelope.dto';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { SpendEnvelopeDto } from './dto/spend-envelope.dto';
import { UpdateEnvelopeDto } from './dto/update-envelope.dto';

const ENVELOPE_SELECT = {
  id: true,
  name: true,
  frequency: true,
  dayOfMonth: true,
  amount: true,
  balance: true,
  lastRecurredAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} as const;

const MOVEMENT_SELECT = {
  id: true,
  type: true,
  amount: true,
  notes: true,
  expenseId: true,
  createdAt: true,
  updatedAt: true,
} as const;

type EnvelopeLike = {
  id: string;
  frequency: EnvelopeFrequency;
  dayOfMonth: number;
  amount: Prisma.Decimal | string | number;
  balance: Prisma.Decimal | string | number;
  lastRecurredAt: Date | null;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ENVELOPE_CATEGORY = 'Sobres';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class EnvelopesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const envelopes = await this.getOwned(userId);

    await this.applyRecurrences(envelopes, new Date());

    return this.prisma.envelope.findMany({
      where: { id: { in: envelopes.map((e) => e.id) } },
      orderBy: [{ name: 'asc' }],
      select: ENVELOPE_SELECT,
    });
  }

  async getById(userId: string, id: string) {
    const envelope = await this.findOwned(userId, id);

    await this.applyRecurrences([envelope], new Date());

    return this.prisma.envelope.findFirst({
      where: { id, userId },
      select: ENVELOPE_SELECT,
    });
  }

  async getDetail(userId: string, id: string) {
    const envelope = await this.findOwned(userId, id);

    await this.applyRecurrences([envelope], new Date());

    const [fresh, agg, movements] = await this.prisma.$transaction([
      this.prisma.envelope.findFirst({
        where: { id, userId },
        select: ENVELOPE_SELECT,
      }),
      this.prisma.envelopeMovement.aggregate({
        where: { envelopeId: id, userId },
        _sum: { amount: true },
      }),
      this.prisma.envelopeMovement.findMany({
        where: { envelopeId: id, userId },
        select: {
          ...MOVEMENT_SELECT,
          expense: {
            select: { expenseDate: true, category: { select: { name: true } } },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);

    const contributed = new Prisma.Decimal(agg._sum.amount ?? 0);
    const spent = await this.spentTotal(userId, id);

    return {
      ...fresh,
      contributedAmount: contributed.toString(),
      spentAmount: spent.toString(),
      movements: movements.map((movement) => ({
        id: movement.id,
        type: movement.type,
        amount: movement.amount.toString(),
        notes: movement.notes,
        createdAt: movement.createdAt,
        expenseDate: movement.expense?.expenseDate ?? null,
        categoryName: movement.expense?.category?.name ?? null,
      })),
    };
  }

  async create(userId: string, dto: CreateEnvelopeDto) {
    await this.assertNameAvailable(userId, dto.name);

    return this.prisma.envelope.create({
      data: {
        userId,
        name: dto.name.trim(),
        frequency: dto.frequency,
        dayOfMonth: this.normalizeDay(dto.dayOfMonth, dto.frequency),
        amount: new Prisma.Decimal(dto.amount),
        balance: new Prisma.Decimal(dto.amount),
        lastRecurredAt: null,
        notes: dto.notes,
      },
      select: ENVELOPE_SELECT,
    });
  }

  async update(userId: string, id: string, dto: UpdateEnvelopeDto) {
    const envelope = await this.findOwned(userId, id);

    if (dto.name !== undefined) {
      await this.assertNameAvailable(userId, dto.name, id);
    }

    return this.prisma.envelope.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        frequency: dto.frequency,
        dayOfMonth:
          dto.frequency !== undefined
            ? this.normalizeDay(dto.dayOfMonth ?? envelope.dayOfMonth, dto.frequency)
            : dto.dayOfMonth,
        amount:
          dto.amount !== undefined
            ? new Prisma.Decimal(dto.amount)
            : undefined,
        notes: dto.notes,
      },
      select: ENVELOPE_SELECT,
    });
  }

  /**
   * Aporta dinero al sobre (sube su saldo) y registra un movimiento.
   */
  async contribute(userId: string, id: string, dto: ContributeEnvelopeDto) {
    const envelope = await this.findOwned(userId, id);

    await this.applyRecurrences([envelope], new Date());

    const now = new Date();
    const amount = new Prisma.Decimal(dto.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.envelope.findUnique({ where: { id } });

      if (!fresh) {
        throw new NotFoundException('Sobre no encontrado');
      }

      const newBalance =
        new Prisma.Decimal(fresh.balance).plus(amount);

      await tx.envelope.update({
        where: { id },
        data: { balance: newBalance },
      });

      return tx.envelopeMovement.create({
        data: {
          envelopeId: id,
          userId,
          type: 'CONTRIBUTE',
          amount,
          notes: dto.notes,
        },
        select: MOVEMENT_SELECT,
      });
    });

    return result;
  }

  /**
   * Gasta del saldo del sobre: baja el saldo, crea el gasto (expense)
   * y registra el movimiento vinculado.
   */
  async spend(userId: string, id: string, dto: SpendEnvelopeDto) {
    const envelope = await this.findOwned(userId, id);

    await this.applyRecurrences([envelope], new Date());

    const amount = new Prisma.Decimal(dto.amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.envelope.findUnique({ where: { id } });

      if (!fresh) {
        throw new NotFoundException('Sobre no encontrado');
      }

      const currentBalance = new Prisma.Decimal(fresh.balance);

      if (currentBalance.lt(amount)) {
        throw new BadRequestException(
          'El saldo del sobre no es suficiente para este gasto',
        );
      }

      const newBalance = currentBalance.minus(amount);

      const categoryId = await this.resolveSpendCategoryTx(tx, userId, dto.categoryId);
      const expenseDate = toDateOnly(
        dto.expenseDate ?? new Date().toISOString().slice(0, 10),
      );

      const expense = await tx.expense.create({
        data: {
          userId,
          categoryId,
          description:
            dto.description?.trim() || `Gasto del sobre: ${fresh.name}`,
          amount,
          expenseDate,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          notes: dto.notes,
        },
        select: { id: true },
      });

      await tx.envelope.update({
        where: { id },
        data: { balance: newBalance },
      });

      const movement = await tx.envelopeMovement.create({
        data: {
          envelopeId: id,
          userId,
          type: 'SPEND',
          amount,
          notes: dto.notes,
          expenseId: expense.id,
        },
        select: MOVEMENT_SELECT,
      });

      return { ...movement, expenseId: expense.id };
    });

    return result;
  }

  async removeMovement(
    userId: string,
    envelopeId: string,
    movementId: string,
  ): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.envelopeMovement.findFirst({
        where: { id: movementId, envelopeId, userId },
        select: { id: true, amount: true, type: true, expenseId: true },
      });

      const envelope = await tx.envelope.findFirst({
        where: { id: envelopeId, userId },
        select: { id: true, balance: true },
      });

      if (!movement) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      if (!envelope) {
        throw new NotFoundException('Sobre no encontrado');
      }

      const amount = new Prisma.Decimal(movement.amount);
      const current = new Prisma.Decimal(envelope.balance);

      const newBalance =
        movement.type === 'CONTRIBUTE'
          ? current.minus(amount)
          : current.plus(amount);

      if (newBalance.lt(0)) {
        throw new BadRequestException(
          'No se puede eliminar este movimiento porque dejaría el sobre en saldo negativo',
        );
      }

      await tx.envelope.update({
        where: { id: envelopeId },
        data: { balance: newBalance },
      });

      if (movement.expenseId) {
        await tx.expense.deleteMany({
          where: { id: movement.expenseId, userId },
        });
      }

      await tx.envelopeMovement.delete({
        where: { id: movement.id },
      });
    });

    return result;
  }

  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.prisma.envelope.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('Sobre no encontrado');
    }
  }

  /**
   * Descuenta dinero del sobre y registra el movimiento SPEND vinculado a un
   * gasto ya creado. Se usa desde otros módulos (p. ej. pagos de servicios)
   * para mantener la recarga automática y las reglas de saldo.
   */
  async spendInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    envelopeId: string,
    amount: Prisma.Decimal,
    expenseId: string,
    notes?: string,
  ): Promise<void> {
    const envelope = await tx.envelope.findFirst({
      where: { id: envelopeId, userId },
    });

    if (!envelope) {
      throw new NotFoundException('Sobre no encontrado');
    }

    await this.applyRecurrences([envelope], new Date(), tx);

    const fresh = await tx.envelope.findFirst({
      where: { id: envelopeId, userId },
    });

    const current = new Prisma.Decimal(fresh!.balance);

    if (current.lt(amount)) {
      throw new BadRequestException(
        'El saldo del sobre no es suficiente para este gasto',
      );
    }

    await tx.envelope.update({
      where: { id: envelopeId },
      data: { balance: current.minus(amount) },
    });

    await tx.envelopeMovement.create({
      data: {
        envelopeId,
        userId,
        type: 'SPEND',
        amount,
        notes,
        expenseId,
      },
    });
  }

  /**
   * Revierte un gasto de sobre (restaura el saldo y elimina el movimiento
   * SPEND vinculado a un gasto). Se usa cuando se elimina un gasto externo.
   */
  async reverseSpendTx(
    tx: Prisma.TransactionClient,
    userId: string,
    envelopeId: string,
    amount: Prisma.Decimal,
    expenseId: string,
  ): Promise<void> {
    const envelope = await tx.envelope.findFirst({
      where: { id: envelopeId, userId },
    });

    if (!envelope) {
      throw new NotFoundException('Sobre no encontrado');
    }

    const current = new Prisma.Decimal(envelope.balance);
    const newBalance = current.plus(amount);

    await tx.envelope.update({
      where: { id: envelopeId },
      data: { balance: newBalance },
    });

    await tx.envelopeMovement.deleteMany({
      where: { envelopeId, userId, expenseId },
    });
  }

  private async spentTotal(userId: string, envelopeId: string): Promise<Prisma.Decimal> {
    const agg = await this.prisma.envelopeMovement.aggregate({
      where: { envelopeId, userId, type: 'SPEND' },
      _sum: { amount: true },
    });

    return new Prisma.Decimal(agg._sum.amount ?? 0);
  }

  private async getOwned(userId: string) {
    return this.prisma.envelope.findMany({
      where: { userId },
      orderBy: [{ name: 'asc' }],
    });
  }

  private async findOwned(userId: string, id: string) {
    const envelope = await this.prisma.envelope.findFirst({
      where: { id, userId },
    });

    if (!envelope) {
      throw new NotFoundException('Sobre no encontrado');
    }

    return envelope;
  }

  private async assertNameAvailable(
    userId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.prisma.envelope.findFirst({
      where: {
        userId,
        name: { equals: name.trim(), mode: 'insensitive' },
        id: excludeId ? { not: excludeId } : undefined,
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un sobre con ese nombre');
    }
  }

  private normalizeDay(day: number | undefined, frequency: EnvelopeFrequency): number {
    if (frequency === EnvelopeFrequency.WEEKLY || day === undefined) {
      return 1;
    }

    return Math.min(31, Math.max(1, day));
  }

  private async applyRecurrences(
    envelopes: EnvelopeLike[],
    now: Date,
    db: Prisma.TransactionClient = this.prisma as Prisma.TransactionClient,
  ) {
    const updates: { id: string; balance: Prisma.Decimal }[] = [];

    for (const envelope of envelopes) {
      const cycles = this.dueCycles(envelope, now);

      if (cycles > 0) {
        const current = new Prisma.Decimal(envelope.balance);
        const addition = new Prisma.Decimal(envelope.amount).times(cycles);

        updates.push({ id: envelope.id, balance: current.plus(addition) });
      }
    }

    if (updates.length === 0) {
      return;
    }

    for (const update of updates) {
      await db.envelope.update({
        where: { id: update.id },
        data: { balance: update.balance, lastRecurredAt: now },
      });
    }
  }

  private dueCycles(envelope: EnvelopeLike, now: Date): number {
    const anchor = envelope.lastRecurredAt ?? envelope.createdAt;

    let cycles = 0;
    let cursor = new Date(anchor.getTime());
    let guard = 0;

    while (guard < 100000) {
      const next = this.nextRecurrenceAt(cursor, envelope);

      if (next.getTime() <= now.getTime()) {
        cycles++;
        cursor = next;
      } else {
        break;
      }

      guard++;
    }

    return cycles;
  }

  private nextRecurrenceAt(date: Date, envelope: EnvelopeLike): Date {
    const day = this.normalizeDay(envelope.dayOfMonth, envelope.frequency);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();

    switch (envelope.frequency) {
      case EnvelopeFrequency.WEEKLY: {
        return new Date(date.getTime() + 7 * DAY_MS);
      }
      case EnvelopeFrequency.BIWEEKLY: {
        return new Date(date.getTime() + 14 * DAY_MS);
      }
      case EnvelopeFrequency.MONTHLY: {
        const targetDay = Math.min(day, 31);
        const candidate = new Date(Date.UTC(y, m, targetDay));

        if (candidate.getTime() <= date.getTime()) {
          return new Date(Date.UTC(y, m + 1, targetDay));
        }

        return candidate;
      }
    }
  }

  private async resolveSpendCategoryTx(
    tx: Prisma.TransactionClient,
    userId: string,
    categoryId?: string,
  ): Promise<string> {
    if (categoryId) {
      const accessible = await tx.category.findFirst({
        where: { id: categoryId, OR: [{ isDefault: true }, { userId }] },
        select: { id: true },
      });

      if (!accessible) {
        throw new NotFoundException('Categoría no válida');
      }

      return accessible.id;
    }

    const defaultCategory = await tx.category.findFirst({
      where: {
        name: DEFAULT_ENVELOPE_CATEGORY,
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
      select: { id: true },
      orderBy: [{ isDefault: 'desc' }],
    });

    if (defaultCategory) {
      return defaultCategory.id;
    }

    const created = await tx.category.create({
      data: { name: DEFAULT_ENVELOPE_CATEGORY, color: '#2563EB', userId },
      select: { id: true },
    });

    return created.id;
  }
}