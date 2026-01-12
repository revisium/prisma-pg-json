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
  }>;
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
          tables: {
            connect: { versionId: table.tableVersionId },
          },
        },
      });
    }
  }
}
