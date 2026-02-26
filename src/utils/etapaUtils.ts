import { Answer } from '../types/answer';

export const getEtapa = (question: number): string => {
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

  // Verificar se tem resposta na questão 66 (Finalizou)
  const hasQuestion66 = answers.some((answer) => answer.question !== undefined && answer.question === 66);
  if (hasQuestion66) {
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
