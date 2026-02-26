import { useState, useEffect, useMemo } from 'react';
import { Answer } from '../types/answer';
import { Candidate } from '../types/candidate';
import { Institution } from '../types/institution';
import { AUTH_HEADER } from '../utils/api';
import { Toast } from './Toast';
import { QUESTIONS } from '../utils/questions';
import { getEtapa } from '../utils/etapaUtils';

interface EditAnswerFormProps {
  answer: Answer;
  candidate: Candidate;
  institution: Institution;
  onSuccess: (answer: Answer) => void;
  onClose: () => void;
}

export const EditAnswerForm = ({
  answer,
  candidate,
  institution,
  onSuccess,
  onClose,
}: EditAnswerFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<string>('');
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    answeredAt: '',
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

  // Inicializar formData e selectedEtapa quando answer mudar
  useEffect(() => {
    if (answer.question !== undefined) {
      const etapa = getEtapa(answer.question);
      setSelectedEtapa(etapa);
      setFormData({
        question: answer.question.toString(),
        answer: answer.answer || '',
        answeredAt: answer.answeredAt
          ? new Date(answer.answeredAt).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
    }
  }, [answer]);

  // Obter questões filtradas por etapa selecionada
  const availableQuestions = useMemo(() => {
    if (!selectedEtapa) return [];

    const questions: Array<{ number: number; text: string; etapa: string }> = [];
    
    // Gerar todas as questões de 1 a 66
    for (let i = 1; i <= 66; i++) {
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
    
    if (!institution.id || !candidate.id || !answer.id) {
      setToastMessage('ID da instituição, candidato ou resposta não encontrado');
      setToastType('error');
      return;
    }

    if (!selectedEtapa || !formData.question || !formData.answer) {
      setToastMessage('Preencha todos os campos obrigatórios');
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
        `https://criasapi.geocode.com.br/institution/${institution.id}/candidate/${candidate.id}/answer/${answer.id}`,
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
        throw new Error('Erro ao atualizar resposta');
      }

      const updatedAnswer: Answer = await response.json();
      setToastMessage('Resposta atualizada com sucesso!');
      setToastType('success');
      
      // Fechar modal após um breve delay para mostrar o toast
      setTimeout(() => {
        onSuccess(updatedAnswer);
        onClose();
      }, 1000);
    } catch (err) {
      setToastMessage('Erro ao atualizar resposta');
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

  const handleEtapaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEtapa(e.target.value);
    setFormData({
      ...formData,
      question: '', // Limpar questão quando mudar etapa
    });
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content modal-content-large"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="modal-title">Atualizar Resposta</h3>
          <form onSubmit={handleSubmit} className="create-institution-form">
            <div className="form-group">
              <label htmlFor="edit-etapa" className="form-label">
                Etapa *
              </label>
              <select
                id="edit-etapa"
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
              <label htmlFor="edit-question" className="form-label">
                Questão *
              </label>
              {selectedEtapa ? (
                <select
                  id="edit-question"
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
                  id="edit-question"
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
              <label htmlFor="edit-answer" className="form-label">
                Resposta *
              </label>
              <textarea
                id="edit-answer"
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
              <label htmlFor="edit-answeredAt" className="form-label">
                Data e Hora da Resposta
              </label>
              <input
                id="edit-answeredAt"
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
                {isLoading ? 'Atualizando...' : 'Atualizar Resposta'}
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

