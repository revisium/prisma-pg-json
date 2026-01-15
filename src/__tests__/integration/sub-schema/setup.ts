import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { configurePrisma } from '../../../prisma-adapter';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });

beforeAll(async () => {
  configurePrisma(Prisma);
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.$executeRaw`DELETE FROM "_RowToTable"`;
  await prisma.row.deleteMany();
  await prisma.table.deleteMany();
});

export interface TestTableConfig {
  tableId: string;
  tableVersionId: string;
  rows: Array<{
    rowId: string;
    rowVersionId: string;
    data: Prisma.InputJsonValue;
    createdAt?: Date;
  }>;
}

export function createFile(
  id: string,
  name: string,
  options: { mimeType?: string; size?: number; status?: 'uploaded' | 'ready' } = {},
): Prisma.InputJsonObject {
  const ext = name.split('.').pop() ?? 'bin';
  const mimeTypeMap: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    mp3: 'audio/mp3',
  };
  return {
    fileId: id,
    fileName: name,
    mimeType: options.mimeType ?? mimeTypeMap[ext] ?? 'application/octet-stream',
    size: options.size ?? 1000,
    status: options.status ?? 'uploaded',
  };
}

export async function createTestData(tables: TestTableConfig[]): Promise<void> {
  for (const table of tables) {
    await prisma.table.create({
      data: {
        id: table.tableId,
        versionId: table.tableVersionId,
      },
    });

    for (const row of table.rows) {
      await prisma.row.create({
        data: {
          id: row.rowId,
          versionId: row.rowVersionId,
          data: row.data,
          createdAt: row.createdAt,
          tables: {
            connect: { versionId: table.tableVersionId },
          },
        },
      });
    }
  }
}
