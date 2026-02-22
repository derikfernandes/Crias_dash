/**
 * Utilitário para processar requisições em lotes (batch)
 * Evita sobrecarga da API com muitas requisições simultâneas
 */

interface BatchOptions {
  maxConcurrent?: number; // Máximo de requisições simultâneas (padrão: 10)
  delayBetweenBatches?: number; // Delay entre lotes em ms (padrão: 100)
  onProgress?: (completed: number, total: number) => void;
}

export async function processInBatches<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const {
    maxConcurrent = 10,
    delayBetweenBatches = 100,
    onProgress,
  } = options;

  const results: R[] = [];
  const errors: Error[] = [];

  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    
    const batchPromises = batch.map(async (item) => {
      try {
        return await processor(item);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    if (onProgress) {
      onProgress(results.length, items.length);
    }

    if (i + maxConcurrent < items.length && delayBetweenBatches > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} erros durante processamento em lotes:`, errors);
  }

  return results;
}

