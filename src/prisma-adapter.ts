// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrismaSql = any;

/** Adapter interface matching Prisma's SQL template utilities. */
export interface PrismaAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql(strings: TemplateStringsArray, ...values: any[]): PrismaSql;
  join(values: PrismaSql[], separator?: string, prefix?: string, suffix?: string): PrismaSql;
  raw(value: string): PrismaSql;
  empty: PrismaSql;
}

class PrismaConfig {
  private adapter: PrismaAdapter | null = null;

  configure(adapter: PrismaAdapter): void {
    this.adapter = adapter;
  }

  getAdapter(): PrismaAdapter {
    if (!this.adapter) {
      throw new Error(
        'Prisma adapter is not configured. Please call configurePrisma() with your Prisma object before using the library.',
      );
    }
    return this.adapter;
  }

  isConfigured(): boolean {
    return this.adapter !== null;
  }

  reset(): void {
    this.adapter = null;
  }
}

export const prismaConfig = new PrismaConfig();

/**
 * Configure the library with your Prisma instance.
 *
 * Must be called once at application startup before using any query building functions.
 *
 * @param adapter - The `Prisma` namespace from `@prisma/client`
 *
 * @example
 * ```typescript
 * import { Prisma } from '@prisma/client';
 * import { configurePrisma } from '@revisium/prisma-pg-json';
 * configurePrisma(Prisma);
 * ```
 */
export function configurePrisma(adapter: PrismaAdapter): void {
  prismaConfig.configure(adapter);
}

/** Get the configured Prisma adapter. Throws if `configurePrisma()` hasn't been called. */
export function getPrismaAdapter(): PrismaAdapter {
  return prismaConfig.getAdapter();
}

export const Prisma = new Proxy({} as PrismaAdapter, {
  get(_target, prop) {
    const adapter = prismaConfig.getAdapter();
    const value = adapter[prop as keyof PrismaAdapter];
    // If it's a function, bind it to the adapter to preserve context
    return typeof value === 'function' ? value.bind(adapter) : value;
  },
});
