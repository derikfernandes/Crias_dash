import { AUTH_HEADER } from './api';
import type { CandidateStageRecord } from '../types/candidateStage';

const API_BASE = 'https://criasapi.geocode.com.br';

/** Lista etapas — com barra final (como no Swagger). */
function stageCollectionUrl(institutionId: string, candidateId: string) {
  return `${API_BASE}/institution/${institutionId}/candidate/${candidateId}/stage/`;
}

/** Cria etapa — alguns servidores diferenciam `/stage` e `/stage/`. */
function stageCreateUrl(institutionId: string, candidateId: string) {
  return `${API_BASE}/institution/${institutionId}/candidate/${candidateId}/stage`;
}

async function getErrorDetail(res: Response, label: string): Promise<string> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    return `${label} (${res.status})`;
  }
  const trimmed = text.trim();
  if (!trimmed) return `${label} (${res.status})`;
  try {
    const j = JSON.parse(trimmed) as Record<string, unknown>;
    const msg =
      (typeof j.message === 'string' && j.message) ||
      (typeof j.error === 'string' && j.error) ||
      (typeof j.detail === 'string' && j.detail);
    if (msg) return `${label} (${res.status}): ${msg}`;
  } catch {
    /* não é JSON */
  }
  if (trimmed.length <= 400) return `${label} (${res.status}): ${trimmed}`;
  return `${label} (${res.status}): ${trimmed.slice(0, 400)}…`;
}

function normalizeStageList(data: unknown): CandidateStageRecord[] {
  if (Array.isArray(data)) {
    return data as CandidateStageRecord[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: CandidateStageRecord[] }).items;
  }
  return [];
}

function sortTrackedByRecency(stages: CandidateStageRecord[]): CandidateStageRecord[] {
  const time = (r: CandidateStageRecord) =>
    r.enabledAt ? new Date(r.enabledAt).getTime() : 0;
  return [...stages].sort((a, b) => {
    const diff = time(b) - time(a);
    if (diff !== 0) return diff;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

export async function listCandidateStages(
  institutionId: string,
  candidateId: string,
  signal?: AbortSignal
): Promise<CandidateStageRecord[]> {
  const res = await fetch(stageCollectionUrl(institutionId, candidateId), {
    headers: AUTH_HEADER,
    signal,
  });
  if (!res.ok) {
    throw new Error(await getErrorDetail(res, 'Erro ao listar etapas'));
  }
  const data = await res.json();
  return normalizeStageList(data);
}

export async function createCandidateStage(
  institutionId: string,
  candidateId: string,
  code: string
): Promise<void> {
  const body = JSON.stringify({ code });
  const headers = {
    ...AUTH_HEADER,
    'Content-Type': 'application/json',
  };

  const urls = [
    stageCreateUrl(institutionId, candidateId),
    stageCollectionUrl(institutionId, candidateId),
  ];
  let lastRes: Response | null = null;
  for (const url of urls) {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });
    if (res.ok) return;
    lastRes = res;
  }

  throw new Error(await getErrorDetail(lastRes!, 'Erro ao registrar etapa'));
}

export async function updateCandidateStage(
  institutionId: string,
  candidateId: string,
  stageId: number,
  body: { candidateId: number; code: string; enabledAt: string }
): Promise<void> {
  const url = `${API_BASE}/institution/${institutionId}/candidate/${candidateId}/stage/${stageId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...AUTH_HEADER,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getErrorDetail(res, 'Erro ao atualizar etapa'));
  }
}

export async function deleteCandidateStage(
  institutionId: string,
  candidateId: string,
  stageId: number
): Promise<void> {
  const url = `${API_BASE}/institution/${institutionId}/candidate/${candidateId}/stage/${stageId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: AUTH_HEADER,
  });
  if (!res.ok) {
    throw new Error(await getErrorDetail(res, 'Erro ao remover etapa'));
  }
}

/**
 * Aplica a etapa desejada entre as gerenciadas pela tela (`managedCodes`).
 * - Sem etapa na API entre as gerenciadas + alvo definido → POST.
 * - Já existe registro gerenciado → atualiza o mais recente com PUT (evita DELETE+POST, que em alguns backends retorna 500).
 * - Alvo nulo → remove todos os registros cujo code está em `managedCodes`.
 */
export async function applyCandidateStageChange(
  institutionId: string,
  candidateId: string,
  targetCode: string | null,
  managedCodes: Set<string>
): Promise<void> {
  const rows = await listCandidateStages(institutionId, candidateId);
  const tracked = rows.filter(
    (r) => r.id != null && r.code && managedCodes.has(r.code)
  );
  const sorted = sortTrackedByRecency(tracked);

  if (!targetCode) {
    for (const r of sorted) {
      await deleteCandidateStage(institutionId, candidateId, r.id!);
    }
    return;
  }

  if (sorted.length === 0) {
    await createCandidateStage(institutionId, candidateId, targetCode);
    return;
  }

  const [primary, ...rest] = sorted;
  for (const r of rest) {
    await deleteCandidateStage(institutionId, candidateId, r.id!);
  }

  if (primary.code === targetCode) {
    return;
  }

  const numCandidateId = parseInt(String(candidateId), 10);
  const candidateIdBody = Number.isFinite(numCandidateId) ? numCandidateId : 0;

  try {
    await updateCandidateStage(institutionId, candidateId, primary.id!, {
      candidateId: candidateIdBody,
      code: targetCode,
      enabledAt: new Date().toISOString(),
    });
  } catch (putErr) {
    await deleteCandidateStage(institutionId, candidateId, primary.id!);
    await createCandidateStage(institutionId, candidateId, targetCode);
    if (putErr instanceof Error) {
      console.warn('[estagio] PUT falhou, usado DELETE+POST:', putErr.message);
    }
  }
}

/**
 * Quantas requisições GET de etapas rodam ao mesmo tempo.
 * Antes a página usava lotes de 8 e só iniciava o próximo lote quando os 8 terminavam;
 * com pool, sempre há N requisições em voo até acabar a lista (bem mais rápido).
 */
export const STAGE_LIST_DEFAULT_CONCURRENCY = 24;

/**
 * Busca `GET .../candidate/{id}/stage/` para cada candidato com id, em paralelo limitado.
 */
export async function fetchAllCandidateStagesMap(
  institutionId: string,
  candidateList: { id?: string }[],
  options?: {
    signal?: AbortSignal;
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<Map<string, CandidateStageRecord[]>> {
  const next = new Map<string, CandidateStageRecord[]>();
  const withId = candidateList.filter(
    (c): c is { id: string } => typeof c.id === 'string' && c.id.length > 0
  );
  const total = withId.length;
  if (total === 0) return next;

  const concurrency = Math.max(
    1,
    Math.min(options?.concurrency ?? STAGE_LIST_DEFAULT_CONCURRENCY, total)
  );
  const signal = options?.signal;
  const onProgress = options?.onProgress;

  let nextIndex = 0;
  let completed = 0;
  const progressStride = Math.max(1, Math.ceil(total / 50));

  const maybeReport = () => {
    if (!onProgress) return;
    if (completed === total || completed % progressStride === 0) {
      onProgress(completed, total);
    }
  };

  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const idx = nextIndex++;
      if (idx >= total) return;
      const id = withId[idx].id;
      try {
        const rows = await listCandidateStages(institutionId, id, signal);
        if (!signal?.aborted) next.set(id, rows);
      } catch {
        if (!signal?.aborted) next.set(id, []);
      }
      completed++;
      maybeReport();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  onProgress?.(completed, total);
  return next;
}

/** true = candidato ainda não tem registro com esse code (pode entrar na etapa). */
export async function isCandidateEnabledForStageCode(
  institutionId: string,
  candidateId: string,
  code: string,
  signal?: AbortSignal
): Promise<boolean> {
  const encoded = encodeURIComponent(code);
  const url = `${API_BASE}/institution/${institutionId}/candidate/${candidateId}/stage/enabled/${encoded}`;
  const res = await fetch(url, {
    headers: AUTH_HEADER,
    signal,
  });
  if (!res.ok) {
    throw new Error(await getErrorDetail(res, 'Erro ao verificar etapa'));
  }
  const data = (await res.json()) as { enabled?: boolean };
  return data.enabled === true;
}
