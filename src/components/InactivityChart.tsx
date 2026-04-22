import { useEffect, useMemo, useState } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import type { CandidateStageRecord } from '../types/candidateStage';
import { ESTAGIO_STAGES } from '../config/estagioStages';
import { fetchAllCandidateStagesMap } from '../utils/candidateStageApi';
import { getCandidateEtapa } from '../utils/etapaUtils';

interface InactivityChartProps {
  institutionId?: string | null;
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  onInactivityClick?: (type: 'finalized' | 'notFinalized' | number) => void;
  selectedInactivities?: ('finalized' | 'notFinalized' | number)[];
}

interface StageData {
  stage: string;
  quantidade: number;
}

function pickLatestRecord(stages: CandidateStageRecord[]): CandidateStageRecord | null {
  const withDate = stages.filter((s) => s.enabledAt);
  if (withDate.length > 0) {
    return withDate.reduce((a, b) => {
      const ta = new Date(a.enabledAt || '').getTime() || 0;
      const tb = new Date(b.enabledAt || '').getTime() || 0;
      return tb >= ta ? b : a;
    });
  }
  const withId = stages.filter((s) => s.id != null);
  if (withId.length === 0) return null;
  return withId.reduce((a, b) => ((a.id || 0) > (b.id || 0) ? a : b));
}

export const InactivityChart = ({
  institutionId = null,
  candidates,
  answersMap,
  onInactivityClick,
  selectedInactivities = [],
}: InactivityChartProps) => {
  const isSelected = (type: 'finalized' | 'notFinalized' | number) =>
    selectedInactivities.some((s) => s === type || (typeof s === 'number' && typeof type === 'number' && s === type));

  const [stageMap, setStageMap] = useState<Map<string, CandidateStageRecord[]>>(
    () => new Map()
  );
  const [isLoadingStages, setIsLoadingStages] = useState(false);

  const stageNameByCode = useMemo(
    () => new Map(ESTAGIO_STAGES.map((s) => [s.code, s.name])),
    []
  );

  useEffect(() => {
    if (!institutionId || candidates.length === 0) {
      setStageMap(new Map());
      setIsLoadingStages(false);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      setIsLoadingStages(true);
      try {
        const next = await fetchAllCandidateStagesMap(institutionId, candidates, {
          signal: ac.signal,
        });
        if (!cancelled) {
          setStageMap(next);
        }
      } catch {
        if (!cancelled) {
          setStageMap(new Map());
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStages(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [institutionId, candidates]);

  const chartData = useMemo(() => {
    const finalized: Candidate[] = [];
    const notFinalized: Candidate[] = [];
    const stageCountMap = new Map<string, number>();

    // Separar candidatos finalizados/não finalizados
    candidates.forEach((candidate) => {
      const etapa = getCandidateEtapa(candidate.id || '', answersMap);
      if (etapa === 'Finalizou') {
        finalized.push(candidate);
      } else {
        notFinalized.push(candidate);
      }

      // Contagem de stage para TODOS os candidatos (não só não finalizados)
      const candidateStages = stageMap.get(candidate.id || '') || [];
      const latest = pickLatestRecord(candidateStages);
      const stageCode = latest?.code || '';
      const stageLabel = stageNameByCode.get(stageCode) || (stageCode ? stageCode : 'Sem stage');
      stageCountMap.set(stageLabel, (stageCountMap.get(stageLabel) || 0) + 1);
    });

    const displayOrder = ['Sem stage', ...ESTAGIO_STAGES.map((s) => s.name)];
    const stageData: StageData[] = Array.from(stageCountMap.entries())
      .map(([stage, quantidade]) => ({ stage, quantidade }))
      .sort((a, b) => {
        const ai = displayOrder.indexOf(a.stage);
        const bi = displayOrder.indexOf(b.stage);
        const normalizedA = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const normalizedB = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        if (normalizedA !== normalizedB) return normalizedA - normalizedB;
        return a.stage.localeCompare(b.stage, 'pt-BR');
      });

    return {
      finalized: finalized.length,
      notFinalized: notFinalized.length,
      stageData,
    };
  }, [answersMap, candidates, stageMap, stageNameByCode]);

  const maxQuantidade = Math.max(
    ...chartData.stageData.map((d) => d.quantidade),
    chartData.finalized,
    chartData.notFinalized,
    1
  );

  if (candidates.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Finalizados e Inatividade</h3>
        <div className="empty-message">
          Nenhum candidato selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Finalizados e Inatividade</h3>
        <span className="chart-total">Total: {candidates.length}</span>
      </div>
      <div className="chart-content">
        {/* Barra de Finalizados - clicável para filtrar */}
        <div
          className={`chart-bar-item ${isSelected('finalized') ? 'selected' : ''} ${
            chartData.finalized > 0 ? 'clickable' : ''
          }`}
          onClick={() => {
            if (chartData.finalized > 0 && onInactivityClick) {
              onInactivityClick('finalized');
            }
          }}
        >
          <div className="chart-bar-label">
            <span className="chart-bar-name">✅ Finalizados</span>
            <span className="chart-bar-value">
              {chartData.finalized}
              {candidates.length > 0 && (
                <span className="chart-bar-percentage">
                  {' '}
                  ({Math.round((chartData.finalized / candidates.length) * 100)}%)
                </span>
              )}
            </span>
          </div>
          <div className="chart-bar-wrapper">
            <div
              className="chart-bar"
              style={{
                width: `${(chartData.finalized / maxQuantidade) * 100}%`,
              }}
            >
              <span className="chart-bar-fill"></span>
            </div>
          </div>
        </div>

        {/* Barra de Não Finalizados - clicável para filtrar */}
        <div
          className={`chart-bar-item ${isSelected('notFinalized') ? 'selected' : ''} ${
            chartData.notFinalized > 0 ? 'clickable' : ''
          }`}
          onClick={() => {
            if (chartData.notFinalized > 0 && onInactivityClick) {
              onInactivityClick('notFinalized');
            }
          }}
        >
          <div className="chart-bar-label">
            <span className="chart-bar-name">⏸️ Não Finalizados</span>
            <span className="chart-bar-value">
              {chartData.notFinalized}
              {candidates.length > 0 && (
                <span className="chart-bar-percentage">
                  {' '}
                  ({Math.round((chartData.notFinalized / candidates.length) * 100)}%)
                </span>
              )}
            </span>
          </div>
          <div className="chart-bar-wrapper">
            <div
              className="chart-bar"
              style={{
                width: `${(chartData.notFinalized / maxQuantidade) * 100}%`,
              }}
            >
              <span className="chart-bar-fill"></span>
            </div>
          </div>
        </div>

        {/* Separador */}
        {chartData.stageData.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            marginBottom: '0.5rem', 
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Stages (Todos os candidatos)
          </div>
        )}

        {/* Gráfico de stages */}
        {isLoadingStages ? (
          <div className="empty-message" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
            Carregando stages da API...
          </div>
        ) : chartData.stageData.length === 0 ? (
          <div className="empty-message" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
            Nenhum dado de stage disponível
          </div>
        ) : (
          chartData.stageData.map((item) => {
            return (
              <div
                key={item.stage}
                className="chart-bar-item"
              >
                <div className="chart-bar-label">
                  <span className="chart-bar-name">{item.stage}</span>
                  <span className="chart-bar-value">
                    {item.quantidade}
                    {candidates.length > 0 && (
                      <span className="chart-bar-percentage">
                        {' '}
                        ({Math.round((item.quantidade / candidates.length) * 100)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{
                      width: `${(item.quantidade / maxQuantidade) * 100}%`,
                    }}
                  >
                    <span className="chart-bar-fill"></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

