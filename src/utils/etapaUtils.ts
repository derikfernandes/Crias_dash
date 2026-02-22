import { Answer } from '../types/answer';

export const getEtapa = (question: number): string => {
  if (question >= 0 && question <= 1) {
    return 'Inicial';
  } else if (question >= 2 && question <= 24) {
    return 'Conhecendo Você';
  } else if (question >= 25 && question <= 45) {
    return 'Conhecendo sua Família';
  } else if (question >= 46 && question <= 58) {
    return 'Formulário Socioeconômico';
  } else if (question >= 59 && question <= 64) {
    return 'Sobre sua participação';
  } else if (question === 65) {
    return 'Finalizou';
  }
  return 'Desconhecida';
};

export const getCandidateEtapa = (
  candidateId: string,
  answersMap: Map<string, Answer[]>
): string => {
  const answers = answersMap.get(candidateId) || [];

  if (answers.length === 0) {
    return 'Sem respostas';
  }

  // Verificar se tem resposta na questão 65 (Finalizou)
  const hasQuestion65 = answers.some((answer) => answer.question !== undefined && answer.question === 65);
  if (hasQuestion65) {
    return 'Finalizou';
  }

  // Caso contrário, encontrar a etapa mais avançada
  let maiorNumeroQuestao = -1;
  answers.forEach((answer) => {
    if (answer.question && answer.question > maiorNumeroQuestao) {
      maiorNumeroQuestao = answer.question;
    }
  });

  return getEtapa(maiorNumeroQuestao);
};

