export interface Institution {
  id?: string;
  name?: string;
  type?: string;
  document?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  [key: string]: any; // Permite campos extras da API
}

