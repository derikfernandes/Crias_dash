import { useState, useRef, useEffect, useMemo } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { AnswerTable } from './AnswerTable';
import { QUESTIONS } from '../utils/questions';
import { getEtapa } from '../utils/etapaUtils';

interface CandidateAnswersPanelProps {
  candidate: Candidate | null;
  answers: Answer[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onEditClick?: (answer: Answer) => void;
  onDeleteClick?: (answerId: string) => void;
  deleteLoadingId?: string | null;
  onExport?: (format: 'csv' | 'xlsx') => void;
  isExporting?: boolean;
}

export const CandidateAnswersPanel = ({
  candidate,
  answers,
  isLoading,
  error,
  onRetry,
  onEditClick,
  onDeleteClick,
  deleteLoadingId,
  onExport,
  isExporting,
}: CandidateAnswersPanelProps) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [selectedEtapaFilter, setSelectedEtapaFilter] = useState<string | null>(null);
  const [selectedEnunciadoFilter, setSelectedEnunciadoFilter] = useState<number | null>(null);
  const [isEtapaFilterOpen, setIsEtapaFilterOpen] = useState(false);
  const [isEnunciadoFilterOpen, setIsEnunciadoFilterOpen] = useState(false);
  const [searchTermEtapa, setSearchTermEtapa] = useState('');
  const [searchTermEnunciado, setSearchTermEnunciado] = useState('');
  const etapaFilterRef = useRef<HTMLDivElement>(null);
  const enunciadoFilterRef = useRef<HTMLDivElement>(null);
  const etapaInputRef = useRef<HTMLInputElement>(null);
  const enunciadoInputRef = useRef<HTMLInputElement>(null);

  // Lista de etapas disponíveis
  const etapas = [
    'Inicial',
    'Conhecendo Você',
    'Conhecendo sua Família',
    'Formulário Socioeconômico',
    'Sobre sua participação',
    'Finalizou',
  ];

  // Obter questões únicas das respostas
  const availableQuestions = useMemo(() => {
    const questionSet = new Set<number>();
    answers.forEach((answer) => {
      if (answer.question !== undefined) {
        questionSet.add(answer.question);
      }
    });
    return Array.from(questionSet).sort((a, b) => a - b);
  }, [answers]);

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
    if (!searchTermEnunciado.trim()) {
      return availableQuestions;
    }
    const searchLower = searchTermEnunciado.toLowerCase();
    return availableQuestions.filter((question) => {
      const questionText = QUESTIONS[question] || `Questão ${question}`;
      const questionNumber = `Q${question}`;
      return (
        questionNumber.toLowerCase().includes(searchLower) ||
        questionText.toLowerCase().includes(searchLower)
      );
    });
  }, [availableQuestions, searchTermEnunciado]);

  // Filtrar respostas baseado nos filtros selecionados
  const filteredAnswers = useMemo(() => {
    let filtered = answers;

    if (selectedEtapaFilter) {
      filtered = filtered.filter((answer) => {
        if (answer.question === undefined) return false;
        const etapa = getEtapa(answer.question);
        return etapa === selectedEtapaFilter;
      });
    }

    if (selectedEnunciadoFilter !== null) {
      filtered = filtered.filter((answer) => answer.question === selectedEnunciadoFilter);
    }

    return filtered;
  }, [answers, selectedEtapaFilter, selectedEnunciadoFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
      if (
        etapaFilterRef.current &&
        !etapaFilterRef.current.contains(event.target as Node)
      ) {
        setIsEtapaFilterOpen(false);
      }
      if (
        enunciadoFilterRef.current &&
        !enunciadoFilterRef.current.contains(event.target as Node)
      ) {
        setIsEnunciadoFilterOpen(false);
      }
    };

    if (showExportMenu || isEtapaFilterOpen || isEnunciadoFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu, isEtapaFilterOpen, isEnunciadoFilterOpen]);

  // Handlers para o filtro de etapa
  const handleEtapaFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTermEtapa(value);
    if (value.trim() && selectedEtapaFilter) {
      setSelectedEtapaFilter(null);
    }
    if (value.trim() && !isEtapaFilterOpen) {
      setIsEtapaFilterOpen(true);
    }
  };

  const handleEtapaFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredEtapas.length > 0) {
      e.preventDefault();
      handleEtapaSelect(filteredEtapas[0]);
    } else if (e.key === 'Escape') {
      setIsEtapaFilterOpen(false);
      setSearchTermEtapa('');
      etapaInputRef.current?.blur();
    }
  };

  const handleEtapaSelect = (etapa: string | null) => {
    setSelectedEtapaFilter(etapa);
    setIsEtapaFilterOpen(false);
    setSearchTermEtapa('');
  };

  // Handlers para o filtro de enunciado
  const handleEnunciadoFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTermEnunciado(value);
    if (value.trim() && selectedEnunciadoFilter !== null) {
      setSelectedEnunciadoFilter(null);
    }
    if (value.trim() && !isEnunciadoFilterOpen) {
      setIsEnunciadoFilterOpen(true);
    }
  };

  const handleEnunciadoFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredQuestions.length > 0) {
      e.preventDefault();
      handleEnunciadoSelect(filteredQuestions[0]);
    } else if (e.key === 'Escape') {
      setIsEnunciadoFilterOpen(false);
      setSearchTermEnunciado('');
      enunciadoInputRef.current?.blur();
    }
  };

  const handleEnunciadoSelect = (question: number | null) => {
    setSelectedEnunciadoFilter(question);
    setIsEnunciadoFilterOpen(false);
    setSearchTermEnunciado('');
  };

  const handleExportClick = (format: 'csv' | 'xlsx') => {
    if (onExport) {
      onExport(format);
    }
    setShowExportMenu(false);
  };

  if (!candidate) {
    return null;
  }

  return (
    <div className="answers-panel">
      <div className="answers-header">
        <div className="answers-title-container">
          <h2 className="answers-title">Respostas do candidato</h2>
          
          {/* Filtro de Etapa */}
          <div className="etapa-selector-wrapper">
            <label className="etapa-selector-label">Filtrar por Etapa:</label>
            <div className="question-selector-container" ref={etapaFilterRef}>
              <div className="select-input-wrapper">
                <input
                  ref={etapaInputRef}
                  type="text"
                  value={searchTermEtapa || (selectedEtapaFilter !== null ? selectedEtapaFilter : '')}
                  onChange={handleEtapaFilterChange}
                  onKeyDown={handleEtapaFilterKeyDown}
                  onFocus={() => setIsEtapaFilterOpen(true)}
                  placeholder={selectedEtapaFilter ? selectedEtapaFilter : "Digite para pesquisar..."}
                  className={`select-input etapa-select-input ${isEtapaFilterOpen ? 'open' : ''} ${selectedEtapaFilter ? 'has-selection' : ''}`}
                />
                <button
                  type="button"
                  className={`select-arrow-button ${isEtapaFilterOpen ? 'open' : ''}`}
                  onClick={() => {
                    setIsEtapaFilterOpen(!isEtapaFilterOpen);
                    if (!isEtapaFilterOpen) {
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

              {isEtapaFilterOpen && (
                <div className="question-dropdown">
                  <div className="question-dropdown-list">
                    <button
                      onClick={() => handleEtapaSelect(null)}
                      className={`question-dropdown-item ${
                        selectedEtapaFilter === null ? 'selected' : ''
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
                            selectedEtapaFilter === etapa ? 'selected' : ''
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
            {selectedEtapaFilter && (
              <button
                className="clear-etapa-button"
                onClick={() => handleEtapaSelect(null)}
                title="Limpar filtro de etapa"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Enunciado */}
          <div className="etapa-selector-wrapper">
            <label className="etapa-selector-label">Enunciado:</label>
            <div className="question-selector-container" ref={enunciadoFilterRef}>
            <div className="select-input-wrapper">
              <input
                ref={enunciadoInputRef}
                type="text"
                value={
                  searchTermEnunciado ||
                  (selectedEnunciadoFilter !== null
                    ? `Q${selectedEnunciadoFilter}: ${(QUESTIONS[selectedEnunciadoFilter] || '').substring(0, 50)}${(QUESTIONS[selectedEnunciadoFilter] || '').length > 50 ? '...' : ''}`
                    : '')
                }
                onChange={handleEnunciadoFilterChange}
                onKeyDown={handleEnunciadoFilterKeyDown}
                onFocus={() => setIsEnunciadoFilterOpen(true)}
                placeholder={
                  selectedEnunciadoFilter !== null
                    ? `Q${selectedEnunciadoFilter}: ${(QUESTIONS[selectedEnunciadoFilter] || '').substring(0, 50)}${(QUESTIONS[selectedEnunciadoFilter] || '').length > 50 ? '...' : ''}`
                    : "Digite para pesquisar..."
                }
                className={`select-input question-select-input ${isEnunciadoFilterOpen ? 'open' : ''}`}
              />
              <button
                type="button"
                className={`select-arrow-button ${isEnunciadoFilterOpen ? 'open' : ''}`}
                onClick={() => {
                  setIsEnunciadoFilterOpen(!isEnunciadoFilterOpen);
                  if (!isEnunciadoFilterOpen) {
                    enunciadoInputRef.current?.focus();
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

            {isEnunciadoFilterOpen && (
              <div className="question-dropdown">
                <div className="question-dropdown-list">
                  {filteredQuestions.length === 0 ? (
                    <div className="question-dropdown-item no-results">
                      {selectedEtapaFilter
                        ? `Nenhuma questão encontrada na etapa "${selectedEtapaFilter}"`
                        : 'Nenhuma questão encontrada'}
                    </div>
                  ) : (
                    filteredQuestions.map((question) => {
                      const questionText = QUESTIONS[question] || `Questão ${question}`;
                      return (
                        <button
                          key={question}
                          onClick={() => handleEnunciadoSelect(question)}
                          className={`question-dropdown-item ${
                            selectedEnunciadoFilter === question ? 'selected' : ''
                          }`}
                        >
                          <span className="question-number">Q{question}:</span>
                          <span className="question-text">
                            {questionText.substring(0, 60)}
                            {questionText.length > 60 ? '...' : ''}
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
      </div>
        {filteredAnswers.length > 0 && onExport && (
          <div className="export-container" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className={`export-button ${showExportMenu ? 'open' : ''}`}
            >
              {isExporting ? 'Exportando...' : 'Exportar'}
              <svg
                className="export-arrow"
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
            {showExportMenu && (
              <div className="export-menu">
                <button
                  onClick={() => handleExportClick('csv')}
                  className="export-menu-item"
                  disabled={isExporting}
                >
                  Exportar como CSV
                </button>
                <button
                  onClick={() => handleExportClick('xlsx')}
                  className="export-menu-item"
                  disabled={isExporting}
                >
                  Exportar como XLSX
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="candidate-info">
        <div className="candidate-info-item">
          <span className="candidate-info-label">Nome:</span>
          <span className="candidate-info-value">{candidate.name}</span>
        </div>
        <div className="candidate-info-item">
          <span className="candidate-info-label">ID:</span>
          <span className="candidate-info-value">{candidate.id}</span>
        </div>
        <div className="candidate-info-item">
          <span className="candidate-info-label">WhatsApp:</span>
          <span className="candidate-info-value">{candidate.whatsapp}</span>
        </div>
        <div className="candidate-info-item">
          <span className="candidate-info-label">Email:</span>
          <span className="candidate-info-value">{candidate.email}</span>
        </div>
      </div>

      {isLoading && (
        <div className="loading-message">Carregando respostas…</div>
      )}

      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={onRetry} className="retry-button">
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && answers.length === 0 && (
        <div className="empty-message">
          Nenhuma resposta encontrada para este candidato.
        </div>
      )}

      {!isLoading && !error && filteredAnswers.length > 0 && (
        <AnswerTable 
          answers={filteredAnswers} 
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          deleteLoadingId={deleteLoadingId}
        />
      )}

      {!isLoading && !error && answers.length > 0 && filteredAnswers.length === 0 && (
        <div className="empty-message">
          Nenhuma resposta encontrada com os filtros selecionados.
        </div>
      )}
    </div>
  );
};

