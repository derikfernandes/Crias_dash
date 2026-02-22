export interface ColumnConfig {
  key: string;
  label: string;
  format?: (value: any) => string;
  exclude?: boolean;
}

// Mapeamento de nomes amigáveis para campos
const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  name: 'Nome',
  whatsapp: 'WhatsApp',
  email: 'Email',
  document: 'Documento',
  addressLine1: 'Endereço',
  city: 'Cidade',
  createdAt: 'Criado em',
  updatedAt: 'Atualizado em',
  type: 'Tipo',
  candidateId: 'ID do Candidato',
  question: 'Questão',
  answer: 'Resposta',
  answeredAt: 'Data da resposta',
  phone: 'Telefone',
  address: 'Endereço',
  state: 'Estado',
  zipCode: 'CEP',
  birthDate: 'Data de Nascimento',
  // Adicione mais conforme necessário
};

// Função para obter label amigável
export const getFieldLabel = (key: string): string => {
  return (
    FIELD_LABELS[key] ||
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  );
};

// Função para extrair todas as chaves únicas de um array de objetos
export const extractAllKeys = (items: any[]): string[] => {
  const keysSet = new Set<string>();
  items.forEach((item) => {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach((key) => keysSet.add(key));
    }
  });
  return Array.from(keysSet);
};

// Função para formatar valor
export const formatValue = (value: any, key: string): string => {
  if (value === null || value === undefined) {
    return ''; // Retorna vazio se não existir
  }

  // Formatação especial para datas
  if (
    key.toLowerCase().includes('date') ||
    key.toLowerCase().includes('at') ||
    key.toLowerCase().includes('created') ||
    key.toLowerCase().includes('updated')
  ) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      // Se não for data válida, retorna o valor original
    }
  }

  return String(value);
};

// Função para obter colunas dinâmicas (excluindo campos especiais)
export const getDynamicColumns = (
  items: any[],
  excludeKeys: string[] = []
): ColumnConfig[] => {
  if (!items || items.length === 0) {
    return [];
  }

  const allKeys = extractAllKeys(items);
  return allKeys
    .filter((key) => !excludeKeys.includes(key))
    .map((key) => ({
      key,
      label: getFieldLabel(key),
    }));
};

