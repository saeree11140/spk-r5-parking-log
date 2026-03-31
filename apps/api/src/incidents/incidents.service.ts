import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: { houseId: number; incidentDate: string; note?: string }) {
    const house = await this.prisma.house.findUnique({
      where: { id: dto.houseId },
      select: { id: true },
    });

    if (!house) {
      throw new NotFoundException('ไม่พบบ้านที่ต้องการบันทึกเหตุการณ์');
    }

    const incidentDate = new Date(`${dto.incidentDate}T00:00:00.000Z`);

    const startOfDay = new Date(incidentDate);
    const endOfDay = new Date(incidentDate);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const existingIncident = await this.prisma.parkingIncident.findFirst({
      where: {
        houseId: dto.houseId,
        incidentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existingIncident) {
      throw new BadRequestException(
        'บ้านหลังนี้มีบันทึกเหตุการณ์ในวันที่เลือกแล้ว',
      );
    }

    const previousCount = await this.prisma.parkingIncident.count({
      where: { houseId: dto.houseId },
    });

    const offenseCount = previousCount + 1;
    const { noticeLevel, fineAmount, outstandingAmount } =
      this.calculatePenalty(offenseCount);

    return this.prisma.parkingIncident.create({
      data: {
        houseId: dto.houseId,
        incidentDate,
        note: dto.note?.trim() || null,
        offenseCount,
        noticeLevel,
        fineAmount,
        outstandingAmount,
      },
      include: {
        payment: true,
        house: true,
      },
    });
  }

  async pay(incidentId: number) {
    const incident = await this.prisma.parkingIncident.findUnique({
      where: { id: incidentId },
      include: { payment: true },
    });

    if (!incident) {
      throw new NotFoundException('ไม่พบรายการค่าปรับ');
    }

    if (incident.fineAmount === 0) {
      throw new BadRequestException(
        'รายการนี้เป็นเพียงการแจ้งเตือน ยังไม่มีค่าปรับให้ชำระ',
      );
    }

    if (incident.payment) {
      throw new BadRequestException('รายการนี้ถูกชำระแล้ว');
    }

    return this.prisma.parkingIncident.update({
      where: { id: incidentId },
      data: {
        outstandingAmount: 0,
        payment: {
          create: {
            amount: incident.fineAmount,
          },
        },
      },
      include: {
        payment: true,
        house: true,
      },
    });
  }

  async getDashboard(date: string) {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T00:00:00.000Z`);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const incidents = await this.prisma.parkingIncident.findMany({
      where: {
        incidentDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        house: true,
        payment: true,
      },
      orderBy: [{ incidentDate: 'desc' }, { id: 'desc' }],
    });

    const houses = incidents.map((incident) => {
      const status = this.getStatus(incident);
      return {
        houseId: incident.houseId,
        houseCode: incident.house.code,
        ownerName: incident.house.ownerName,
        address: incident.house.address,
        status,
        label: this.getLabel(incident),
        offenseCount: incident.offenseCount,
        noticeLevel: incident.noticeLevel,
        fineAmount: incident.fineAmount,
        outstandingAmount: incident.outstandingAmount,
        incidentId: incident.id,
        note: incident.note,
        occurredAt: incident.incidentDate.toISOString(),
        paidAt: incident.payment?.paidAt.toISOString() ?? null,
      };
    });

    const totals = houses.reduce(
      (accumulator, house) => {
        accumulator.parkedHomes += 1;
        if (house.status === 'PAID') {
          accumulator.paidHomes += 1;
        } else if (house.status === 'UNPAID') {
          accumulator.unpaidHomes += 1;
        } else {
          accumulator.warnings += 1;
        }
        accumulator.outstandingAmount += house.outstandingAmount;
        return accumulator;
      },
      {
        parkedHomes: 0,
        paidHomes: 0,
        unpaidHomes: 0,
        warnings: 0,
        outstandingAmount: 0,
      },
    );

    return {
      selectedDate: date,
      totals,
      houses,
    };
  }

  private calculatePenalty(offenseCount: number) {
    if (offenseCount === 1) {
      return { noticeLevel: 1, fineAmount: 0, outstandingAmount: 0 };
    }

    if (offenseCount === 2) {
      return { noticeLevel: 2, fineAmount: 0, outstandingAmount: 0 };
    }

    if (offenseCount === 3) {
      return { noticeLevel: 3, fineAmount: 1000, outstandingAmount: 1000 };
    }

    return {
      noticeLevel: offenseCount,
      fineAmount: 500,
      outstandingAmount: 500,
    };
  }

  private getStatus(
    incident: Prisma.ParkingIncidentGetPayload<{
      include: {
        payment: true;
      };
    }>,
  ) {
    if (incident.payment) {
      return 'PAID';
    }

    if (incident.fineAmount > 0) {
      return 'UNPAID';
    }

    return incident.noticeLevel === 1 ? 'WARNING_1' : 'WARNING_2';
  }

  private getLabel(
    incident: Prisma.ParkingIncidentGetPayload<{
      include: {
        payment: true;
      };
    }>,
  ) {
    if (incident.payment) {
      return 'ชำระแล้ว';
    }

    if (incident.fineAmount > 0) {
      return `ค้างชำระ ${incident.fineAmount.toLocaleString('th-TH')} บาท`;
    }

    return `แจ้งเตือนครั้งที่ ${incident.noticeLevel}`;
  }
}
