import { useState, useRef, useEffect, useMemo } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { getDynamicColumns, formatValue, ColumnConfig } from '../utils/tableUtils';
import { getCandidateEtapa } from '../utils/etapaUtils';
import { getFormattedAnswer } from '../utils/answerMappings';

interface CandidatesTableProps {
  candidates: Candidate[];
  allCandidates?: Candidate[]; // Lista completa para o filtro
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectCandidate: (candidate: Candidate) => void;
  selectedCandidateId: string | null;
  onExport?: (format: 'csv' | 'xlsx') => void;
  isExporting?: boolean;
  answersMap: Map<string, Answer[]>;
  selectedEtapa?: string | null;
  selectedQuestion?: number | null;
  selectedAnswer?: string | null;
  selectedInactivity?: 'finalized' | 'notFinalized' | number | null;
  onClearFilter?: () => void;
  totalCandidates?: number;
}

export const CandidatesTable = ({
  candidates,
  allCandidates,
  isLoading,
  error,
  onRetry,
  onSelectCandidate,
  selectedCandidateId,
  onExport,
  isExporting,
  answersMap,
  selectedEtapa,
  selectedQuestion,
  selectedAnswer,
  selectedInactivity,
  onClearFilter,
  totalCandidates,
}: CandidatesTableProps) => {
  const [isCandidateFilterOpen, setIsCandidateFilterOpen] = useState(false);
  const [searchTermCandidate, setSearchTermCandidate] = useState('');
  const [selectedCandidateFilter, setSelectedCandidateFilter] = useState<Candidate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const candidateFilterRef = useRef<HTMLDivElement>(null);
  const candidateInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Usar allCandidates se fornecido, senão usar candidates
  const candidatesForFilter = allCandidates || candidates;

  // Função para normalizar números de telefone (remover caracteres especiais)
  const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\(\)\-\.]/g, '').replace(/^\+55/, '').replace(/^55/, '');
  };

  // Filtrar candidatos baseado no termo de busca
  const filteredCandidatesForDropdown = useMemo(() => {
    if (!searchTermCandidate.trim()) {
      return candidatesForFilter;
    }
    const searchLower = searchTermCandidate.toLowerCase().trim();
    const searchNormalized = normalizePhone(searchTermCandidate);
    
    return candidatesForFilter.filter((candidate) => {
      const name = candidate.name?.toLowerCase() || '';
      const email = candidate.email?.toLowerCase() || '';
      const whatsapp = candidate.whatsapp || '';
      const whatsappLower = whatsapp.toLowerCase();
      const whatsappNormalized = normalizePhone(whatsapp);
      const document = candidate.document?.toLowerCase() || '';
      
      // Busca normal (case-insensitive)
      const normalMatch = 
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        whatsappLower.includes(searchLower) ||
        document.includes(searchLower);
      
      // Busca normalizada para WhatsApp (remove caracteres especiais)
      const phoneMatch = searchNormalized.length > 0 && 
        (whatsappNormalized.includes(searchNormalized) || 
         searchNormalized.includes(whatsappNormalized));
      
      return normalMatch || phoneMatch;
    });
  }, [candidatesForFilter, searchTermCandidate]);

  // Filtrar candidatos exibidos na tabela baseado na seleção do filtro
  const displayedCandidates = useMemo(() => {
    if (selectedCandidateFilter) {
      return candidates.filter((c) => c.id === selectedCandidateFilter.id);
    }
    return candidates;
  }, [candidates, selectedCandidateFilter]);

  // Calcular paginação
  const totalPages = Math.max(1, Math.ceil(displayedCandidates.length / ITEMS_PER_PAGE));
  
  // Ajustar página atual se necessário (caso a página atual seja maior que o total de páginas)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  
  // Candidatos da página atual
  const paginatedCandidates = useMemo(() => {
    if (displayedCandidates.length === 0) {
      return [];
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return displayedCandidates.slice(startIndex, endIndex);
  }, [displayedCandidates, currentPage]);

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEtapa, selectedQuestion, selectedAnswer, selectedCandidateFilter, candidates]);

  // Extrair colunas dinamicamente
  const dynamicColumns = useMemo(() => {
    if (candidates.length === 0) return [];
    return getDynamicColumns(candidates, ['etapa']);
  }, [candidates]);

  // Ordem preferencial para colunas conhecidas
  const columnOrder = [
    'name',
    'whatsapp',
    'email',
    'document',
    'addressLine1',
    'city',
    'createdAt',
    'updatedAt',
  ];

  // Ordenar colunas: conhecidas primeiro, depois novas
  const orderedColumns = useMemo(() => {
    const known: ColumnConfig[] = [];
    const unknown: ColumnConfig[] = [];

    dynamicColumns.forEach((col) => {
      if (columnOrder.includes(col.key)) {
        known.push(col);
      } else {
        unknown.push(col);
      }
    });

    // Ordenar conhecidas pela ordem preferencial
    known.sort((a, b) => {
      const indexA = columnOrder.indexOf(a.key);
      const indexB = columnOrder.indexOf(b.key);
      return indexA - indexB;
    });

    return [...known, ...unknown];
  }, [dynamicColumns]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown do filtro ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        candidateFilterRef.current &&
        !candidateFilterRef.current.contains(event.target as Node)
      ) {
        setIsCandidateFilterOpen(false);
      }
    };

    if (isCandidateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCandidateFilterOpen]);

  // Handlers para o filtro de candidato
  const handleCandidateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTermCandidate(value);
    // Se o usuário começar a digitar, limpar a seleção
    if (value.trim() && selectedCandidateFilter) {
      setSelectedCandidateFilter(null);
    }
    if (value.trim() && !isCandidateFilterOpen) {
      setIsCandidateFilterOpen(true);
    }
  };

  const handleCandidateFilterKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredCandidatesForDropdown.length > 0) {
      e.preventDefault();
      handleCandidateSelect(filteredCandidatesForDropdown[0]);
    } else if (e.key === 'Escape') {
      setIsCandidateFilterOpen(false);
      setSearchTermCandidate('');
      candidateInputRef.current?.blur();
    }
  };

  const handleCandidateFilterFocus = () => {
    setIsCandidateFilterOpen(true);
  };

  const handleCandidateSelect = (candidate: Candidate) => {
    setSelectedCandidateFilter(candidate);
    setIsCandidateFilterOpen(false);
    setSearchTermCandidate('');
    // Selecionar o candidato na tabela
    onSelectCandidate(candidate);
  };

  const handleClearCandidateFilter = () => {
    setSelectedCandidateFilter(null);
    setSearchTermCandidate('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  const handleExportClick = (format: 'csv' | 'xlsx') => {
    if (onExport) {
      onExport(format);
    }
    setShowExportMenu(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="candidates-container">
        <h2 className="candidates-title">Candidatos</h2>
        <div className="loading-message">Carregando candidatos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidates-container">
        <h2 className="candidates-title">Candidatos</h2>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={onRetry} className="retry-button">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="candidates-container">
        <h2 className="candidates-title">Candidatos</h2>
        <div className="empty-message">
          Nenhum candidato encontrado para esta instituição.
        </div>
      </div>
    );
  }

  return (
    <div className="candidates-container">
      <div className="candidates-header">
        <div className="candidates-title-container">
          <h2 className="candidates-title">
            Candidatos
            {selectedEtapa && (
              <span className="filter-badge">
                Filtrado: {selectedEtapa}
                {totalCandidates !== undefined && (
                  <span className="filter-count">
                    ({displayedCandidates.length} de {totalCandidates})
                  </span>
                )}
              </span>
            )}
            {selectedQuestion !== null && selectedQuestion !== undefined && selectedAnswer && (
              <span className="filter-badge">
                Filtrado: Q{selectedQuestion} = {getFormattedAnswer(selectedQuestion, selectedAnswer) !== selectedAnswer 
                  ? getFormattedAnswer(selectedQuestion, selectedAnswer)
                  : selectedAnswer}
                {totalCandidates !== undefined && (
                  <span className="filter-count">
                    ({displayedCandidates.length} de {totalCandidates})
                  </span>
                )}
              </span>
            )}
            {selectedCandidateFilter && (
              <span className="filter-badge">
                Candidato: {selectedCandidateFilter.name || 'Sem nome'}
              </span>
            )}
          </h2>
          <div className="candidate-filter-container" ref={candidateFilterRef}>
            <div className="select-input-wrapper">
              <input
                ref={candidateInputRef}
                type="text"
                value={searchTermCandidate || (selectedCandidateFilter ? selectedCandidateFilter.name || '' : '')}
                onChange={handleCandidateFilterChange}
                onKeyDown={handleCandidateFilterKeyDown}
                onFocus={handleCandidateFilterFocus}
                placeholder={selectedCandidateFilter ? selectedCandidateFilter.name || '' : "Digite nome, WhatsApp ou email..."}
                className={`select-input candidate-filter-input ${isCandidateFilterOpen ? 'open' : ''} ${selectedCandidateFilter ? 'has-selection' : ''}`}
              />
              <button
                type="button"
                className={`select-arrow-button ${isCandidateFilterOpen ? 'open' : ''}`}
                onClick={() => {
                  setIsCandidateFilterOpen(!isCandidateFilterOpen);
                  if (!isCandidateFilterOpen) {
                    candidateInputRef.current?.focus();
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

            {isCandidateFilterOpen && (
              <div className="question-dropdown">
                <div className="question-dropdown-list">
                  {filteredCandidatesForDropdown.length === 0 ? (
                    <div className="question-dropdown-item no-results">
                      Nenhum candidato encontrado
                    </div>
                  ) : (
                    filteredCandidatesForDropdown.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => handleCandidateSelect(candidate)}
                        className={`question-dropdown-item ${
                          selectedCandidateFilter?.id === candidate.id ? 'selected' : ''
                        }`}
                      >
                        <span className="question-text">
                          {candidate.name || 'Sem nome'}
                          {candidate.whatsapp && (
                            <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                              📱 {candidate.whatsapp}
                            </span>
                          )}
                          {candidate.email && (
                            <span style={{ color: '#6b7280', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                              ✉️ {candidate.email}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {selectedCandidateFilter && (
            <button
              className="clear-etapa-button"
              onClick={handleClearCandidateFilter}
              title="Limpar filtro de candidato"
            >
              ✕
            </button>
          )}
          {(selectedEtapa || (selectedQuestion !== null && selectedAnswer) || selectedInactivity !== null || selectedCandidateFilter) && onClearFilter && (
            <button
              onClick={() => {
                if (onClearFilter) {
                  onClearFilter();
                }
                handleClearCandidateFilter();
              }}
              className="clear-filter-button"
              title="Limpar filtro"
            >
              ✕
            </button>
          )}
        </div>
        {candidates.length > 0 && onExport && (
          <div className="export-container" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className={`export-button ${showExportMenu ? 'open' : ''}`}
            >
              {isExporting ? 'Exportando...' : 'Exportar dados'}
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
      <div className="candidates-info-text">
        <p className="candidates-hint">
          💡 Clique em um candidato na tabela abaixo para ver suas respostas em detalhes
        </p>
      </div>
      <div className="table-wrapper">
        <table className="candidates-table">
          <thead>
            <tr>
              {/* Renderizar colunas dinamicamente */}
              {orderedColumns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {/* Coluna especial "Etapa" */}
              <th>Etapa</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={orderedColumns.length + 1} style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhum candidato encontrado nesta página.
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => {
                const etapa = getCandidateEtapa(candidate.id || '', answersMap);
                return (
                  <tr
                    key={candidate.id}
                    className={selectedCandidateId === candidate.id ? 'selected' : ''}
                    onClick={() => onSelectCandidate(candidate)}
                  >
                    {/* Renderizar células dinamicamente */}
                    {orderedColumns.map((col) => (
                      <td key={col.key}>
                        {formatValue(candidate[col.key], col.key)}
                      </td>
                    ))}
                    {/* Célula especial "Etapa" */}
                    <td>
                      <span
                        className={`etapa-badge ${
                          etapa === 'Finalizou'
                            ? 'finalized'
                            : etapa === 'Sem respostas'
                            ? 'no-answers'
                            : 'in-progress'
                        }`}
                      >
                        {etapa}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Controles de paginação */}
      {totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, displayedCandidates.length)} de {displayedCandidates.length} candidatos
          </div>
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="pagination-button"
              title="Página anterior"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Mostrar apenas algumas páginas ao redor da atual
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return (
                    <span key={page} className="pagination-ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="pagination-button"
              title="Próxima página"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 4L10 8L6 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

