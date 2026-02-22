import { useState } from 'react';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { Toast } from './Toast';

interface CreateInstitutionFormProps {
  onSuccess: (institution: Institution) => void;
}

export const CreateInstitutionForm = ({
  onSuccess,
}: CreateInstitutionFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    document: '',
    email: '',
    phone: '',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        'https://criasapi.geocode.com.br/institution/',
        {
          method: 'POST',
          headers: {
            ...AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao criar instituição');
      }

      const newInstitution: Institution = await response.json();
      setToastMessage('Instituição criada com sucesso!');
      setToastType('success');
      setFormData({
        name: '',
        type: '',
        document: '',
        email: '',
        phone: '',
      });
      setIsOpen(false);
      onSuccess(newInstitution);
    } catch (err) {
      setToastMessage('Erro ao criar instituição');
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      <button
        className="create-institution-button"
        onClick={() => setIsOpen(true)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        Criar Instituição
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-content modal-content-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Criar Nova Instituição</h3>
            <form onSubmit={handleSubmit} className="create-institution-form">
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Nome *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite o nome da instituição"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="type" className="form-label">
                  Tipo *
                </label>
                <input
                  id="type"
                  name="type"
                  type="text"
                  value={formData.type}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Ex: escola, ong, etc"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="document" className="form-label">
                  Documento *
                </label>
                <input
                  id="document"
                  name="document"
                  type="text"
                  value={formData.document}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite o documento"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="email@example.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  Telefone *
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite o telefone"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button cancel-button"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-button create-confirm-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando...' : 'Criar Instituição'}
                </button>
              </div>
            </form>
          </div>
        </div>
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

