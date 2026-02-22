import { useState, useRef, useEffect } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { EtapasChart } from './EtapasChart';
import { AnswersChart } from './AnswersChart';

interface SelectableChartProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  chartId: number;
  defaultChartType?: 'etapas' | 'answers';
  defaultQuestion?: number;
}

type ChartType = 'etapas' | 'answers' | 'none';

export const SelectableChart = ({
  candidates,
  answersMap,
  chartId,
  defaultChartType,
  defaultQuestion,
}: SelectableChartProps) => {
  const [selectedChartType, setSelectedChartType] = useState<ChartType>(
    defaultChartType || 'none'
  );
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const chartTypes: { value: ChartType; label: string }[] = [
    { value: 'none', label: 'Nenhum' },
    { value: 'etapas', label: 'Gráfico de Etapas' },
    { value: 'answers', label: 'Gráfico de Respostas' },
  ];

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleChartTypeSelect = (type: ChartType) => {
    setSelectedChartType(type);
    setIsOpen(false);
  };

  const selectedLabel =
    chartTypes.find((t) => t.value === selectedChartType)?.label || 'Selecione um gráfico';

  return (
    <div className="selectable-chart-container">
      <div className="selectable-chart-header">
        <h4 className="selectable-chart-title">Gráfico {chartId}</h4>
        <div className="chart-type-selector" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`chart-type-button ${isOpen ? 'open' : ''}`}
          >
            <span className="chart-type-text">{selectedLabel}</span>
            <svg
              className="arrow-icon"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 4L6 8L10 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isOpen && (
            <div className="chart-type-dropdown">
              <div className="chart-type-dropdown-list">
                {chartTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleChartTypeSelect(type.value)}
                    className={`chart-type-dropdown-item ${
                      selectedChartType === type.value ? 'selected' : ''
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="selectable-chart-content">
        {selectedChartType === 'none' && (
          <div className="empty-message">
            Selecione um tipo de gráfico para visualizar
          </div>
        )}
        {selectedChartType === 'etapas' && (
          <EtapasChart
            candidates={candidates}
            answersMap={answersMap}
          />
        )}
        {selectedChartType === 'answers' && (
          <AnswersChart
            candidates={candidates}
            answersMap={answersMap}
            defaultQuestion={defaultQuestion}
          />
        )}
      </div>
    </div>
  );
};
