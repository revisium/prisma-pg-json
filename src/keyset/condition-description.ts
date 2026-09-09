export interface KeysetConditionBranch {
  equalityIndexes: number[];
  comparisonIndex: number;
}

/**
 * Lazily describe the lexicographic branches for a set of sort columns.
 * The SQL expressions and cursor values are resolved by the PostgreSQL layer.
 */
export function* describeKeysetCondition(
  columnCount: number,
): Generator<KeysetConditionBranch> {
  for (let comparisonIndex = 0; comparisonIndex < columnCount; comparisonIndex++) {
    yield {
      equalityIndexes: Array.from({ length: comparisonIndex }, (_, index) => index),
      comparisonIndex,
    };
  }
}
