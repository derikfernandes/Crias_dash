import { useState, useRef, useEffect } from 'react';
import { Institution } from '../types/institution';

interface InstitutionSelectorProps {
  institutions: Institution[];
  onSelect: (institution: Institution) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedInstitution?: Institution | null;
  disabled?: boolean;
}

export const InstitutionSelector = ({
  institutions,
  onSelect,
  isLoading,
  error,
  onRetry,
  selectedInstitution,
  disabled = false,
}: InstitutionSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar no input quando o dropdown abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filtrar instituições - busca case-insensitive
  const filteredInstitutions = institutions.filter((inst) => {
    if (!inst.name) return false;
    return inst.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (institution: Institution) => {
    onSelect(institution);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Abrir dropdown automaticamente quando começar a digitar
    if (!isOpen && value.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Fechar com Escape
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
      inputRef.current?.blur();
    }
    // Selecionar primeira opção com Enter (se houver resultados)
    else if (e.key === 'Enter' && filteredInstitutions.length > 0) {
      handleSelect(filteredInstitutions[0]);
    }
  };

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={onRetry} className="retry-button">
          Tentar novamente
        </button>
      </div>
    );
  }

  // Valor exibido no input: o termo de busca ou o nome da instituição selecionada
  const displayValue = isOpen ? searchTerm : (selectedInstitution?.name || '');

  return (
    <div className="selector-container">
      <div className="select-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          placeholder={isLoading ? 'Carregando...' : 'Digite para pesquisar...'}
          className={`select-input ${isOpen ? 'open' : ''} ${selectedInstitution ? 'has-selection' : ''}`}
          disabled={isLoading || disabled}
        />
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              inputRef.current?.focus();
            }
          }}
          className={`select-arrow-button ${isOpen ? 'open' : ''}`}
          disabled={isLoading || disabled}
          type="button"
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
        <div ref={dropdownRef} className="dropdown">
          <div className="dropdown-list">
            {filteredInstitutions.length === 0 ? (
              <div className="dropdown-item no-results">
                {searchTerm.length > 0 
                  ? `Nenhuma instituição encontrada para "${searchTerm}"`
                  : 'Nenhuma instituição encontrada'}
              </div>
            ) : (
              filteredInstitutions.map((institution) => (
                <button
                  key={institution.id}
                  onClick={() => handleSelect(institution)}
                  className={`dropdown-item ${selectedInstitution?.id === institution.id ? 'selected' : ''}`}
                >
                  {institution.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

