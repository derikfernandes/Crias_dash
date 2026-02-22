import { useState, useEffect, useRef } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';
import { CandidateAnswersPanel } from './CandidateAnswersPanel';
import { CandidatesSelectionTable } from './CandidatesSelectionTable';
import { CreateAnswerForm } from './CreateAnswerForm';
import { EditAnswerForm } from './EditAnswerForm';
import { Toast } from './Toast';
import { useInstitution } from '../contexts/InstitutionContext';
import { useRefresh } from '../contexts/RefreshContext';
import { AUTH_HEADER } from '../utils/api';

interface ManageAnswersProps {
  isActive?: boolean;
}

export const ManageAnswers = ({ isActive = true }: ManageAnswersProps) => {
  const { selectedInstitution } = useInstitution();
  const { refreshKey, triggerRefresh } = useRefresh();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<Answer | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllerAnswersRef = useRef<AbortController | null>(null);

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

  const fetchAnswers = async (institutionId: string, candidateId: string) => {
    if (abortControllerAnswersRef.current) {
      abortControllerAnswersRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerAnswersRef.current = abortController;

    setIsLoadingAnswers(true);
    setAnswersError(null);
    setAnswers([]);

    try {
      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/${candidateId}/answer/`,
        {
          headers: AUTH_HEADER,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar respostas');
      }

      const data: Answer[] = await response.json();
      setAnswers(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setAnswersError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as respostas'
      );
    } finally {
      setIsLoadingAnswers(false);
    }
  };

  useEffect(() => {
    if (isActive && selectedInstitution?.id) {
      fetchCandidates(selectedInstitution.id);
      setSelectedCandidate(null);
      setAnswers([]);
    } else if (!isActive) {
      setCandidates([]);
      setCandidatesError(null);
      setSelectedCandidate(null);
      setAnswers([]);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedInstitution, isActive, refreshKey]);

  useEffect(() => {
    if (selectedCandidate?.id && selectedInstitution?.id) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    } else {
      setAnswers([]);
      setAnswersError(null);
    }

    return () => {
      if (abortControllerAnswersRef.current) {
        abortControllerAnswersRef.current.abort();
      }
    };
  }, [selectedCandidate, selectedInstitution]);

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleRetryCandidates = () => {
    if (selectedInstitution?.id) {
      fetchCandidates(selectedInstitution.id);
    }
  };

  const handleRetryAnswers = () => {
    if (selectedCandidate?.id && selectedInstitution?.id) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    }
  };

  const handleAnswerCreated = (_answer: Answer) => {
    // Disparar refresh global para todas as abas
    triggerRefresh();
    // Recarregar respostas do candidato selecionado
    if (selectedCandidate?.id && selectedInstitution?.id) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    }
  };

  const handleEditClick = (answer: Answer) => {
    setEditingAnswer(answer);
  };

  const handleCloseEdit = () => {
    setEditingAnswer(null);
  };

  const handleAnswerUpdated = (_answer: Answer) => {
    // Disparar refresh global para todas as abas
    triggerRefresh();
    // Recarregar respostas do candidato selecionado
    if (selectedCandidate?.id && selectedInstitution?.id) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    }
    setEditingAnswer(null);
  };

  const handleDeleteSuccess = async (answerId: string) => {
    setDeleteLoadingId(answerId);

    try {
      if (!selectedInstitution?.id || !selectedCandidate?.id) return;

      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${selectedInstitution.id}/candidate/${selectedCandidate.id}/answer/${answerId}`,
        {
          method: 'DELETE',
          headers: AUTH_HEADER,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir resposta');
      }

      // Disparar refresh global para todas as abas
      triggerRefresh();
      // Recarregar respostas do candidato selecionado
      if (selectedCandidate.id && selectedInstitution.id) {
        fetchAnswers(selectedInstitution.id, selectedCandidate.id);
      }
      setToastMessage('Resposta excluída com sucesso');
      setToastType('success');
    } catch (err) {
      setToastMessage('Erro ao excluir resposta');
      setToastType('error');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="management-section">
      <div className="section-header">
        <h2 className="section-title">Gerenciar Respostas de Candidatos</h2>
        <p className="section-description">
          Visualize e gerencie as respostas dos candidatos
        </p>
      </div>
      <div className="section-content">
        {selectedInstitution ? (
          <>
            <CandidatesSelectionTable
              candidates={candidates}
              selectedCandidate={selectedCandidate}
              onSelectCandidate={handleSelectCandidate}
              isLoading={isLoadingCandidates}
              error={candidatesError}
              onRetry={handleRetryCandidates}
            />

            {selectedCandidate && selectedInstitution && (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <CreateAnswerForm
                    candidate={selectedCandidate}
                    institution={selectedInstitution}
                    onSuccess={handleAnswerCreated}
                  />
                </div>
                <CandidateAnswersPanel
                  candidate={selectedCandidate}
                  answers={answers}
                  isLoading={isLoadingAnswers}
                  error={answersError}
                  onRetry={handleRetryAnswers}
                  onEditClick={handleEditClick}
                  onDeleteClick={handleDeleteSuccess}
                  deleteLoadingId={deleteLoadingId}
                />
              </>
            )}

            {editingAnswer && selectedCandidate && selectedInstitution && (
              <EditAnswerForm
                answer={editingAnswer}
                candidate={selectedCandidate}
                institution={selectedInstitution}
                onSuccess={handleAnswerUpdated}
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
        ) : (
          <div className="candidates-container">
            <div className="empty-message">
              Selecione uma instituição na página inicial para gerenciar as
              respostas.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

