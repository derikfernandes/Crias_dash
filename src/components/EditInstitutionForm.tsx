import { useState, useEffect } from 'react';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { Toast } from './Toast';

interface EditInstitutionFormProps {
  institution: Institution;
  onSuccess: (institution: Institution) => void;
  onClose: () => void;
}

export const EditInstitutionForm = ({
  institution,
  onSuccess,
  onClose,
}: EditInstitutionFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: institution.name || '',
    type: institution.type || '',
    document: institution.document || '',
    email: institution.email || '',
    phone: institution.phone || '',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Atualizar formData quando institution mudar
  useEffect(() => {
    setFormData({
      name: institution.name || '',
      type: institution.type || '',
      document: institution.document || '',
      email: institution.email || '',
      phone: institution.phone || '',
    });
  }, [institution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institution.id) {
      setToastMessage('ID da instituição não encontrado');
      setToastType('error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institution.id}`,
        {
          method: 'PUT',
          headers: {
            ...AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar instituição');
      }

      const updatedInstitution: Institution = await response.json();
      setToastMessage('Instituição atualizada com sucesso!');
      setToastType('success');
      
      // Fechar modal após um breve delay para mostrar o toast
      setTimeout(() => {
        onSuccess(updatedInstitution);
        onClose();
      }, 1000);
    } catch (err) {
      setToastMessage('Erro ao atualizar instituição');
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
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content modal-content-large"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">Editar Instituição</h3>
          <form onSubmit={handleSubmit} className="create-institution-form">
            <div className="form-group">
              <label htmlFor="edit-name" className="form-label">
                Nome *
              </label>
              <input
                id="edit-name"
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
              <label htmlFor="edit-type" className="form-label">
                Tipo *
              </label>
              <input
                id="edit-type"
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
              <label htmlFor="edit-document" className="form-label">
                Documento *
              </label>
              <input
                id="edit-document"
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
              <label htmlFor="edit-email" className="form-label">
                Email *
              </label>
              <input
                id="edit-email"
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
              <label htmlFor="edit-phone" className="form-label">
                Telefone *
              </label>
              <input
                id="edit-phone"
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
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="modal-button create-confirm-button"
                disabled={isLoading}
              >
                {isLoading ? 'Atualizando...' : 'Atualizar Instituição'}
              </button>
            </div>
          </form>
        </div>
      </div>

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

