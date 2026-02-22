export interface Candidate {
  id?: string;
  whatsapp?: string;
  name?: string;
  email?: string;
  document?: string;
  zipcode?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  institutionId?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Permite campos extras da API
}

