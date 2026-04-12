import type { StageDefinition } from '../types/candidateStage';

/**
 * Etapas fixas: altere nomes e códigos aqui.
 *
 * **Importante:** no banco, `candidate_stage.code` é `varchar(10)` — cada `code`
 * precisa ter no máximo 10 caracteres, senão o insert falha.
 */
export const ESTAGIO_STAGES: StageDefinition[] = [
  {
    code: 'E1_DES_PS',
    name: 'Etapa 1 — desclassificados no PS',
  },
  {
    code: 'E2_DES_PR',
    name: 'Etapa 2 — desclassificados na prova',
  },
];

const MAX_CODE_LEN = 10;
ESTAGIO_STAGES.forEach((row) => {
  if (row.code.length > MAX_CODE_LEN) {
    throw new Error(
      `[estagioStages] O code "${row.code}" tem ${row.code.length} caracteres; o máximo é ${MAX_CODE_LEN}.`
    );
  }
});
