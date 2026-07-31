import type { PasswordService } from '../auth/password.service';

export interface AdminSeedInput {
  username: string;
  displayName: string;
  password: string;
}

export interface AdminSeedPrisma {
  user: {
    findUnique(args: {
      where: { username: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        username: string;
        displayName: string;
        passwordHash: string;
        role: 'ADMIN';
        mustChangePassword: true;
      };
    }): Promise<unknown>;
  };
}

export async function seedAdmin(
  prisma: AdminSeedPrisma,
  input: AdminSeedInput,
  passwordService: PasswordService,
): Promise<'created' | 'existing'> {
  const username = input.username.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existingUser) {
    return 'existing';
  }

  const validation = passwordService.validate(input.password);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const passwordHash = await passwordService.hash(input.password);
  await prisma.user.create({
    data: {
      username,
      displayName: input.displayName.trim(),
      passwordHash,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  return 'created';
}
