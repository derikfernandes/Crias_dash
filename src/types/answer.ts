export interface Answer {
  id?: string;
  candidateId?: string;
  question?: number;
  answer?: string;
  answeredAt?: string;
  [key: string]: any; // Permite campos extras da API
}

