/**
 * Testes de performance para validar o sistema com 10.000 alunos
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateScaleTestData } from './mocks/dataGenerator';
import { processInBatches } from '../utils/batchProcessor';
import { cache, getAnswersCacheKey } from '../utils/cache';

describe('Performance Tests - 10.000 Alunos', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('deve gerar 10.000 candidatos mockados em tempo razoável', () => {
    const startTime = Date.now();
    const { candidates } = generateScaleTestData();
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(candidates).toHaveLength(10000);
    expect(duration).toBeLessThan(5000); // Deve gerar em menos de 5 segundos
  });

  it('deve processar respostas em lotes sem sobrecarregar', async () => {
    const { candidates, answersMap } = generateScaleTestData();
    const maxConcurrent = 10;
    let concurrentCount = 0;
    let maxConcurrentReached = 0;

    const processor = async (candidateId: string) => {
      concurrentCount++;
      maxConcurrentReached = Math.max(maxConcurrentReached, concurrentCount);
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const answers = answersMap.get(candidateId) || [];
      concurrentCount--;
      
      return answers;
    };

    const candidateIds = candidates
      .slice(0, 100) // Testar com 100 primeiro
      .map((c) => c.id!)
      .filter(Boolean);

    const startTime = Date.now();
    await processInBatches(candidateIds, processor, {
      maxConcurrent,
      delayBetweenBatches: 50,
    });
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(maxConcurrentReached).toBeLessThanOrEqual(maxConcurrent);
    expect(duration).toBeLessThan(5000);
  });

  it('deve usar cache para evitar requisições duplicadas', () => {
    const institutionId = '1';
    const candidateId = '123';
    const cacheKey = getAnswersCacheKey(institutionId, candidateId);
    const mockAnswers = [
      { id: '1', candidateId: 123, question: 0, answer: 'Sim', answeredAt: new Date().toISOString() },
    ];

    expect(cache.has(cacheKey)).toBe(false);

    cache.set(cacheKey, mockAnswers);

    expect(cache.has(cacheKey)).toBe(true);
    const cached = cache.get(cacheKey);
    expect(cached).toEqual(mockAnswers);
  });

  it('deve filtrar candidatos eficientemente com 10.000 registros', () => {
    const { candidates, answersMap } = generateScaleTestData();
    
    const startTime = Date.now();
    
    const filtered = candidates.filter((candidate) => {
      if (!candidate.id) return false;
      const answers = answersMap.get(candidate.id) || [];
      return answers.length > 0;
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(filtered.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100);
  });

  it('deve calcular etapas eficientemente para 10.000 candidatos', () => {
    const { candidates, answersMap } = generateScaleTestData();
    
    const startTime = Date.now();
    
    const etapasCount = new Map<string, number>();
    candidates.forEach((candidate) => {
      if (!candidate.id) return;
      const answers = answersMap.get(candidate.id) || [];
      
      if (answers.length === 0) {
        const count = etapasCount.get('Sem respostas') || 0;
        etapasCount.set('Sem respostas', count + 1);
      } else {
        const hasQuestion66 = answers.some((a) => a.question === 66);
        const etapa = hasQuestion66 ? 'Finalizou' : 'Em progresso';
        const count = etapasCount.get(etapa) || 0;
        etapasCount.set(etapa, count + 1);
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(etapasCount.size).toBeGreaterThan(0);
    expect(duration).toBeLessThan(200);
  });
});

describe('Batch Processing Tests', () => {
  it('deve processar lotes com limite de concorrência', async () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const maxConcurrent = 5;
    let concurrentCount = 0;
    let maxConcurrentReached = 0;

    const processor = async (item: number) => {
      concurrentCount++;
      maxConcurrentReached = Math.max(maxConcurrentReached, concurrentCount);
      await new Promise((resolve) => setTimeout(resolve, 10));
      concurrentCount--;
      return item * 2;
    };

    const results = await processInBatches(items, processor, {
      maxConcurrent,
    });

    expect(results).toHaveLength(50);
    expect(maxConcurrentReached).toBeLessThanOrEqual(maxConcurrent);
    results.forEach((result, index) => {
      expect(result).toBe(index * 2);
    });
  });
});

