import { useState, useEffect } from 'react';
import { Candidate } from '../types/candidate';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { Toast } from './Toast';

interface EditCandidateFormProps {
  candidate: Candidate;
  institution: Institution;
  onSuccess: (candidate: Candidate) => void;
  onClose: () => void;
}

export const EditCandidateForm = ({
  candidate,
  institution,
  onSuccess,
  onClose,
}: EditCandidateFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    whatsapp: candidate.whatsapp || '',
    name: candidate.name || '',
    email: candidate.email || '',
    document: candidate.document || '',
    zipcode: candidate.zipcode || '',
    addressLine1: candidate.addressLine1 || '',
    addressLine2: candidate.addressLine2 || '',
    city: candidate.city || '',
    state: candidate.state || '',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Atualizar formData quando candidate mudar
  useEffect(() => {
    setFormData({
      whatsapp: candidate.whatsapp || '',
      name: candidate.name || '',
      email: candidate.email || '',
      document: candidate.document || '',
      zipcode: candidate.zipcode || '',
      addressLine1: candidate.addressLine1 || '',
      addressLine2: candidate.addressLine2 || '',
      city: candidate.city || '',
      state: candidate.state || '',
    });
  }, [candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institution.id || !candidate.id) {
      setToastMessage('ID da instituição ou candidato não encontrado');
      setToastType('error');
      return;
    }

    setIsLoading(true);

    try {
      // Converter campos vazios para null e preparar body
      const body: any = {
        whatsapp: formData.whatsapp.trim() || null,
        name: formData.name.trim() || null,
        email: formData.email.trim() || null,
        document: formData.document.trim() || null,
        zipcode: formData.zipcode.trim() || null,
        addressLine1: formData.addressLine1.trim() || null,
        addressLine2: formData.addressLine2.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        institutionId: parseInt(institution.id) || 0,
      };

      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institution.id}/candidate/${candidate.id}`,
        {
          method: 'PUT',
          headers: {
            ...AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao atualizar candidato');
      }

      const updatedCandidate: Candidate = await response.json();
      setToastMessage('Candidato atualizado com sucesso!');
      setToastType('success');
      
      // Fechar modal após um breve delay para mostrar o toast
      setTimeout(() => {
        onSuccess(updatedCandidate);
        onClose();
      }, 1000);
    } catch (err) {
      setToastMessage('Erro ao atualizar candidato');
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

  const handleNext = () => {
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content modal-content-large"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">Atualizar Candidato</h3>
          
          {/* Indicador de etapas */}
          <div className="form-steps-indicator">
            <div className={`form-step ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}>
              <div className="form-step-number">1</div>
              <div className="form-step-label">Dados Pessoais</div>
            </div>
            <div className="form-step-connector"></div>
            <div className={`form-step ${currentStep === 2 ? 'active' : ''}`}>
              <div className="form-step-number">2</div>
              <div className="form-step-label">Endereço</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="create-institution-form">
            {/* Etapa 1: Dados Pessoais */}
            {currentStep === 1 && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-name" className="form-label">
                    Nome
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o nome do candidato"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-email" className="form-label">
                    Email
                  </label>
                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="email@example.com"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-whatsapp" className="form-label">
                    WhatsApp
                  </label>
                  <input
                    id="edit-whatsapp"
                    name="whatsapp"
                    type="text"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o WhatsApp"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-document" className="form-label">
                    Documento
                  </label>
                  <input
                    id="edit-document"
                    name="document"
                    type="text"
                    value={formData.document}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o documento"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            {/* Etapa 2: Endereço */}
            {currentStep === 2 && (
              <>
                <div className="form-group">
                  <label htmlFor="edit-zipcode" className="form-label">
                    CEP
                  </label>
                  <input
                    id="edit-zipcode"
                    name="zipcode"
                    type="text"
                    value={formData.zipcode}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o CEP"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-addressLine1" className="form-label">
                    Endereço (Linha 1)
                  </label>
                  <input
                    id="edit-addressLine1"
                    name="addressLine1"
                    type="text"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o endereço"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-addressLine2" className="form-label">
                    Endereço (Linha 2)
                  </label>
                  <input
                    id="edit-addressLine2"
                    name="addressLine2"
                    type="text"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Complemento do endereço"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-city" className="form-label">
                    Cidade
                  </label>
                  <input
                    id="edit-city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite a cidade"
                    disabled={isLoading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-state" className="form-label">
                    Estado
                  </label>
                  <input
                    id="edit-state"
                    name="state"
                    type="text"
                    value={formData.state}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Digite o estado"
                    disabled={isLoading}
                  />
                </div>
              </>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-button cancel-button"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </button>
              {currentStep === 1 ? (
                <button
                  type="button"
                  className="modal-button create-confirm-button"
                  onClick={handleNext}
                  disabled={isLoading}
                >
                  Próximo
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="modal-button cancel-button"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    className="modal-button create-confirm-button"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Atualizando...' : 'Atualizar Candidato'}
                  </button>
                </>
              )}
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

