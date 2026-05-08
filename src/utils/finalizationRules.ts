const FINALIZATION_QUESTION_BY_STAGE: Record<string, number> = {
  'Etapa 1 — desclassificados no PS': 66,
  'Etapa 2 — desclassificados na prova': 66,
  'Etapa 3 — Envio de Redação': 67,
  'Etapa 4 — Formulário Socioemocional': 91,
};

/**
 * Regra de finalização por contexto de etapa selecionada:
 * - Sem etapa selecionada: usa Q66.
 * - Com etapa selecionada: usa a questão mapeada da etapa.
 */
export const getFinalizationQuestionForStages = (
  selectedStages: string[]
): number => {
  if (selectedStages.length === 0) return 66;
  const firstStage = selectedStages[0];
  return FINALIZATION_QUESTION_BY_STAGE[firstStage] ?? 66;
};

