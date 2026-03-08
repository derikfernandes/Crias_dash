import { useMemo } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { getCandidateEtapa } from '../utils/etapaUtils';

interface InactivityChartProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  onInactivityClick?: (type: 'finalized' | 'notFinalized' | number) => void;
  selectedInactivities?: ('finalized' | 'notFinalized' | number)[];
}

interface InactivityData {
  days: number;
  quantidade: number;
}

export const InactivityChart = ({
  candidates,
  answersMap,
  onInactivityClick,
  selectedInactivities = [],
}: InactivityChartProps) => {
  const isSelected = (type: 'finalized' | 'notFinalized' | number) =>
    selectedInactivities.some((s) => s === type || (typeof s === 'number' && typeof type === 'number' && s === type));
  const chartData = useMemo(() => {
    const finalized: Candidate[] = [];
    const notFinalized: Candidate[] = [];

    // Separar candidatos que finalizaram dos que não finalizaram
    candidates.forEach((candidate) => {
      const etapa = getCandidateEtapa(candidate.id || '', answersMap);
      if (etapa === 'Finalizou') {
        finalized.push(candidate);
      } else {
        notFinalized.push(candidate);
      }
    });

    // Calcular dias de inatividade para os que não finalizaram
    const inactivityMap = new Map<number, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    notFinalized.forEach((candidate) => {
      if (!candidate.id) return;
      
      const answers = answersMap.get(candidate.id) || [];
      
      if (answers.length === 0) {
        // Se não tem respostas, considerar como inatividade desde a criação do candidato
        if (candidate.createdAt) {
          try {
            const createdDate = new Date(candidate.createdAt);
            createdDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            const days = Math.max(0, daysDiff);
            inactivityMap.set(days, (inactivityMap.get(days) || 0) + 1);
          } catch (e) {
            // Ignorar erros de data inválida
          }
        }
      } else {
        // Encontrar a última resposta
        let lastAnswerDate: Date | null = null;
        answers.forEach((answer) => {
          if (answer.answeredAt) {
            try {
              const answerDate = new Date(answer.answeredAt);
              if (!lastAnswerDate || answerDate > lastAnswerDate) {
                lastAnswerDate = answerDate;
              }
            } catch (e) {
              // Ignorar erros de data inválida
            }
          }
        });

        if (lastAnswerDate) {
          const lastDate = new Date(lastAnswerDate);
          lastDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          const days = Math.max(0, daysDiff);
          inactivityMap.set(days, (inactivityMap.get(days) || 0) + 1);
        }
      }
    });

    // Converter para array e ordenar por dias
    const inactivityData: InactivityData[] = Array.from(inactivityMap.entries())
      .map(([days, quantidade]) => ({ days, quantidade }))
      .sort((a, b) => a.days - b.days);

    return {
      finalized: finalized.length,
      notFinalized: notFinalized.length,
      inactivityData,
    };
  }, [candidates, answersMap]);

  const maxQuantidade = Math.max(
    ...chartData.inactivityData.map((d) => d.quantidade),
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
        {chartData.inactivityData.length > 0 && (
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
            Dias de Inatividade (Não Finalizados)
          </div>
        )}

        {/* Gráfico de dias de inatividade */}
        {chartData.inactivityData.length === 0 ? (
          <div className="empty-message" style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
            Nenhum dado de inatividade disponível
          </div>
        ) : (
          chartData.inactivityData.map((item) => {
            const itemSelected = isSelected(item.days);
            return (
              <div
                key={item.days}
                className={`chart-bar-item ${itemSelected ? 'selected' : ''} ${
                  item.quantidade > 0 ? 'clickable' : ''
                }`}
                onClick={() => {
                  if (item.quantidade > 0 && onInactivityClick) {
                    onInactivityClick(item.days);
                  }
                }}
              >
                <div className="chart-bar-label">
                  <span className="chart-bar-name">
                    {item.days === 0 
                      ? 'Hoje' 
                      : item.days === 1 
                      ? '1 dia' 
                      : `${item.days} dias`}
                  </span>
                  <span className="chart-bar-value">
                    {item.quantidade}
                    {chartData.notFinalized > 0 && (
                      <span className="chart-bar-percentage">
                        {' '}
                        ({Math.round((item.quantidade / chartData.notFinalized) * 100)}%)
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

