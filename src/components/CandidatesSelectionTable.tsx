import { useState, useEffect, useMemo, useRef } from 'react';
import { Candidate } from '../types/candidate';

interface CandidatesSelectionTableProps {
  candidates: Candidate[];
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const CandidatesSelectionTable = ({
  candidates,
  selectedCandidate,
  onSelectCandidate,
  isLoading,
  error,
  onRetry,
}: CandidatesSelectionTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isCandidateFilterOpen, setIsCandidateFilterOpen] = useState(false);
  const [searchTermCandidate, setSearchTermCandidate] = useState('');
  const [selectedCandidateFilter, setSelectedCandidateFilter] = useState<Candidate | null>(null);
  const candidateFilterRef = useRef<HTMLDivElement>(null);
  const candidateInputRef = useRef<HTMLInputElement>(null);
  const itemsPerPage = 10;

  // Função para normalizar números de telefone (remover caracteres especiais)
  const normalizePhone = (phone: string): string => {
    return phone.replace(/[\s\(\)\-\.]/g, '').replace(/^\+55/, '').replace(/^55/, '');
  };

  // Filtrar candidatos baseado no termo de busca
  const filteredCandidatesForDropdown = useMemo(() => {
    if (!searchTermCandidate.trim()) {
      return candidates;
    }
    const searchLower = searchTermCandidate.toLowerCase().trim();
    const searchNormalized = normalizePhone(searchTermCandidate);
    
    return candidates.filter((candidate) => {
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
  }, [candidates, searchTermCandidate]);

  // Filtrar candidatos exibidos na tabela baseado na seleção do filtro
  const displayedCandidates = useMemo(() => {
    if (selectedCandidateFilter) {
      return candidates.filter((c) => c.id === selectedCandidateFilter.id);
    }
    return candidates;
  }, [candidates, selectedCandidateFilter]);

  // Resetar para página 1 quando a lista de candidatos mudar ou filtro mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [candidates.length, selectedCandidateFilter]);

  // Calcular dados da paginação baseado nos candidatos filtrados
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(displayedCandidates.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCandidates = displayedCandidates.slice(startIndex, endIndex);

    return {
      totalPages,
      paginatedCandidates,
      startIndex,
      endIndex,
      totalItems: displayedCandidates.length,
    };
  }, [displayedCandidates, currentPage, itemsPerPage]);

  // Ajustar página atual se necessário
  useEffect(() => {
    if (currentPage > paginationData.totalPages && paginationData.totalPages > 0) {
      setCurrentPage(paginationData.totalPages);
    }
  }, [paginationData.totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= paginationData.totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
    onSelectCandidate(candidate);
  };

  const handleClearCandidateFilter = () => {
    setSelectedCandidateFilter(null);
    setSearchTermCandidate('');
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
        <h3 className="candidates-title">Selecione um Candidato</h3>
        <div className="loading-message">Carregando candidatos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidates-container">
        <h3 className="candidates-title">Selecione um Candidato</h3>
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
        <h3 className="candidates-title">Selecione um Candidato</h3>
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
          <h3 className="candidates-title">
            Selecione um Candidato
            {selectedCandidateFilter && (
              <span className="filter-badge">
                Candidato: {selectedCandidateFilter.name || 'Sem nome'}
                <button
                  onClick={handleClearCandidateFilter}
                  className="clear-filter-button"
                  title="Limpar filtro"
                >
                  ×
                </button>
              </span>
            )}
          </h3>
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
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="candidates-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>WhatsApp</th>
              <th>Email</th>
              <th>Documento</th>
              <th>Endereço</th>
              <th>Cidade</th>
              <th>Criado em</th>
              <th>Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {paginationData.paginatedCandidates.map((candidate) => (
              <tr
                key={candidate.id}
                className={selectedCandidate?.id === candidate.id ? 'selected' : ''}
                onClick={() => onSelectCandidate(candidate)}
                style={{ cursor: 'pointer' }}
              >
                <td>{candidate.name || '-'}</td>
                <td>{candidate.whatsapp || '-'}</td>
                <td>{candidate.email || '-'}</td>
                <td>{candidate.document || '-'}</td>
                <td>{candidate.addressLine1 || '-'}</td>
                <td>{candidate.city || '-'}</td>
                <td>{candidate.createdAt ? formatDate(candidate.createdAt) : '-'}</td>
                <td>{candidate.updatedAt ? formatDate(candidate.updatedAt) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      {paginationData.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {paginationData.startIndex + 1} - {Math.min(paginationData.endIndex, paginationData.totalItems)} de {paginationData.totalItems} candidatos
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
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
              {Array.from({ length: paginationData.totalPages }, (_, i) => i + 1).map((page) => {
                const showPage =
                  page === 1 ||
                  page === paginationData.totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) {
                  if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="pagination-ellipsis">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === paginationData.totalPages}
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

