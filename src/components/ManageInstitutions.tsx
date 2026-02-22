import { useState, useEffect, useRef } from 'react';
import { CreateInstitutionForm } from './CreateInstitutionForm';
import { EditInstitutionForm } from './EditInstitutionForm';
import { DeleteInstitutionButton } from './DeleteInstitutionButton';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { useRefresh } from '../contexts/RefreshContext';
import { Toast } from './Toast';

interface ManageInstitutionsProps {
  onInstitutionCreated: (institution: Institution) => void;
  isActive?: boolean;
}

export const ManageInstitutions = ({
  onInstitutionCreated,
  isActive = true,
}: ManageInstitutionsProps) => {
  const { refreshKey, triggerRefresh } = useRefresh();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchInstitutions = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://criasapi.geocode.com.br/institution/',
        {
          headers: AUTH_HEADER,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar instituições');
      }

      const data: Institution[] = await response.json();
      setInstitutions(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as instituições'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchInstitutions();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isActive, refreshKey]);

  const handleInstitutionCreated = (institution: Institution) => {
    onInstitutionCreated(institution);
    // Disparar refresh global para todas as abas
    triggerRefresh();
  };

  const handleInstitutionUpdated = (institution: Institution) => {
    // Disparar refresh global para todas as abas
    triggerRefresh();
    setEditingInstitution(null);
  };

  const handleEditClick = (institution: Institution) => {
    setEditingInstitution(institution);
  };

  const handleCloseEdit = () => {
    setEditingInstitution(null);
  };

  const handleRetry = () => {
    fetchInstitutions();
  };

  const handleDeleteSuccess = async (institutionId: string) => {
    setDeleteLoadingId(institutionId);

    try {
      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institutionId}`,
        {
          method: 'DELETE',
          headers: AUTH_HEADER,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao excluir instituição');
      }

      // Disparar refresh global para todas as abas
      triggerRefresh();
      setToastMessage('Instituição excluída com sucesso');
      setToastType('success');
    } catch (err) {
      setToastMessage('Erro ao excluir instituição');
      setToastType('error');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="management-section">
      <div className="section-header">
        <h2 className="section-title">Gerenciar Instituições</h2>
        <p className="section-description">
          Crie e gerencie instituições do sistema
        </p>
      </div>
      <div className="section-content">
        <div style={{ marginBottom: '2rem' }}>
          <CreateInstitutionForm onSuccess={handleInstitutionCreated} />
        </div>

        <div className="institutions-list-section">
          <h3 className="subsection-title">Lista de Instituições</h3>
          
          {isLoading && (
            <div className="loading-message">Carregando instituições...</div>
          )}

          {error && (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button onClick={handleRetry} className="retry-button">
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !error && institutions.length === 0 && (
            <div className="empty-message">
              Nenhuma instituição encontrada.
            </div>
          )}

          {!isLoading && !error && institutions.length > 0 && (
            <div className="institutions-table-container">
              <table className="institutions-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Documento</th>
                    <th>Email</th>
                    <th>Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((institution) => (
                    <tr
                      key={institution.id}
                      className={deleteLoadingId === institution.id ? 'deleting' : ''}
                    >
                      <td>{institution.id || '-'}</td>
                      <td>{institution.name || '-'}</td>
                      <td>{institution.type || '-'}</td>
                      <td>{institution.document || '-'}</td>
                      <td>{institution.email || '-'}</td>
                      <td>{institution.phone || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            className="edit-institution-button"
                            onClick={() => handleEditClick(institution)}
                            title="Atualizar instituição"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M11.3333 2.00001C11.5084 1.82489 11.7163 1.68601 11.9444 1.59123C12.1726 1.49645 12.4163 1.44763 12.6625 1.44763C12.9087 1.44763 13.1524 1.49645 13.3806 1.59123C13.6087 1.68601 13.8166 1.82489 13.9917 2.00001C14.1668 2.17513 14.3057 2.38301 14.4005 2.61118C14.4953 2.83935 14.5441 3.08305 14.5441 3.32924C14.5441 3.57543 14.4953 3.81913 14.4005 4.0473C14.3057 4.27547 14.1668 4.48335 13.9917 4.65847L5.32499 13.3251L1.33333 14.6667L2.67499 10.6751L11.3333 2.00001Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            Atualizar
                          </button>
                          {institution.id && (
                            <DeleteInstitutionButton
                              institution={institution}
                              onDeleteClick={() => institution.id && handleDeleteSuccess(institution.id)}
                              isDeleting={deleteLoadingId === institution.id}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editingInstitution && (
        <EditInstitutionForm
          institution={editingInstitution}
          onSuccess={handleInstitutionUpdated}
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
    </div>
  );
};

