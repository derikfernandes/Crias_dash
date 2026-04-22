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
  onExportCompiled?: (format: 'csv' | 'xlsx') => void;
  isExportingCompiled?: boolean;
  answersMap: Map<string, Answer[]>;
  selectedEtapas?: string[];
  selectedAnswerFilters?: { question: number; answer: string }[];
  selectedInactivities?: ('finalized' | 'notFinalized' | number)[];
  onClearFilter?: () => void;
  totalCandidates?: number;
  getCandidateStageName?: (candidateId?: string) => string;
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
  onExportCompiled,
  isExportingCompiled,
  answersMap,
  selectedEtapas = [],
  selectedAnswerFilters = [],
  selectedInactivities = [],
  onClearFilter,
  totalCandidates,
  getCandidateStageName,
}: CandidatesTableProps) => {
  const hasChartFilters = selectedEtapas.length > 0 || selectedAnswerFilters.length > 0 || selectedInactivities.length > 0;
  const [isCandidateFilterOpen, setIsCandidateFilterOpen] = useState(false);
  const [searchTermCandidate, setSearchTermCandidate] = useState('');
  const [selectedCandidateFilter, setSelectedCandidateFilter] = useState<Candidate | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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

  // Ordenar candidatos conforme coluna e direção
  const sortedCandidates = useMemo(() => {
    if (!sortBy || displayedCandidates.length === 0) return displayedCandidates;
    const dir = sortDirection === 'asc' ? 1 : -1;
    const isDateKey = (k: string) =>
      k === 'createdAt' || k === 'updatedAt' || k.toLowerCase().includes('at') || k.toLowerCase().includes('date');

    return [...displayedCandidates].sort((a, b) => {
      let valA: string | number | undefined;
      let valB: string | number | undefined;

      if (sortBy === 'etapa') {
        valA = getCandidateEtapa(a.id || '', answersMap);
        valB = getCandidateEtapa(b.id || '', answersMap);
      } else if (sortBy === 'stage') {
        valA = getCandidateStageName ? getCandidateStageName(a.id) : 'Sem stage';
        valB = getCandidateStageName ? getCandidateStageName(b.id) : 'Sem stage';
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }

      const empty = (v: string | number | undefined) =>
        v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
      if (empty(valA) && empty(valB)) return 0;
      if (empty(valA)) return dir;
      if (empty(valB)) return -dir;

      if (sortBy === 'etapa' || typeof valA === 'string' || typeof valB === 'string') {
        const strA = String(valA ?? '');
        const strB = String(valB ?? '');
        return dir * (strA.localeCompare(strB, 'pt-BR', { sensitivity: 'base' }));
      }
      if (isDateKey(sortBy)) {
        const tA = new Date(String(valA ?? '')).getTime();
        const tB = new Date(String(valB ?? '')).getTime();
        if (isNaN(tA) && isNaN(tB)) return 0;
        if (isNaN(tA)) return dir;
        if (isNaN(tB)) return -dir;
        return dir * (tA - tB);
      }
      const numA = Number(valA);
      const numB = Number(valB);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return dir * (numA - numB);
      return dir * String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
    });
  }, [displayedCandidates, sortBy, sortDirection, answersMap, getCandidateStageName]);

  // Calcular paginação
  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / ITEMS_PER_PAGE));

  // Ajustar página atual se necessário (caso a página atual seja maior que o total de páginas)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Candidatos da página atual (após ordenação)
  const paginatedCandidates = useMemo(() => {
    if (sortedCandidates.length === 0) {
      return [];
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedCandidates.slice(startIndex, endIndex);
  }, [sortedCandidates, currentPage]);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEtapas, selectedAnswerFilters, selectedInactivities, selectedCandidateFilter, candidates, sortBy, sortDirection]);

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
  const [showCompiledExportMenu, setShowCompiledExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const compiledExportMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        compiledExportMenuRef.current &&
        !compiledExportMenuRef.current.contains(event.target as Node)
      ) {
        setShowCompiledExportMenu(false);
      }
    };

    if (showCompiledExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCompiledExportMenu]);

  const handleExportClick = (format: 'csv' | 'xlsx') => {
    if (onExport) {
      onExport(format);
    }
    setShowExportMenu(false);
  };

  const handleExportCompiledClick = (format: 'csv' | 'xlsx') => {
    if (onExportCompiled) {
      onExportCompiled(format);
    }
    setShowCompiledExportMenu(false);
  };

  // formatDate removido - não está sendo usado

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
            {selectedEtapas.length > 0 && (
              <span className="filter-badge">
                Etapa: {selectedEtapas.join(', ')}
                {totalCandidates !== undefined && (
                  <span className="filter-count">
                    ({displayedCandidates.length} de {totalCandidates})
                  </span>
                )}
              </span>
            )}
            {selectedAnswerFilters.length > 0 && (
              <span className="filter-badge">
                Resposta: {selectedAnswerFilters.map((f) => `Q${f.question}=${getFormattedAnswer(f.question, f.answer) !== f.answer ? getFormattedAnswer(f.question, f.answer) : f.answer}`).join('; ')}
                {totalCandidates !== undefined && (
                  <span className="filter-count">
                    ({displayedCandidates.length} de {totalCandidates})
                  </span>
                )}
              </span>
            )}
            {selectedInactivities.length > 0 && (
              <span className="filter-badge">
                Inatividade: {selectedInactivities.map((s) =>
                  s === 'finalized' ? 'Finalizados' : s === 'notFinalized' ? 'Não finalizados' : `${s} ${s === 1 ? 'dia' : 'dias'}`
                ).join(', ')}
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
          {(hasChartFilters || selectedCandidateFilter) && onClearFilter && (
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
        {candidates.length > 0 && (onExport || onExportCompiled) && (
          <div className="export-buttons-row">
            {onExport && (
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
            {onExportCompiled && (
              <div className="export-container" ref={compiledExportMenuRef}>
                <button
                  onClick={() => setShowCompiledExportMenu(!showCompiledExportMenu)}
                  disabled={isExportingCompiled}
                  className={`export-button ${showCompiledExportMenu ? 'open' : ''}`}
                >
                  {isExportingCompiled ? 'Exportando...' : 'Extrair dados completos'}
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
                {showCompiledExportMenu && (
                  <div className="export-menu">
                    <button
                      onClick={() => handleExportCompiledClick('csv')}
                      className="export-menu-item"
                      disabled={isExportingCompiled}
                    >
                      Baixar CSV
                    </button>
                    <button
                      onClick={() => handleExportCompiledClick('xlsx')}
                      className="export-menu-item"
                      disabled={isExportingCompiled}
                    >
                      Baixar XLSX
                    </button>
                  </div>
                )}
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
              {/* Renderizar colunas dinamicamente (ordenáveis) */}
              {orderedColumns.map((col) => {
                const isSorted = sortBy === col.key;
                return (
                  <th
                    key={col.key}
                    className="sortable-th"
                    onClick={() => handleSort(col.key)}
                    title={`Ordenar por ${col.label} (${isSorted && sortDirection === 'asc' ? 'clique para descrescente' : 'clique para crescente'})`}
                  >
                    <span className="th-content">
                      {col.label}
                      {isSorted && (
                        <span className="sort-indicator" aria-hidden>
                          {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
              {/* Coluna especial "Etapa" (ordenável) */}
              <th
                className="sortable-th"
                onClick={() => handleSort('etapa')}
                title={`Ordenar por Etapa (${sortBy === 'etapa' && sortDirection === 'asc' ? 'clique para descrescente' : 'clique para crescente'})`}
              >
                <span className="th-content">
                  Etapa
                  {sortBy === 'etapa' && (
                    <span className="sort-indicator" aria-hidden>
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </span>
              </th>
              <th
                className="sortable-th"
                onClick={() => handleSort('stage')}
                title={`Ordenar por Stage (${sortBy === 'stage' && sortDirection === 'asc' ? 'clique para descrescente' : 'clique para crescente'})`}
              >
                <span className="th-content">
                  Stage
                  {sortBy === 'stage' && (
                    <span className="sort-indicator" aria-hidden>
                      {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                    </span>
                  )}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCandidates.length === 0 ? (
              <tr>
                <td colSpan={orderedColumns.length + 2} style={{ textAlign: 'center', padding: '2rem' }}>
                  Nenhum candidato encontrado nesta página.
                </td>
              </tr>
            ) : (
              paginatedCandidates.map((candidate) => {
                const etapa = getCandidateEtapa(candidate.id || '', answersMap);
                const stageName = getCandidateStageName
                  ? getCandidateStageName(candidate.id)
                  : 'Sem stage';
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
                    <td>
                      <span className="etapa-badge in-progress">{stageName}</span>
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

