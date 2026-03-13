import { Link } from 'react-router-dom';
import { Institution } from '../types/institution';
import { InstitutionSelector } from './InstitutionSelector';
import { ApiHealthStatus } from './ApiHealthStatus';

interface NavigationHeaderProps {
  institutions: Institution[];
  selectedInstitution: Institution | null;
  onSelectInstitution: (institution: Institution) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onLogout: () => void;
  canAccessGerenciamento: boolean;
  title?: string;
  lastUpdateDate?: Date | null;
  username?: string | null;
}

export const NavigationHeader = ({
  institutions,
  selectedInstitution,
  onSelectInstitution,
  onRefresh,
  isLoading,
  error,
  onRetry,
  onLogout,
  canAccessGerenciamento,
  title = 'Crias',
  lastUpdateDate,
  username,
}: NavigationHeaderProps) => {
  const formatUpdateDate = (date: Date | null): string => {
    if (!date) return '';
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <nav className="navigation">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link
            to="/home"
            className="nav-button nav-button-primary"
            style={{ textDecoration: 'none' }}
          >
            Home
          </Link>
          <InstitutionSelector
            institutions={institutions}
            onSelect={onSelectInstitution}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            selectedInstitution={selectedInstitution}
            disabled={username === 'institutosol'}
          />
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="refresh-button"
            title="Atualizar lista de instituições"
          >
            Atualizar
          </button>
          <ApiHealthStatus />
        </div>
        {lastUpdateDate && (
          <div className="last-update-text" title={lastUpdateDate.toLocaleString('pt-BR')}>
            Atualizado: {formatUpdateDate(lastUpdateDate)}
          </div>
        )}
      </div>
      <h2 className="nav-title">{title}</h2>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Link
          to="/detalhe"
          className="nav-button nav-button-primary"
          style={{ textDecoration: 'none' }}
        >
          Detalhes →
        </Link>
        {canAccessGerenciamento && (
          <Link
            to="/gerenciamento"
            className="nav-button nav-button-primary"
            style={{ textDecoration: 'none' }}
          >
            Gerenciamento →
          </Link>
        )}
        <button
          className="nav-button"
          onClick={onLogout}
          title="Sair"
        >
          Sair
        </button>
      </div>
    </nav>
  );
};

