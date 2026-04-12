/** Registro retornado pela API de etapas do candidato */
export interface CandidateStageRecord {
  id?: number;
  candidateId?: number;
  code?: string;
  enabledAt?: string;
}

/** Etapa “nomeada” pelo usuário (nome exibido + código enviado à API) */
export interface StageDefinition {
  code: string;
  name: string;
}
