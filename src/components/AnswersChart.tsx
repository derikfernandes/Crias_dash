import { useState, useMemo, useRef, useEffect } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { QUESTIONS } from '../utils/questions';
import { getFormattedAnswer } from '../utils/answerMappings';
import { getEtapa } from '../utils/etapaUtils';

interface AnswersChartProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  onAnswerClick?: (question: number | null, answer: string | null) => void;
  selectedAnswerFilters?: { question: number; answer: string }[];
  defaultQuestion?: number;
}

interface AnswerData {
  value: string;
  formattedValue: string;
  quantidade: number;
}

export const AnswersChart = ({
  candidates,
  answersMap,
  onAnswerClick,
  selectedAnswerFilters = [],
  defaultQuestion,
}: AnswersChartProps) => {
  const [localSelectedQuestion, setLocalSelectedQuestion] = useState<
    number | null
  >(defaultQuestion ?? null);
  const [selectedEtapa, setSelectedEtapa] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEtapaOpen, setIsEtapaOpen] = useState(false);
  const [searchTermEtapa, setSearchTermEtapa] = useState('');
  const [searchTermQuestion, setSearchTermQuestion] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const etapaDropdownRef = useRef<HTMLDivElement>(null);
  const etapaInputRef = useRef<HTMLInputElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = localSelectedQuestion;

  // Lista de etapas disponíveis
  const etapas = [
    'Inicial',
    'Conhecendo Você',
    'Conhecendo sua Família',
    'Formulário Socioeconômico',
    'Sobre sua participação',
    'Finalizou',
  ];

  // Obter lista de questões disponíveis (IDs 1 a 66), filtradas por etapa se selecionada
  const availableQuestions = useMemo(() => {
    const allQuestions = Array.from({ length: 66 }, (_, i) => i + 1).filter((q) => {
      // Verificar se pelo menos um candidato tem resposta para esta questão
      return Array.from(answersMap.values()).some((answers) =>
        answers.some((answer) => answer.question !== undefined && answer.question === q)
      );
    });

    // Se uma etapa foi selecionada, filtrar questões dessa etapa
    if (selectedEtapa) {
      return allQuestions.filter((q) => {
        const etapaDaQuestao = getEtapa(q);
        return etapaDaQuestao === selectedEtapa;
      });
    }

    return allQuestions;
  }, [answersMap, selectedEtapa]);

  // Filtrar etapas baseado no termo de busca
  const filteredEtapas = useMemo(() => {
    if (!searchTermEtapa.trim()) {
      return etapas;
    }
    const searchLower = searchTermEtapa.toLowerCase();
    return etapas.filter((etapa) =>
      etapa.toLowerCase().includes(searchLower)
    );
  }, [searchTermEtapa]);

  // Filtrar questões baseado no termo de busca
  const filteredQuestions = useMemo(() => {
    if (!searchTermQuestion.trim()) {
      return availableQuestions;
    }
    const searchLower = searchTermQuestion.toLowerCase();
    return availableQuestions.filter((question) => {
      const questionText = QUESTIONS[question] || `Questão ${question}`;
      const questionNumber = `Q${question}`;
      return (
        questionNumber.toLowerCase().includes(searchLower) ||
        questionText.toLowerCase().includes(searchLower)
      );
    });
  }, [availableQuestions, searchTermQuestion]);

  // Dados do gráfico baseado na questão selecionada
  const chartData = useMemo(() => {
    if (currentQuestion === null) {
      return { data: [], totalWithAnswer: 0 };
    }

    const answerCounts = new Map<string, number>();
    let totalWithAnswer = 0;

    candidates.forEach((candidate) => {
      if (!candidate.id) return;
      const answers = answersMap.get(candidate.id) || [];
      const answer = answers.find((a) => a.question !== undefined && a.question === currentQuestion);

      if (answer && answer.answer) {
        totalWithAnswer++;
        const answerValue = answer.answer;
        answerCounts.set(
          answerValue,
          (answerCounts.get(answerValue) || 0) + 1
        );
      }
    });

    // Converter para array e ordenar por quantidade (maior primeiro)
    const data: AnswerData[] = Array.from(answerCounts.entries())
      .map(([value, quantidade]) => {
        const formattedValue = getFormattedAnswer(currentQuestion, value);
        return {
          value,
          formattedValue: formattedValue !== value ? formattedValue : value,
          quantidade,
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade);

    return { data, totalWithAnswer };
  }, [candidates, answersMap, currentQuestion]);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        etapaDropdownRef.current &&
        !etapaDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEtapaOpen(false);
      }
    };

    if (isOpen || isEtapaOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isEtapaOpen]);

  const handleQuestionSelect = (question: number) => {
    setLocalSelectedQuestion(question);
    setIsOpen(false);
    setSearchTermQuestion('');
    if (onAnswerClick) {
      onAnswerClick(null, null); // Limpar seleção de resposta ao trocar questão
    }
  };

  const handleEtapaSelect = (etapa: string | null) => {
    setSelectedEtapa(etapa);
    setIsEtapaOpen(false);
    setSearchTermEtapa('');
    // Limpar questão selecionada ao mudar etapa
    setLocalSelectedQuestion(null);
    setSearchTermQuestion('');
    if (onAnswerClick) {
      onAnswerClick(null, null);
    }
  };

  // Handlers para o input de etapa
  const handleEtapaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTermEtapa(value);
    // Se o usuário começar a digitar, limpar a seleção
    if (value.trim() && selectedEtapa) {
      setSelectedEtapa(null);
    }
    if (value.trim() && !isEtapaOpen) {
      setIsEtapaOpen(true);
    }
  };

  const handleEtapaInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredEtapas.length > 0) {
      e.preventDefault();
      // Selecionar a primeira etapa filtrada
      handleEtapaSelect(filteredEtapas[0]);
    } else if (e.key === 'Escape') {
      setIsEtapaOpen(false);
      setSearchTermEtapa('');
      if (selectedEtapa) {
        // Restaurar o valor selecionado
        etapaInputRef.current?.blur();
      } else {
        etapaInputRef.current?.blur();
      }
    }
  };

  const handleEtapaInputFocus = () => {
    setIsEtapaOpen(true);
  };

  // Handlers para o input de questão
  const handleQuestionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTermQuestion(value);
    // Se o usuário começar a digitar, limpar a seleção
    if (value.trim() && currentQuestion !== null) {
      setLocalSelectedQuestion(null);
      if (onAnswerClick) {
        onAnswerClick(null, null);
      }
    }
    if (value.trim() && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleQuestionInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredQuestions.length > 0) {
      e.preventDefault();
      handleQuestionSelect(filteredQuestions[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTermQuestion('');
      questionInputRef.current?.blur();
    }
  };

  const handleQuestionInputFocus = () => {
    setIsOpen(true);
  };

  const handleAnswerClick = (answerValue: string) => {
    if (onAnswerClick && currentQuestion !== null) {
      onAnswerClick(currentQuestion, answerValue);
    }
  };

  const maxQuantidade = Math.max(
    ...chartData.data.map((d) => d.quantidade),
    1
  );

  const questionText =
    currentQuestion !== null
      ? QUESTIONS[currentQuestion] || `Questão ${currentQuestion}`
      : 'Selecione uma questão';

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Gráfico das respostas dos Candidatos</h3>
      </div>

      {/* Seletor de etapa - campo pesquisável */}
      <div className="etapa-selector-wrapper">
        <label className="etapa-selector-label">Filtrar por Etapa:</label>
        <div className="question-selector-container" ref={etapaDropdownRef}>
          <div className="select-input-wrapper">
            <input
              ref={etapaInputRef}
              type="text"
              value={searchTermEtapa || (selectedEtapa !== null ? selectedEtapa : '')}
              onChange={handleEtapaInputChange}
              onKeyDown={handleEtapaInputKeyDown}
              onFocus={handleEtapaInputFocus}
              placeholder={selectedEtapa ? selectedEtapa : "Digite para pesquisar..."}
              className={`select-input etapa-select-input ${isEtapaOpen ? 'open' : ''} ${selectedEtapa ? 'has-selection' : ''}`}
            />
            <button
              type="button"
              className={`select-arrow-button ${isEtapaOpen ? 'open' : ''}`}
              onClick={() => {
                setIsEtapaOpen(!isEtapaOpen);
                if (!isEtapaOpen) {
                  etapaInputRef.current?.focus();
                }
              }}
            >
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
          </div>

          {isEtapaOpen && (
            <div className="question-dropdown">
              <div className="question-dropdown-list">
                <button
                  onClick={() => handleEtapaSelect(null)}
                  className={`question-dropdown-item ${
                    selectedEtapa === null ? 'selected' : ''
                  }`}
                >
                  <span className="question-text">🔍 Todas as etapas</span>
                </button>
                {filteredEtapas.length === 0 ? (
                  <div className="question-dropdown-item no-results">
                    Nenhuma etapa encontrada
                  </div>
                ) : (
                  filteredEtapas.map((etapa) => (
                    <button
                      key={etapa}
                      onClick={() => handleEtapaSelect(etapa)}
                      className={`question-dropdown-item ${
                        selectedEtapa === etapa ? 'selected' : ''
                      }`}
                    >
                      <span className="question-text">📋 {etapa}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        {selectedEtapa && (
          <button
            className="clear-etapa-button"
            onClick={() => handleEtapaSelect(null)}
            title="Limpar filtro de etapa"
          >
            ✕
          </button>
        )}
      </div>

      {/* Seletor de questão - campo pesquisável */}
      <div className="etapa-selector-wrapper">
        <label className="etapa-selector-label">Enunciado:</label>
        <div className="question-selector-container" ref={dropdownRef}>
        <div className="select-input-wrapper">
          <input
            ref={questionInputRef}
            type="text"
            value={
              searchTermQuestion ||
              (currentQuestion !== null
                ? `Q${currentQuestion}: ${questionText.substring(0, 50)}${questionText.length > 50 ? '...' : ''}`
                : '')
            }
            onChange={handleQuestionInputChange}
            onKeyDown={handleQuestionInputKeyDown}
            onFocus={handleQuestionInputFocus}
            placeholder={
              currentQuestion !== null
                ? `Q${currentQuestion}: ${questionText.substring(0, 50)}${questionText.length > 50 ? '...' : ''}`
                : "Digite para pesquisar..."
            }
            className={`select-input question-select-input ${isOpen ? 'open' : ''}`}
          />
          <button
            type="button"
            className={`select-arrow-button ${isOpen ? 'open' : ''}`}
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) {
                questionInputRef.current?.focus();
              }
            }}
          >
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
        </div>

        {isOpen && (
          <div className="question-dropdown">
            <div className="question-dropdown-list">
              {filteredQuestions.length === 0 ? (
                <div className="question-dropdown-item no-results">
                  {selectedEtapa
                    ? `Nenhuma questão encontrada na etapa "${selectedEtapa}"`
                    : 'Nenhuma questão encontrada'}
                </div>
              ) : (
                filteredQuestions.map((question) => {
                  const qText = QUESTIONS[question] || `Questão ${question}`;
                  return (
                    <button
                      key={question}
                      onClick={() => handleQuestionSelect(question)}
                      className={`question-dropdown-item ${
                        currentQuestion === question ? 'selected' : ''
                      }`}
                    >
                      <span className="question-number">Q{question}:</span>
                      <span className="question-text">
                        {qText.substring(0, 60)}
                        {qText.length > 60 ? '...' : ''}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Gráfico */}
      {currentQuestion === null ? (
        <div className="empty-message">
          Selecione uma questão para ver as respostas
        </div>
      ) : chartData.data.length === 0 ? (
        <div className="empty-message">
          Nenhuma resposta encontrada para esta questão
        </div>
      ) : (
        <>
          <div className="chart-total-info">
            <span className="chart-total">
              Total com resposta: {chartData.totalWithAnswer} de{' '}
              {candidates.length}
            </span>
          </div>
          <div className="chart-content">
            {chartData.data.map((item) => {
              const isSelected = selectedAnswerFilters.some(
                (f) => f.question === currentQuestion && f.answer === item.value
              );
              return (
                <div
                  key={item.value}
                  className={`chart-bar-item ${isSelected ? 'selected' : ''} ${
                    item.quantidade > 0 ? 'clickable' : ''
                  }`}
                  onClick={() => {
                    if (item.quantidade > 0) {
                      handleAnswerClick(item.value);
                    }
                  }}
                >
                  <div className="chart-bar-label">
                    <span className="chart-bar-name" title={item.formattedValue}>
                      {item.formattedValue.length > 40
                        ? `${item.formattedValue.substring(0, 40)}...`
                        : item.formattedValue}
                    </span>
                    <span className="chart-bar-value">
                      {item.quantidade}
                      {chartData.totalWithAnswer > 0 && (
                        <span className="chart-bar-percentage">
                          {' '}
                          (
                          {Math.round(
                            (item.quantidade / chartData.totalWithAnswer) * 100
                          )}
                          %)
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
            })}
          </div>
        </>
      )}
    </div>
  );
};

