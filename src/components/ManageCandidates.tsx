import { useState, useEffect, useRef } from 'react';
import { Candidate } from '../types/candidate';
import { CandidatesTableManagement } from './CandidatesTableManagement';
import { CreateCandidateForm } from './CreateCandidateForm';
import { EditCandidateForm } from './EditCandidateForm';
import { Toast } from './Toast';
import { useInstitution } from '../contexts/InstitutionContext';
import { useRefresh } from '../contexts/RefreshContext';
import { AUTH_HEADER } from '../utils/api';

interface ManageCandidatesProps {
  isActive?: boolean;
}

export const ManageCandidates = ({ isActive = true }: ManageCandidatesProps) => {
  const { selectedInstitution } = useInstitution();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCandidates = async (institutionId: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingCandidates(true);
    setCandidatesError(null);
    setCandidates([]);

    try {
      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/`,
        {
          headers: AUTH_HEADER,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar candidatos');
      }

      const data: Candidate[] = await response.json();
      setCandidates(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setCandidatesError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar os candidatos'
      );
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (isActive && selectedInstitution && selectedInstitution.id) {
      fetchCandidates(selectedInstitution.id);
    } else if (!isActive) {
      setCandidates([]);
      setCandidatesError(null);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedInstitution, isActive, refreshKey]);

  const handleRetryCandidates = () => {
    if (selectedInstitution && selectedInstitution.id) {
      fetchCandidates(selectedInstitution.id);
    }
  };

  const handleDeleteSuccess = async (candidateId: string) => {
    setDeleteLoadingId(candidateId);

    try {
      if (!selectedInstitution || !selectedInstitution.id) return;

      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${selectedInstitution.id}/candidate/${candidateId}`,
        {
          method: 'DELETE',
          headers: AUTH_HEADER,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir candidato');
      }

      // Disparar refresh global para todas as abas
      triggerRefresh();
      setToastMessage('Candidato excluído com sucesso');
      setToastType('success');
    } catch (err) {
      setToastMessage('Erro ao excluir candidato');
      setToastType('error');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleEditClick = (candidate: Candidate) => {
    setEditingCandidate(candidate);
  };

  const handleCloseEdit = () => {
    setEditingCandidate(null);
  };

  const handleCandidateUpdated = (candidate: Candidate) => {
    // Disparar refresh global para todas as abas
    triggerRefresh();
    setEditingCandidate(null);
  };

  return (
    <>
      <div className="management-section">
        <div className="section-header">
          <h2 className="section-title">Gerenciar Candidatos</h2>
          <p className="section-description">
            Crie e gerencie candidatos da instituição selecionada
          </p>
        </div>
        <div className="section-content">
          {selectedInstitution ? (
            <>
              <div style={{ marginBottom: '2rem' }}>
                <CreateCandidateForm
                  institution={selectedInstitution}
                  onSuccess={(candidate) => {
                    // Disparar refresh global para todas as abas
                    triggerRefresh();
                  }}
                />
              </div>
              <CandidatesTableManagement
                candidates={candidates}
                isLoading={isLoadingCandidates}
                error={candidatesError}
                onRetry={handleRetryCandidates}
                onDeleteSuccess={handleDeleteSuccess}
                onEditClick={handleEditClick}
                deleteLoadingId={deleteLoadingId}
              />
            </>
          ) : (
            <div className="candidates-container">
              <h2 className="candidates-title">Candidatos</h2>
              <div className="empty-message">
                Selecione uma instituição na página inicial para gerenciar os
                candidatos.
              </div>
            </div>
          )}
        </div>
      </div>

      {editingCandidate && selectedInstitution && (
        <EditCandidateForm
          candidate={editingCandidate}
          institution={selectedInstitution}
          onSuccess={handleCandidateUpdated}
          onClose={handleCloseEdit}
        />
      )}

      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </>
  );
};

