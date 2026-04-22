import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInstitution } from '../contexts/InstitutionContext';
import { AUTH_HEADER } from '../utils/api';
import type { Candidate } from '../types/candidate';
import type { CandidateStageRecord } from '../types/candidateStage';
import {
  applyCandidateStageChange,
  fetchAllCandidateStagesMap,
  listCandidateStages,
} from '../utils/candidateStageApi';
import { ESTAGIO_STAGES } from '../config/estagioStages';
import { EstagioStagesChart } from '../components/EstagioStagesChart';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { Toast } from '../components/Toast';

function pickLatestRecord(
  stages: CandidateStageRecord[]
): CandidateStageRecord | null {
  const withDate = stages.filter((s) => s.enabledAt);
  if (withDate.length === 0) {
    const withId = stages.filter((s) => s.id != null);
    if (withId.length === 0) return null;
    return withId.reduce((a, b) => ((a.id ?? 0) > (b.id ?? 0) ? a : b));
  }
  return withDate.reduce((a, b) => {
    const ta = new Date(a.enabledAt!).getTime();
    const tb = new Date(b.enabledAt!).getTime();
    return tb >= ta ? b : a;
  });
}

function resolveColumnCode(
  stages: CandidateStageRecord[],
  definitionCodes: Set<string>
): string | null {
  const relevant = stages.filter(
    (s) => s.code && definitionCodes.has(s.code)
  );
  if (relevant.length === 0) return null;
  const latest = pickLatestRecord(relevant);
  return latest?.code ?? null;
}

/** Texto usado na busca (nome, documento, telefone, e-mail, endereço, id, etc.) */
function candidateSearchText(c: Candidate): string {
  const chunks: string[] = [];
  const push = (v: unknown) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s) chunks.push(s);
  };
  push(c.id);
  push(c.name);
  push(c.whatsapp);
  push(c.document);
  push(c.email);
  push(c.zipcode);
  push(c.city);
  push(c.state);
  push(c.addressLine1);
  push(c.addressLine2);
  return chunks.join(' ');
}

function candidateMatchesSearch(c: Candidate, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const blob = candidateSearchText(c).toLowerCase();
  if (blob.includes(q)) return true;
  const digitsQ = q.replace(/\D/g, '');
  if (digitsQ.length >= 2) {
    const digitsBlob = candidateSearchText(c).replace(/\D/g, '');
    if (digitsBlob.includes(digitsQ)) return true;
  }
  return false;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Quebra linhas coladas: vírgula, ponto e vírgula, quebra de linha ou espaço. */
function parseNumberTokens(raw: string): string[] {
  return raw
    .split(/[\s,;]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function phoneLikeMatch(w: string, q: string): boolean {
  if (!w || !q) return false;
  if (w === q) return true;
  const maxK = Math.min(11, w.length, q.length);
  for (let k = Math.min(maxK, 11); k >= 8; k--) {
    if (w.slice(-k) === q.slice(-k)) return true;
  }
  const strip = (s: string) =>
    s.startsWith('55') && s.length >= 12 ? s.slice(2) : s;
  const ws = strip(w);
  const qs = strip(q);
  if (ws === qs) return true;
  const maxK2 = Math.min(11, ws.length, qs.length);
  for (let k = Math.min(maxK2, 11); k >= 8; k--) {
    if (ws.slice(-k) === qs.slice(-k)) return true;
  }
  return false;
}

function docLikeMatch(d: string, q: string): boolean {
  if (!d || !q) return false;
  if (d === q) return true;
  if (d.length >= q.length && d.includes(q)) return true;
  if (q.length >= d.length && q.includes(d)) return true;
  return false;
}

function candidateMatchesNumberToken(c: Candidate, token: string): boolean {
  const raw = token.trim();
  if (!raw || !c.id) return false;
  const q = digitsOnly(raw);
  if (!q && !raw) return false;

  const id = String(c.id).trim();
  if (id === raw) return true;
  const idD = digitsOnly(id);
  if (q && idD && idD === q) return true;

  const w = digitsOnly(c.whatsapp ?? '');
  const d = digitsOnly(c.document ?? '');
  if (q && w && phoneLikeMatch(w, q)) return true;
  if (q && d && docLikeMatch(d, q)) return true;

  return false;
}

function resolveCandidatesFromTokens(
  candidates: Candidate[],
  tokens: string[]
): { ids: string[]; notFound: string[]; ambiguous: string[] } {
  const idSet = new Set<string>();
  const notFound: string[] = [];
  const ambiguous: string[] = [];

  for (const token of tokens) {
    const matches = candidates.filter(
      (c) => c.id && candidateMatchesNumberToken(c, token)
    );
    if (matches.length === 0) {
      notFound.push(token);
    } else if (matches.length > 1) {
      ambiguous.push(token);
    } else {
      idSet.add(matches[0].id!);
    }
  }

  return { ids: [...idSet], notFound, ambiguous };
}

export const Estagio = () => {
  const { selectedInstitution } = useInstitution();
  const institutionId = selectedInstitution?.id ?? null;

  const definitions = ESTAGIO_STAGES;
  const definitionCodes = useMemo(
    () => new Set(definitions.map((d) => d.code)),
    [definitions]
  );

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [estagioInitialReady, setEstagioInitialReady] = useState(false);
  const [estagioLoadProgress, setEstagioLoadProgress] = useState(0);
  const [estagioLoadPhase, setEstagioLoadPhase] = useState('Carregando…');
  const [reloadToken, setReloadToken] = useState(0);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [stageMap, setStageMap] = useState<Map<string, CandidateStageRecord[]>>(
    () => new Map()
  );
  const [movingId, setMovingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchNumbersText, setBatchNumbersText] = useState('');
  const [batchTargetStage, setBatchTargetStage] = useState<string>('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const refetchAllStageMaps = useCallback(async (instId: string, candidateList: Candidate[]) => {
    const next = await fetchAllCandidateStagesMap(instId, candidateList);
    setStageMap(next);
  }, []);

  useEffect(() => {
    if (!institutionId) {
      setEstagioInitialReady(false);
      setCandidates([]);
      setStageMap(new Map());
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      setEstagioInitialReady(false);
      setEstagioLoadProgress(5);
      setEstagioLoadPhase('Carregando candidatos');
      setCandidatesError(null);

      try {
        const res = await fetch(
          `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/`,
          { headers: AUTH_HEADER, signal: ac.signal }
        );
        if (cancelled) return;
        if (!res.ok) throw new Error('Erro ao carregar candidatos');
        const data = (await res.json()) as Candidate[];
        const list = Array.isArray(data) ? data : [];
        setCandidates(list);
        setEstagioLoadProgress(38);
        if (cancelled) return;

        const withId = list.filter((c): c is Candidate & { id: string } => !!c.id);
        if (withId.length === 0) {
          setStageMap(new Map());
          setEstagioLoadProgress(100);
          setEstagioLoadPhase('Pronto');
          setEstagioInitialReady(true);
          return;
        }

        setEstagioLoadPhase('Carregando etapas dos candidatos');
        const next = await fetchAllCandidateStagesMap(institutionId, list, {
          signal: ac.signal,
          onProgress: (done, tot) => {
            if (cancelled) return;
            setEstagioLoadProgress(38 + Math.round((done / tot) * 62));
          },
        });

        if (cancelled) return;
        setStageMap(next);
        setEstagioLoadProgress(100);
        setEstagioLoadPhase('Pronto');
        setEstagioInitialReady(true);
      } catch (e) {
        if (cancelled || (e instanceof Error && e.name === 'AbortError')) return;
        setCandidatesError(
          e instanceof Error ? e.message : 'Erro ao carregar candidatos'
        );
        setCandidates([]);
        setStageMap(new Map());
        setEstagioLoadProgress(100);
        setEstagioLoadPhase('Erro ao carregar');
        setEstagioInitialReady(true);
      }
    };

    void run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [institutionId, reloadToken]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectIds = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const assignCandidate = async (candidateId: string, targetCode: string | null) => {
    if (!institutionId) return;
    setMovingId(candidateId);
    try {
      await applyCandidateStageChange(
        institutionId,
        candidateId,
        targetCode,
        definitionCodes
      );
      const updated = await listCandidateStages(institutionId, candidateId);
      setStageMap((prev) => {
        const copy = new Map(prev);
        copy.set(candidateId, updated);
        return copy;
      });
      setToast({ message: 'Aluno atualizado.', type: 'success' });
    } catch (e) {
      setToast({
        message:
          e instanceof Error ? e.message : 'Não foi possível atualizar a etapa.',
        type: 'error',
      });
      await refetchAllStageMaps(institutionId, candidates);
    } finally {
      setMovingId(null);
    }
  };

  const assignCandidatesBulk = async (
    ids: string[],
    targetCode: string | null,
    extraSuccessNote?: string
  ): Promise<{ ok: number; fail: number }> => {
    if (!institutionId || ids.length === 0) return { ok: 0, fail: 0 };
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    const concurrency = 4;
    for (let i = 0; i < ids.length; i += concurrency) {
      const chunk = ids.slice(i, i + concurrency);
      const outcomes = await Promise.all(
        chunk.map(async (candidateId) => {
          try {
            await applyCandidateStageChange(
              institutionId,
              candidateId,
              targetCode,
              definitionCodes
            );
            const updated = await listCandidateStages(institutionId, candidateId);
            setStageMap((prev) => {
              const copy = new Map(prev);
              copy.set(candidateId, updated);
              return copy;
            });
            return true;
          } catch {
            return false;
          }
        })
      );
      outcomes.forEach((success) => {
        if (success) ok += 1;
        else fail += 1;
      });
    }
    setBulkBusy(false);
    if (fail === 0) {
      let message =
        ok === 1 ? '1 candidato atualizado.' : `${ok} candidatos atualizados.`;
      if (extraSuccessNote) message = `${message} ${extraSuccessNote}`;
      setToast({
        message,
        type: 'success',
      });
      clearSelection();
    } else {
      setToast({
        message: `Concluído com erros: ${ok} ok, ${fail} falha(s). Recarregue se necessário.`,
        type: 'error',
      });
      await refetchAllStageMaps(institutionId, candidates);
    }
    return { ok, fail };
  };

  const handleBatchMoveByNumbers = () => {
    const tokens = parseNumberTokens(batchNumbersText);
    if (tokens.length === 0) {
      setToast({
        message: 'Cole pelo menos um número (telefone, documento ou ID do candidato).',
        type: 'error',
      });
      return;
    }
    if (batchTargetStage === '') {
      setToast({
        message: 'Selecione a etapa de destino (ou “Nenhuma etapa listada”).',
        type: 'error',
      });
      return;
    }
    const { ids, notFound, ambiguous } = resolveCandidatesFromTokens(
      candidates,
      tokens
    );
    if (ids.length === 0) {
      const parts: string[] = [];
      if (notFound.length) parts.push(`${notFound.length} sem correspondência`);
      if (ambiguous.length) parts.push(`${ambiguous.length} ambíguo(s)`);
      setToast({
        message: `Nenhum candidato único para mover. ${parts.join('; ')}.`,
        type: 'error',
      });
      return;
    }
    const target = batchTargetStage === '__none' ? null : batchTargetStage;
    const notes: string[] = [];
    if (notFound.length) {
      notes.push(`${notFound.length} linha(s) sem correspondência.`);
    }
    if (ambiguous.length) {
      notes.push(`${ambiguous.length} ambíguo(s) (vários candidatos iguais — ajuste o texto).`);
    }
    const extraNote = notes.join(' ');
    void (async () => {
      const { fail } = await assignCandidatesBulk(ids, target, extraNote || undefined);
      if (fail === 0) setBatchNumbersText('');
    })();
  };

  const columns = useMemo(() => {
    const none: Candidate[] = [];
    const byCode = new Map<string, Candidate[]>();
    definitions.forEach((d) => byCode.set(d.code, []));

    for (const c of candidates) {
      const id = c.id;
      if (!id) continue;
      const stages = stageMap.get(id) ?? [];
      const col = resolveColumnCode(stages, definitionCodes);
      if (col && byCode.has(col)) {
        byCode.get(col)!.push(c);
      } else {
        none.push(c);
      }
    }
    return { none, byCode };
  }, [candidates, definitions, stageMap, definitionCodes]);

  const filteredColumns = useMemo(() => {
    const byCode = new Map<string, Candidate[]>();
    definitions.forEach((d) => {
      byCode.set(
        d.code,
        (columns.byCode.get(d.code) ?? []).filter((c) =>
          candidateMatchesSearch(c, searchQuery)
        )
      );
    });
    return {
      none: columns.none.filter((c) => candidateMatchesSearch(c, searchQuery)),
      byCode,
    };
  }, [columns, definitions, searchQuery]);

  /** Contagens reais (sem filtro de busca) para o gráfico da página Estágio. */
  const stageChartRows = useMemo(
    () => [
      {
        key: 'none',
        label: 'Nenhuma etapa listada',
        count: columns.none.length,
      },
      ...definitions.map((d) => ({
        key: d.code,
        label: d.name,
        count: columns.byCode.get(d.code)?.length ?? 0,
      })),
    ],
    [columns, definitions]
  );

  const isBusy = bulkBusy || movingId !== null;

  if (!institutionId) {
    return (
      <div className="app-container estagio-page">
        <p className="estagio-hint">Selecione uma instituição no topo para gerenciar etapas.</p>
      </div>
    );
  }

  if (!estagioInitialReady) {
    return (
      <div className="app-container estagio-page">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        <div className="loading-overlay-wrapper">
          <LoadingOverlay progress={estagioLoadProgress} phase={estagioLoadPhase} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container estagio-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <header className="estagio-header">
        <div>
          <h1 className="estagio-title">Etapas dos candidatos</h1>
          <p className="estagio-subtitle">
            As etapas e os códigos enviados à API estão definidos em{' '}
            <code>src/config/estagioStages.ts</code>. Use o menu abaixo para colocar cada candidato
            na etapa desejada.
          </p>
        </div>
        <button
          type="button"
          className="nav-button nav-button-primary"
          onClick={() => setReloadToken((t) => t + 1)}
          disabled={!estagioInitialReady || isBusy}
        >
          Recarregar candidatos e etapas
        </button>
      </header>

      {definitions.length === 0 && (
        <p className="estagio-hint">
          Não há etapas configuradas. Adicione entradas no array em{' '}
          <code>src/config/estagioStages.ts</code>.
        </p>
      )}

      {candidatesError && (
        <div className="error-container">
          <p className="error-message">{candidatesError}</p>
        </div>
      )}

      <div className="estagio-toolbar">
        <label className="estagio-search-label">
          <span className="estagio-search-title">Buscar candidato</span>
          <input
            type="search"
            className="estagio-search-input"
            placeholder="Nome, telefone, documento, e-mail, cidade…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isBusy}
          />
        </label>
        {searchQuery.trim() && (
          <span className="estagio-search-meta">
            Filtrando listas; contadores mostram visíveis / total na coluna.
          </span>
        )}
      </div>

      <section className="estagio-batch-numbers" aria-labelledby="estagio-batch-heading">
        <h2 id="estagio-batch-heading" className="estagio-batch-title">
          Movimentação em lote por números
        </h2>
        <p className="estagio-batch-help">
          Cole <strong>telefones</strong> (com ou sem DDI 55), <strong>documentos</strong> ou{' '}
          <strong>ID</strong> do candidato — um por linha ou separados por vírgula ou espaço. A busca
          usa WhatsApp e documento cadastrados; telefone compara pelos últimos 8 a 11 dígitos para
          casar com ou sem 55/9.
        </p>
        <textarea
          className="estagio-batch-textarea"
          rows={5}
          placeholder={'Ex.:\n11988887777\n5511988887777\n12345678901'}
          value={batchNumbersText}
          onChange={(e) => setBatchNumbersText(e.target.value)}
          disabled={isBusy}
        />
        <div className="estagio-batch-row">
          <label className="estagio-batch-select-wrap">
            <span className="estagio-batch-select-label">Mover correspondentes para</span>
            <select
              className="estagio-select estagio-batch-select"
              value={batchTargetStage}
              onChange={(e) => setBatchTargetStage(e.target.value)}
              disabled={isBusy}
            >
              <option value="">Escolha a etapa…</option>
              <option value="__none">Nenhuma etapa listada</option>
              {definitions.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="nav-button nav-button-primary estagio-batch-submit"
            disabled={isBusy}
            onClick={handleBatchMoveByNumbers}
          >
            Aplicar em lote
          </button>
        </div>
      </section>

      <EstagioStagesChart rows={stageChartRows} />

      {selectedIds.size > 0 && (
        <div className="estagio-bulk-bar">
          <span className="estagio-bulk-count">
            {selectedIds.size} selecionado(s)
          </span>
          <select
            className="estagio-select estagio-bulk-select"
            disabled={isBusy}
            value=""
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = '';
              if (!v || !institutionId) return;
              const ids = [...selectedIds];
              if (v === '__none') void assignCandidatesBulk(ids, null);
              else void assignCandidatesBulk(ids, v);
            }}
          >
            <option value="">Mover selecionados para…</option>
            <option value="__none">Nenhuma etapa listada</option>
            {definitions.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="nav-button"
            disabled={isBusy}
            onClick={clearSelection}
          >
            Limpar seleção
          </button>
        </div>
      )}

      <section className="estagio-board">
        <div className="estagio-column">
          <div className="estagio-column-head">
            <h3>Nenhuma etapa listada</h3>
            <span className="estagio-count">
              {searchQuery.trim()
                ? `${filteredColumns.none.length} / ${columns.none.length}`
                : columns.none.length}
            </span>
          </div>
          <div className="estagio-column-actions">
            <button
              type="button"
              className="estagio-link-button"
              disabled={isBusy || columns.none.length === 0}
              onClick={() => {
                const ids = columns.none.map((c) => c.id).filter(Boolean) as string[];
                selectIds(ids);
              }}
            >
              Selecionar todos desta coluna
            </button>
            {searchQuery.trim() && filteredColumns.none.length > 0 && (
              <button
                type="button"
                className="estagio-link-button"
                disabled={isBusy}
                onClick={() => {
                  const ids = filteredColumns.none
                    .map((c) => c.id)
                    .filter(Boolean) as string[];
                  selectIds(ids);
                }}
              >
                Selecionar só os visíveis ({filteredColumns.none.length})
              </button>
            )}
          </div>
          <p className="estagio-column-help">
            Candidatos fora das etapas configuradas ou ainda não classificados.
          </p>
          <ul className="estagio-card-list">
            {filteredColumns.none.map((c) => {
              const id = c.id!;
              const checked = selectedIds.has(id);
              return (
                <li key={c.id} className={`estagio-card${checked ? ' estagio-card-selected' : ''}`}>
                  <label className="estagio-card-row">
                    <input
                      type="checkbox"
                      className="estagio-card-check"
                      checked={checked}
                      disabled={isBusy}
                      onChange={() => toggleSelect(id)}
                    />
                    <div className="estagio-card-main">
                      <strong>{c.name || 'Sem nome'}</strong>
                      {c.document && (
                        <span className="estagio-card-meta">Doc.: {c.document}</span>
                      )}
                      {c.whatsapp && (
                        <span className="estagio-card-meta">{c.whatsapp}</span>
                      )}
                      {c.email && (
                        <span className="estagio-card-meta">{c.email}</span>
                      )}
                    </div>
                  </label>
                  {definitions.length > 0 && (
                    <select
                      className="estagio-select"
                      disabled={movingId === c.id || bulkBusy}
                      value=""
                      onChange={(e) => {
                        const v = e.target.value;
                        e.target.value = '';
                        if (!v || !c.id) return;
                        void assignCandidate(c.id, v);
                      }}
                    >
                      <option value="">Colocar na etapa…</option>
                      {definitions.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {definitions.map((d) => {
          const listFull = columns.byCode.get(d.code) ?? [];
          const list = filteredColumns.byCode.get(d.code) ?? [];
          return (
            <div key={d.code} className="estagio-column">
              <div className="estagio-column-head">
                <h3>{d.name}</h3>
                <span className="estagio-count">
                  {searchQuery.trim()
                    ? `${list.length} / ${listFull.length}`
                    : listFull.length}
                </span>
              </div>
              <div className="estagio-column-actions">
                <button
                  type="button"
                  className="estagio-link-button"
                  disabled={isBusy || listFull.length === 0}
                  onClick={() => {
                    const ids = listFull.map((c) => c.id).filter(Boolean) as string[];
                    selectIds(ids);
                  }}
                >
                  Selecionar todos desta coluna
                </button>
                {searchQuery.trim() && list.length > 0 && (
                  <button
                    type="button"
                    className="estagio-link-button"
                    disabled={isBusy}
                    onClick={() => {
                      const ids = list.map((c) => c.id).filter(Boolean) as string[];
                      selectIds(ids);
                    }}
                  >
                    Selecionar só os visíveis ({list.length})
                  </button>
                )}
              </div>
              <ul className="estagio-card-list">
                {list.map((c) => {
                  const id = c.id!;
                  const checked = selectedIds.has(id);
                  return (
                    <li
                      key={c.id}
                      className={`estagio-card${checked ? ' estagio-card-selected' : ''}`}
                    >
                      <label className="estagio-card-row">
                        <input
                          type="checkbox"
                          className="estagio-card-check"
                          checked={checked}
                          disabled={isBusy}
                          onChange={() => toggleSelect(id)}
                        />
                        <div className="estagio-card-main">
                          <strong>{c.name || 'Sem nome'}</strong>
                          {c.document && (
                            <span className="estagio-card-meta">Doc.: {c.document}</span>
                          )}
                          {c.whatsapp && (
                            <span className="estagio-card-meta">{c.whatsapp}</span>
                          )}
                          {c.email && (
                            <span className="estagio-card-meta">{c.email}</span>
                          )}
                        </div>
                      </label>
                      <div className="estagio-card-actions">
                        <select
                          className="estagio-select"
                          disabled={movingId === c.id || bulkBusy}
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            e.target.value = '';
                            if (!c.id) return;
                            if (v === '__none') void assignCandidate(c.id, null);
                            else if (v) void assignCandidate(c.id, v);
                          }}
                        >
                          <option value="">Mover para…</option>
                          <option value="__none">Nenhuma etapa listada</option>
                          {definitions
                            .filter((x) => x.code !== d.code)
                            .map((x) => (
                              <option key={x.code} value={x.code}>
                                {x.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
};
