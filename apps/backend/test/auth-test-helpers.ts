import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import type { UserRole } from '@spk-r5-parking-log/shared-types';

import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/auth/password.service';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

export interface TestUserCredentials {
  id: string;
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  ipAddress: string;
}

export interface LoggedInAgent {
  agent: ReturnType<typeof request.agent>;
  setCookies: string[];
  cookies: string[];
  csrf: string;
  refreshCookie: string;
}

interface CreateUserOptions {
  mustChangePassword?: boolean;
  isActive?: boolean;
}

class AuthTestHarness {
  readonly frontendUrl = 'http://localhost:3000';
  app!: INestApplication<App>;
  prisma!: PrismaService;
  private readonly userIds = new Set<string>();
  private ipSequence = 10;

  async start(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    this.app = moduleFixture.createNestApplication();
    const httpInstance: unknown = this.app.getHttpAdapter().getInstance();
    (httpInstance as { set(name: string, value: unknown): void }).set(
      'trust proxy',
      1,
    );
    this.app.setGlobalPrefix('api');
    this.app.use(cookieParser());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    this.app.useGlobalFilters(new ApiExceptionFilter());
    await this.app.init();
    this.prisma = this.app.get(PrismaService);
  }

  async stop(): Promise<void> {
    await this.cleanup();
    if (this.app) await this.app.close();
  }

  async createUser(
    role: UserRole,
    options: CreateUserOptions = {},
  ): Promise<TestUserCredentials> {
    const suffix = randomUUID().slice(0, 8);
    const username = `e2e_${role.toLowerCase()}_${suffix}`;
    const password = 'StrongPassword123';
    const displayName =
      role === 'ADMIN' ? 'E2E ผู้ดูแลระบบ' : 'E2E เจ้าหน้าที่';
    const passwordHash = await new PasswordService().hash(password);
    const user = await this.prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        role,
        isActive: options.isActive ?? true,
        mustChangePassword: options.mustChangePassword ?? false,
      },
    });
    this.userIds.add(user.id);
    const ipAddress = `198.51.100.${this.ipSequence}`;
    this.ipSequence += 1;

    return {
      id: user.id,
      username,
      displayName,
      password,
      role,
      ipAddress,
    };
  }

  async login(user: TestUserCredentials): Promise<LoggedInAgent> {
    const agent = request.agent(this.app.getHttpServer());
    const response = await agent
      .post('/api/auth/login')
      .set('Origin', this.frontendUrl)
      .set('X-Forwarded-For', user.ipAddress)
      .send({ username: user.username, password: user.password })
      .expect(201);

    return this.loggedInAgent(agent, response);
  }

  async refresh(auth: LoggedInAgent): Promise<LoggedInAgent> {
    const response = await auth.agent
      .post('/api/auth/refresh')
      .set('Origin', this.frontendUrl)
      .set('X-CSRF-Token', auth.csrf)
      .expect(201);

    return this.loggedInAgent(auth.agent, response);
  }

  async cleanup(): Promise<void> {
    await this.cleanupParkingHouse('R5-163');
    const userIds = [...this.userIds];
    if (userIds.length === 0 || !this.prisma) return;

    await this.prisma.authSession.deleteMany({
      where: { userId: { in: userIds } },
    });
    await this.prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: userIds } },
          { entityType: 'User', entityId: { in: userIds } },
        ],
      },
    });
    await this.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    this.userIds.clear();
  }

  private loggedInAgent(
    agent: ReturnType<typeof request.agent>,
    response: Response,
  ): LoggedInAgent {
    const setCookies = this.responseCookies(response);
    const cookies = setCookies.map((cookie) => cookie.split(';', 1)[0] ?? '');
    const csrfCookie =
      cookies.find((cookie) => cookie.startsWith('spk_r5_csrf=')) ?? '';
    const refreshCookie =
      cookies.find((cookie) => cookie.startsWith('spk_r5_refresh=')) ?? '';

    return {
      agent,
      setCookies,
      cookies,
      csrf: decodeURIComponent(csrfCookie.split('=', 2)[1] ?? ''),
      refreshCookie,
    };
  }

  private responseCookies(response: Response): string[] {
    const header: unknown = response.headers['set-cookie'];
    if (Array.isArray(header)) {
      return header.filter(
        (value): value is string => typeof value === 'string',
      );
    }

    return typeof header === 'string' ? [header] : [];
  }

  private async cleanupParkingHouse(houseCode: string): Promise<void> {
    if (!this.prisma) return;
    const house = await this.prisma.house.findUnique({
      where: { code: houseCode },
      include: {
        cycles: {
          include: {
            violations: { include: { fine: true } },
          },
        },
      },
    });
    if (!house) return;

    const entityIds = house.cycles.flatMap((cycle) => [
      cycle.id,
      ...cycle.violations.flatMap((violation) => [
        violation.id,
        ...(violation.fine ? [violation.fine.id] : []),
      ]),
    ]);
    if (entityIds.length > 0) {
      await this.prisma.auditLog.deleteMany({
        where: { entityId: { in: entityIds } },
      });
    }
    await this.prisma.evidence.deleteMany({
      where: { violation: { cycle: { houseId: house.id } } },
    });
    await this.prisma.fine.deleteMany({
      where: { violation: { cycle: { houseId: house.id } } },
    });
    await this.prisma.parkingViolation.deleteMany({
      where: { cycle: { houseId: house.id } },
    });
    await this.prisma.violationCycle.deleteMany({
      where: { houseId: house.id },
    });
  }
}

export function createAuthTestHarness(): AuthTestHarness {
  return new AuthTestHarness();
}
