import { useState, useMemo } from 'react';
import { Answer } from '../types/answer';
import { Candidate } from '../types/candidate';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { Toast } from './Toast';
import { QUESTIONS } from '../utils/questions';
import { getEtapa } from '../utils/etapaUtils';

interface CreateAnswerFormProps {
  candidate: Candidate;
  institution: Institution;
  onSuccess: (answer: Answer) => void;
}

export const CreateAnswerForm = ({
  candidate,
  institution,
  onSuccess,
}: CreateAnswerFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<string>('');
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    answeredAt: new Date().toISOString().slice(0, 16), // Formato para input datetime-local
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Lista de etapas disponíveis
  const etapas = [
    'Inicial',
    'Conhecendo Você',
    'Conhecendo sua Família',
    'Formulário Socioeconômico',
    'Sobre sua participação',
    'Finalizou',
  ];

  // Obter questões filtradas por etapa selecionada
  const availableQuestions = useMemo(() => {
    if (!selectedEtapa) return [];

    const questions: Array<{ number: number; text: string; etapa: string }> = [];
    
    // Gerar todas as questões de 0 a 65
    for (let i = 0; i <= 65; i++) {
      const etapa = getEtapa(i);
      if (etapa === selectedEtapa) {
        questions.push({
          number: i,
          text: QUESTIONS[i] || `Questão ${i}`,
          etapa: etapa,
        });
      }
    }

    return questions;
  }, [selectedEtapa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!institution.id || !candidate.id) {
      setToastMessage('ID da instituição ou candidato não encontrado');
      setToastType('error');
      return;
    }

    if (!selectedEtapa || !formData.question || !formData.answer) {
      setToastMessage('Selecione a etapa, a questão e preencha a resposta');
      setToastType('error');
      return;
    }

    setIsLoading(true);

    try {
      // Converter answeredAt para formato ISO se não estiver vazio
      const answeredAt = formData.answeredAt 
        ? new Date(formData.answeredAt).toISOString()
        : new Date().toISOString();

      const body = {
        candidateId: parseInt(candidate.id) || 0,
        question: parseInt(formData.question),
        answer: formData.answer.trim(),
        answeredAt: answeredAt,
      };

      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institution.id}/candidate/${candidate.id}/answer/`,
        {
          method: 'POST',
          headers: {
            ...AUTH_HEADER,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao criar resposta');
      }

      const newAnswer: Answer = await response.json();
      setToastMessage('Resposta criada com sucesso!');
      setToastType('success');
      setFormData({
        question: '',
        answer: '',
        answeredAt: new Date().toISOString().slice(0, 16),
      });
      setIsOpen(false);
      onSuccess(newAnswer);
    } catch (err) {
      setToastMessage('Erro ao criar resposta');
      setToastType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedEtapa('');
    setFormData({
      question: '',
      answer: '',
      answeredAt: new Date().toISOString().slice(0, 16),
    });
  };

  const handleEtapaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEtapa(e.target.value);
    setFormData({
      ...formData,
      question: '', // Limpar questão quando mudar etapa
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
        Criar Resposta
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={handleClose}>
          <div
            className="modal-content modal-content-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Criar Nova Resposta</h3>
            <form onSubmit={handleSubmit} className="create-institution-form">
              <div className="form-group">
                <label htmlFor="etapa" className="form-label">
                  Etapa *
                </label>
                <select
                  id="etapa"
                  name="etapa"
                  value={selectedEtapa}
                  onChange={handleEtapaChange}
                  className="form-input"
                  required
                  disabled={isLoading}
                >
                  <option value="">Selecione uma etapa</option>
                  {etapas.map((etapa) => (
                    <option key={etapa} value={etapa}>
                      {etapa}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="question" className="form-label">
                  Questão *
                </label>
                {selectedEtapa ? (
                  <select
                    id="question"
                    name="question"
                    value={formData.question}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        [e.target.name]: e.target.value,
                      });
                    }}
                    className="form-input"
                    required
                    disabled={isLoading}
                  >
                    <option value="">Selecione uma questão</option>
                    {availableQuestions.map((q) => (
                      <option key={q.number} value={q.number}>
                        {q.number} - {q.text}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="question"
                    name="question"
                    type="text"
                    value=""
                    className="form-input"
                    placeholder="Selecione primeiro uma etapa"
                    disabled
                  />
                )}
                {formData.question && QUESTIONS[parseInt(formData.question)] && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem', color: '#374151' }}>
                    <strong>Enunciado:</strong> {QUESTIONS[parseInt(formData.question)]}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="answer" className="form-label">
                  Resposta *
                </label>
                <textarea
                  id="answer"
                  name="answer"
                  value={formData.answer}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Digite a resposta"
                  rows={4}
                  required
                  disabled={isLoading}
                  style={{
                    resize: 'vertical',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="answeredAt" className="form-label">
                  Data e Hora da Resposta
                </label>
                <input
                  id="answeredAt"
                  name="answeredAt"
                  type="datetime-local"
                  value={formData.answeredAt}
                  onChange={handleChange}
                  className="form-input"
                  disabled={isLoading}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-button cancel-button"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="modal-button create-confirm-button"
                  disabled={isLoading}
                >
                  {isLoading ? 'Criando...' : 'Criar Resposta'}
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

