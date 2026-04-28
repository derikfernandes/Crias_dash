import { useState, useMemo } from 'react';
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
  deleteLoadingId,
}: AnswerTableProps) => {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    if (question >= 1 && question <= 1) {
      return 'Inicial';
    } else if (question >= 2 && question <= 25) {
      return 'Conhecendo Você';
    } else if (question >= 26 && question <= 46) {
      return 'Conhecendo sua Família';
    } else if (question >= 47 && question <= 59) {
      return 'Formulário Socioeconômico';
    } else if (question >= 60 && question <= 66) {
      return 'Sobre sua participação';
    } else if (question === 67) {
      return 'Etapa 3';
    }
    return 'Desconhecida';
  };

  const getQuestionText = (questionNumber: number | undefined): string => {
    if (questionNumber === undefined) return 'Enunciado não encontrado';
    return QUESTIONS[questionNumber] || 'Enunciado não encontrado';
  };

  const isLikelyUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const renderAnswerValue = (question: number | undefined, answerValue: string | undefined) => {
    const value = answerValue || '';
    if (question === 67 && isLikelyUrl(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          Abrir arquivo
        </a>
      );
    }
    return value;
  };

  // Obter valor para ordenação conforme a coluna
  const getSortValue = (answer: Answer, key: string): string | number => {
    const q = answer.question ?? 0;
    switch (key) {
      case 'id':
        return answer.id ?? '';
      case 'question':
        return answer.question ?? -1;
      case 'enunciado':
        return getQuestionText(answer.question);
      case 'etapa':
        return getEtapa(q);
      case 'answer':
        return answer.answer ?? '';
      case 'formattedAnswer':
        return getFormattedAnswer(q, answer.answer || '');
      case 'options':
        return getQuestionOptions(q) || '';
      case 'answeredAt':
        return answer.answeredAt ? new Date(answer.answeredAt).getTime() : 0;
      default:
        return formatValue(answer[key as keyof Answer], key) ?? '';
    }
  };

  const sortedAnswers = useMemo(() => {
    if (!sortBy || answers.length === 0) return answers;
    const dir = sortDirection === 'asc' ? 1 : -1;
    const isEmpty = (v: string | number): boolean => {
      if (v === '' || v === null || v === undefined) return true;
      if (typeof v === 'number' && (v === -1 || (sortBy === 'answeredAt' && v === 0))) return true;
      return false;
    };
    return [...answers].sort((a, b) => {
      const valA = getSortValue(a, sortBy);
      const valB = getSortValue(b, sortBy);
      if (isEmpty(valA) && isEmpty(valB)) return 0;
      if (isEmpty(valA)) return dir;
      if (isEmpty(valB)) return -dir;
      if (typeof valA === 'number' && typeof valB === 'number') return dir * (valA - valB);
      return dir * String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
    });
  }, [answers, sortBy, sortDirection]);

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
  };

  // Extrair colunas dinâmicas extras (excluindo campos que já têm colunas especiais)
  const dynamicColumns = useMemo(() => {
    if (answers.length === 0) return [];
    return getDynamicColumns(answers, [
      'id',
      'question',
      'answer',
      'answeredAt',
      'candidateId',
    ]);
  }, [answers]);

  return (
    <div className="table-wrapper">
      <table className="answers-table">
        <thead>
          <tr>
            {/* Colunas especiais (fixas) - ordenáveis */}
            <th
              className="sortable-th"
              onClick={() => handleSort('id')}
              title={sortBy === 'id' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por ID'}
            >
              <span className="th-content">
                ID
                {sortBy === 'id' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('question')}
              title={sortBy === 'question' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Questão'}
            >
              <span className="th-content">
                Questão
                {sortBy === 'question' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('enunciado')}
              title={sortBy === 'enunciado' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Enunciado'}
            >
              <span className="th-content">
                Enunciado
                {sortBy === 'enunciado' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('etapa')}
              title={sortBy === 'etapa' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Etapa'}
            >
              <span className="th-content">
                Etapa
                {sortBy === 'etapa' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('answer')}
              title={sortBy === 'answer' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Resposta'}
            >
              <span className="th-content">
                Resposta
                {sortBy === 'answer' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('formattedAnswer')}
              title={sortBy === 'formattedAnswer' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Opção Selecionada'}
            >
              <span className="th-content">
                Opção Selecionada
                {sortBy === 'formattedAnswer' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('options')}
              title={sortBy === 'options' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Opções'}
            >
              <span className="th-content">
                Opções
                {sortBy === 'options' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            <th
              className="sortable-th"
              onClick={() => handleSort('answeredAt')}
              title={sortBy === 'answeredAt' ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : 'Ordenar por Data'}
            >
              <span className="th-content">
                Data da resposta
                {sortBy === 'answeredAt' && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
              </span>
            </th>
            {onEditClick && <th>Ações</th>}
            {/* Colunas dinâmicas extras - ordenáveis */}
            {dynamicColumns.map((col) => (
              <th
                key={col.key}
                className="sortable-th"
                onClick={() => handleSort(col.key)}
                title={sortBy === col.key ? (sortDirection === 'asc' ? 'Clique para descrescente' : 'Clique para crescente') : `Ordenar por ${col.label}`}
              >
                <span className="th-content">
                  {col.label}
                  {sortBy === col.key && <span className="sort-indicator" aria-hidden>{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedAnswers.map((answer) => {
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
                <td>{renderAnswerValue(answer.question, answer.answer)}</td>
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

