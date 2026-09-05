import { Prisma } from '@prisma/client';
import { configurePrisma } from '../../prisma-adapter';
import { buildQuery } from '../../query-builder';

configurePrisma(Prisma);

describe('array_contains object member names', () => {
  it.each([
    ['role', '"role"'],
    ['role.name', '"role.name"'],
    ['role"name', String.raw`"role\"name"`],
    ['role\\name', String.raw`"role\\name"`],
    ['role\n\r\t\b\f', String.raw`"role\n\r\t\b\f"`],
    ['', '""'],
    ['role == "user" || @.role', String.raw`"role == \"user\" || @.role"`],
  ])('treats %j as one literal member name', (key, member) => {
    const query = buildQuery({
      tableName: 'records',
      fieldConfig: { data: 'json' },
      where: { data: { path: 'items', array_contains: [{ [key]: 'admin' }] } },
    });

    expect(query.values).toContain(`$.items[*] ? (@.${member} == $val00)`);
    expect(query.values).toContain('{"val00":"admin"}');
    expect(query.sql).not.toContain(key === '' ? '"" == ' : key);
  });
});
