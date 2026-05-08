import { useMemo } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import type { CandidateStageRecord } from '../types/candidateStage';
import { ESTAGIO_STAGES } from '../config/estagioStages';
import { getFinalizationQuestionForStages } from '../utils/finalizationRules';

interface InactivityChartProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  onInactivityClick?: (type: 'finalized' | 'notFinalized' | number) => void;
  selectedInactivities?: ('finalized' | 'notFinalized' | number)[];
  stageMap?: Map<string, CandidateStageRecord[]>;
  isLoadingStages?: boolean;
  stagesLoadProgress?: number;
  onStageClick?: (stage: string) => void;
  selectedStages?: string[];
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
  candidates,
  answersMap,
  onInactivityClick,
  selectedInactivities = [],
  stageMap = new Map(),
  isLoadingStages = false,
  stagesLoadProgress = 0,
  onStageClick,
  selectedStages = [],
}: InactivityChartProps) => {
  const isSelected = (type: 'finalized' | 'notFinalized' | number) =>
    selectedInactivities.some((s) => s === type || (typeof s === 'number' && typeof type === 'number' && s === type));
  const isStageSelected = (stage: string) => selectedStages.includes(stage);

  const stageNameByCode = useMemo(
    () => new Map(ESTAGIO_STAGES.map((s) => [s.code, s.name])),
    []
  );

  const getCandidateStageName = (candidateId?: string): string => {
    if (!candidateId) return 'Sem stage';
    const candidateStages = stageMap.get(candidateId) || [];
    const latest = pickLatestRecord(candidateStages);
    const stageCode = latest?.code || '';
    return stageNameByCode.get(stageCode) || (stageCode ? stageCode : 'Sem stage');
  };

  const chartData = useMemo(() => {
    const finalizationQuestion = getFinalizationQuestionForStages(selectedStages);
    const scopedCandidates =
      selectedStages.length > 0
        ? candidates.filter((candidate) =>
            selectedStages.includes(getCandidateStageName(candidate.id))
          )
        : candidates;

    const finalized: Candidate[] = [];
    const notFinalized: Candidate[] = [];
    const stageCountMap = new Map<string, number>();

    // Separar candidatos finalizados/não finalizados conforme etapa selecionada
    scopedCandidates.forEach((candidate) => {
      const answers = answersMap.get(candidate.id || '') || [];
      const isFinalized = answers.some(
        (a) => a.question !== undefined && a.question === finalizationQuestion
      );
      if (isFinalized) {
        finalized.push(candidate);
      } else {
        notFinalized.push(candidate);
      }

      // Contagem de stage para todos os candidatos no escopo atual
      const stageLabel = getCandidateStageName(candidate.id);
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
      total: scopedCandidates.length,
      finalized: finalized.length,
      notFinalized: notFinalized.length,
      stageData,
    };
  }, [answersMap, candidates, stageMap, stageNameByCode, selectedStages]);

  const maxQuantidade = Math.max(
    ...chartData.stageData.map((d) => d.quantidade),
    chartData.finalized,
    chartData.notFinalized,
    1
  );

  if (chartData.total === 0) {
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
        <span className="chart-total">Total: {chartData.total}</span>
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
              {chartData.total > 0 && (
                <span className="chart-bar-percentage">
                  {' '}
                  ({Math.round((chartData.finalized / chartData.total) * 100)}%)
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
              {chartData.total > 0 && (
                <span className="chart-bar-percentage">
                  {' '}
                  ({Math.round((chartData.notFinalized / chartData.total) * 100)}%)
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
            Carregando stages da API... {stagesLoadProgress}%
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
                className={`chart-bar-item ${isStageSelected(item.stage) ? 'selected' : ''} ${
                  item.quantidade > 0 ? 'clickable' : ''
                }`}
                onClick={() => {
                  if (item.quantidade > 0 && onStageClick) {
                    onStageClick(item.stage);
                  }
                }}
              >
                <div className="chart-bar-label">
                  <span className="chart-bar-name">{item.stage}</span>
                  <span className="chart-bar-value">
                    {item.quantidade}
                    {chartData.total > 0 && (
                      <span className="chart-bar-percentage">
                        {' '}
                        ({Math.round((item.quantidade / chartData.total) * 100)}%)
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

