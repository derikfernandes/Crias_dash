import { useMemo } from 'react';
import { Answer } from '../types/answer';
import { QUESTIONS } from '../utils/questions';
import { getFormattedAnswer, getQuestionOptions } from '../utils/answerMappings';
import { getDynamicColumns, formatValue } from '../utils/tableUtils';
import { DeleteAnswerButton } from './DeleteAnswerButton';

interface AnswerTableProps {
  answers: Answer[];
  onEditClick?: (answer: Answer) => void;
  onDeleteClick?: (answerId: string) => void;
  deleteLoadingId?: string | null;
}

export const AnswerTable = ({ 
  answers, 
  onEditClick, 
  onDeleteClick,
  deleteLoadingId 
}: AnswerTableProps) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEtapa = (question: number): string => {
    if (question >= 0 && question <= 1) {
      return 'Inicial';
    } else if (question >= 2 && question <= 24) {
      return 'Conhecendo Você';
    } else if (question >= 25 && question <= 45) {
      return 'Conhecendo sua Família';
    } else if (question >= 46 && question <= 58) {
      return 'Formulário Socioeconômico';
    } else if (question >= 59 && question <= 65) {
      return 'Sobre sua participação';
    }
    return 'Desconhecida';
  };

  const getQuestionText = (questionNumber: number | undefined): string => {
    if (questionNumber === undefined) return 'Enunciado não encontrado';
    return QUESTIONS[questionNumber] || 'Enunciado não encontrado';
  };

  // Extrair colunas dinâmicas extras (excluindo campos que já têm colunas especiais)
  const dynamicColumns = useMemo(() => {
    if (answers.length === 0) return [];
    return getDynamicColumns(answers, [
      'id',
      'question',
      'answer',
      'answeredAt',
      'candidateId', // Campos que já têm colunas especiais
    ]);
  }, [answers]);

  return (
    <div className="table-wrapper">
      <table className="answers-table">
        <thead>
          <tr>
            {/* Colunas especiais (fixas) */}
            <th>ID</th>
            <th>Questão</th>
            <th>Enunciado</th>
            <th>Etapa</th>
            <th>Resposta</th>
            <th>Opção Selecionada</th>
            <th>Opções</th>
            <th>Data da resposta</th>
            {onEditClick && <th>Ações</th>}
            {/* Colunas dinâmicas extras */}
            {dynamicColumns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {answers.map((answer) => {
            const formattedAnswer = getFormattedAnswer(
              answer.question || 0,
              answer.answer || ''
            );
            const hasMapping = formattedAnswer !== answer.answer;
            const options = getQuestionOptions(answer.question || 0);
            return (
              <tr 
                key={answer.id}
                className={deleteLoadingId === answer.id ? 'deleting' : ''}
              >
                {/* Células especiais (fixas) */}
                <td>{answer.id || ''}</td>
                <td>{answer.question ?? ''}</td>
                <td className="question-text">
                  {getQuestionText(answer.question)}
                </td>
                <td>{getEtapa(answer.question || 0)}</td>
                <td>{answer.answer || ''}</td>
                <td className={hasMapping ? 'formatted-answer' : ''}>
                  {hasMapping ? formattedAnswer : answer.answer || ''}
                </td>
                <td className="question-options">{options || '-'}</td>
                <td>
                  {answer.answeredAt
                    ? formatDate(answer.answeredAt)
                    : ''}
                </td>
                {(onEditClick || onDeleteClick) && (
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {onEditClick && (
                        <button
                          className="edit-institution-button"
                          onClick={() => onEditClick(answer)}
                          title="Atualizar resposta"
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
                      )}
                      {onDeleteClick && answer.id && (
                        <DeleteAnswerButton
                          answer={answer}
                          onDeleteClick={() => answer.id && onDeleteClick(answer.id)}
                          isDeleting={deleteLoadingId === answer.id}
                        />
                      )}
                    </div>
                  </td>
                )}
                {/* Células dinâmicas extras */}
                {dynamicColumns.map((col) => (
                  <td key={col.key}>
                    {formatValue(answer[col.key], col.key)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

