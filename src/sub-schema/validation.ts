export const MAX_TAKE = 10000;
export const MAX_SKIP = 1000000;

export function validatePagination(take: number, skip: number): void {
  if (!Number.isInteger(take) || take < 0 || take > MAX_TAKE) {
    throw new Error(`take must be an integer between 0 and ${MAX_TAKE}`);
  }
  if (!Number.isInteger(skip) || skip < 0 || skip > MAX_SKIP) {
    throw new Error(`skip must be an integer between 0 and ${MAX_SKIP}`);
  }
}

const SQL_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateSqlIdentifier(value: string, name: string): void {
  if (!SQL_IDENTIFIER_REGEX.test(value)) {
    throw new Error(`Invalid ${name}: "${value}". Only alphanumeric characters and underscores allowed, must start with letter or underscore.`);
  }
}
