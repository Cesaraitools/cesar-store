export function shouldClarifyAmbiguousCatalogPrice(input: {
  hasPriceIntent: boolean;
  commentTokenCount: number;
  pinnedProductCount: number;
  contextScores: number[];
}) {
  if (!input.hasPriceIntent || input.commentTokenCount > 0) return false;
  if (input.pinnedProductCount > 1) return true;
  if (input.pinnedProductCount === 1) return false;

  const bestContextScore = Math.max(0, ...input.contextScores);
  if (bestContextScore < 45) return false;

  const comparableMatchThreshold = Math.max(45, bestContextScore - 10);
  return (
    input.contextScores.filter((score) => score >= comparableMatchThreshold).length > 1
  );
}
