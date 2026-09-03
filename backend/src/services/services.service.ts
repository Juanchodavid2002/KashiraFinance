import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateServicePaymentDto } from './dto/create-service-payment.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

const SERVICE_PAYMENTS_SELECT = {
  id: true,
  amount: true,
  paidDate: true,
  notes: true,
  createdAt: true,
} as const;

const DEFAULT_SERVICE_CATEGORY = 'Servicios';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const services = await this.prisma.service.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }],
    });

    const rows = await Promise.all(
      services.map(async (service) => {
        const agg = await this.prisma.servicePayment.aggregate({
          where: { serviceId: service.id },
          _sum: { amount: true },
          _count: { _all: true },
        });

        const lastPayment = await this.prisma.servicePayment.findFirst({
          where: { serviceId: service.id },
          select: SERVICE_PAYMENTS_SELECT,
          orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }],
        });

        return {
          id: service.id,
          name: service.name,
          color: service.color,
          icon: service.icon,
          notes: service.notes,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
          totalPaid: (agg._sum.amount ?? new Prisma.Decimal(0)).toString(),
          paymentCount: agg._count._all,
          lastPayment,
        };
      }),
    );

    return { data: rows };
  }

  async getById(userId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, userId },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }

    const agg = await this.prisma.servicePayment.aggregate({
      where: { serviceId: id },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const payments = await this.prisma.servicePayment.findMany({
      where: { serviceId: id },
      select: SERVICE_PAYMENTS_SELECT,
      orderBy: [{ paidDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    return {
      id: service.id,
      name: service.name,
      color: service.color,
      icon: service.icon,
      notes: service.notes,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      totalPaid: (agg._sum.amount ?? new Prisma.Decimal(0)).toString(),
      paymentCount: agg._count._all,
      payments: payments.map((payment) => ({
        ...payment,
        amount: payment.amount.toString(),
      })),
    };
  }

  create(userId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        userId,
        name: dto.name.trim(),
        color: dto.color ?? this.defaultColor(),
        icon: dto.icon,
        notes: dto.notes,
      },
      select: { id: true, name: true, color: true, icon: true, notes: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateServiceDto) {
    await this.ensureAccessible(userId, id);

    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        color: dto.color,
        icon: dto.icon,
        notes: dto.notes,
      },
      select: { id: true, name: true, color: true, icon: true, notes: true },
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.ensureAccessible(userId, id);

    await this.prisma.$transaction(async (tx) => {
      const paymentRows = await tx.servicePayment.findMany({
        where: { serviceId: id },
        select: { id: true },
      });

      if (paymentRows.length > 0) {
        await tx.expense.deleteMany({
          where: {
            userId,
            servicePaymentId: { in: paymentRows.map((p) => p.id) },
          },
        });
      }

      await tx.service.delete({ where: { id } });
    });
  }

  async addPayment(
    userId: string,
    serviceId: string,
    dto: CreateServicePaymentDto,
  ) {
    await this.ensureAccessible(userId, serviceId);

    const payment = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.resolveServiceCategoryTx(
        tx,
        userId,
        dto.categoryId,
      );
      const paidDate = toDateOnly(dto.paidDate ?? this.today());
      const amount = new Prisma.Decimal(dto.amount);

      const created = await tx.servicePayment.create({
        data: {
          serviceId,
          userId,
          amount,
          paidDate,
          notes: dto.notes,
        },
        select: SERVICE_PAYMENTS_SELECT,
      });

      await tx.expense.create({
        data: {
          userId,
          categoryId,
          description: `Pago servicio: ${(await this.serviceNameTx(tx, serviceId)) ?? 'Servicio'}`,
          amount,
          expenseDate: paidDate,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.CASH,
          notes: dto.notes,
          servicePaymentId: created.id,
        },
      });

      return created;
    });

    return payment;
  }

  async removePayment(
    userId: string,
    serviceId: string,
    paymentId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const deletedPayment = await tx.servicePayment.deleteMany({
        where: { id: paymentId, serviceId, userId },
      });

      if (deletedPayment.count === 0) {
        throw new NotFoundException('Pago no encontrado');
      }

      await tx.expense.deleteMany({
        where: { userId, servicePaymentId: paymentId },
      });
    });
  }

  private async ensureAccessible(userId: string, id: string): Promise<void> {
    const service = await this.prisma.service.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!service) {
      throw new NotFoundException('Servicio no encontrado');
    }
  }

  private async serviceNameTx(
    tx: Prisma.TransactionClient,
    serviceId: string,
  ): Promise<string | null> {
    const service = await tx.service.findUnique({
      where: { id: serviceId },
      select: { name: true },
    });

    return service?.name ?? null;
  }

  private async resolveServiceCategoryTx(
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
        name: DEFAULT_SERVICE_CATEGORY,
        OR: [{ isDefault: true, userId: null }, { userId }],
      },
      select: { id: true },
      orderBy: [{ isDefault: 'desc' }],
    });

    if (defaultCategory) {
      return defaultCategory.id;
    }

    const created = await tx.category.create({
      data: { name: DEFAULT_SERVICE_CATEGORY, color: '#06B6D4', userId },
      select: { id: true },
    });

    return created.id;
  }

  private defaultColor(): string {
    const palette = [
      '#06B6D4',
      '#3B82F6',
      '#8B5CF6',
      '#F59E0B',
      '#10B981',
      '#EF4444',
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
