// Mapeamento de respostas de questões fechadas
// Formato: { questão: { resposta: texto_formatado } }
// IDs das questões: 1 a 66

export const ANSWER_MAPPINGS: Record<number, Record<string, string>> = {
  8: {
    'A': 'Masculino',
    'B': 'Feminino',
    'C': 'Outro',
    'D': 'Prefiro não dizer',
  },
  9: {
    'A': 'Branca',
    'B': 'Preta',
    'C': 'Parda',
    'D': 'Indígena',
    'E': 'Amarela',
  },
  10: {
    'A': 'Não',
    'B': 'Sim',
  },
  11: {
    'A': 'Não tenho deficiência',
    'B': 'Visual',
    'C': 'Auditiva',
    'D': 'Física',
    'E': 'Intelectual',
    'F': 'Outro',
  },
  16: {
    'A': 'Todo em escola pública',
    'B': 'Todo em escola particular',
    'C': 'Maior parte em escola pública',
    'D': 'Maior parte em escola particular',
    'E': 'Em outra situação',
  },
  17: {
    'A': 'Olga Benatti',
    'B': 'Rep. do Paraguay',
    'C': 'Princesa Isabel',
    'D': 'Dr. Kyrillos',
    'E': 'Carlos Maxmiliano',
    'F': 'Brisabella',
    'G': 'Lourenço Filho',
    'H': 'Reinaldo Ribeiro',
    'I': 'Instituto Acaia',
    'J': 'Outra',
  },
  19: {
    'A': 'Pública',
    'B': 'Particular',
  },
  20: {
    'A': 'Sim, bolsa por desempenho acadêmico',
    'B': 'Sim, bolsa por critério socioeconômico',
    'C': 'Não',
  },
  21: {
    'A': '9º ano Fund. II',
    'B': 'Outro',
  },
  22: {
    'A': 'Manhã',
    'B': 'Tarde',
    'C': 'Integral',
  },
  23: {
    'A': 'Sim',
    'B': 'Não',
    'C': 'Não sei informar',
  },
  25: {
    'A': 'Arrastão',
    'B': 'PDA',
    'C': 'LALA',
    'D': 'Arco',
    'E': 'Não participo',
    'F': 'Pulse Mais',
    'G': 'Meninas em Campo',
  },
  27: {
    'A': 'Mãe/Pai',
    'B': 'Avó/Avô',
    'C': 'Tio/tia',
    'D': 'Outro',
  },
  30: {
    'A': 'Não estudou',
    'B': 'Ensino fundamental',
    'C': 'Ensino médio',
    'D': 'Superior completo',
    'E': 'Pós-graduação',
  },
  31: {
    'A': 'Trabalha com carteira assinada (CLT)',
    'B': 'Trabalha de maneira autônoma ou informal',
    'C': 'Desempregado(a)',
    'D': 'Aposentado(a)',
    'E': 'Pensionista',
    'F': 'Outro',
  },
  32: {
    '1': 'Na indústria.',
    '2': 'Na construção civil.',
    '3': 'No setor de serviços (comércio, banco, transporte, hotelaria, motorista de aplicativo etc).',
    '4': 'Funcionária pública do governo federal, estadual ou municipal.',
    '5': 'Profissional liberal (por exemplo: dentista, advogado (a), psicólogo (a), etc) , professora ou técnica de nível superior.',
    '6': 'Trabalhadora fora de casa em atividades informais (pintora, eletricista, encanadora, feirante, ambulante, guardadora de carros, catadora de lixo etc.).',
    '7': 'Trabalha em sua casa em serviços (alfaiataria, cozinha, aulas particulares, artesanato, carpintaria, marcenaria etc)',
    '8': 'Trabalhadora doméstica em casa de outras pessoas (faxineira, cozinheira, empregado doméstica, motorista particular, jardineira, vigia, acompanhante de idosos/as etc.)',
    '9': 'No lar (sem remuneração).',
    '10': 'Não trabalha.',
    '11': 'Outra opção.',
    '12': 'Não sei.',
  },
  34: {
    'A': 'Mãe/Pai',
    'B': 'Avó/Avô',
    'C': 'Tio/tia',
    'D': 'Outro',
  },
  37: {
    'A': 'Não estudou',
    'B': 'Ensino fundamental',
    'C': 'Ensino médio',
    'D': 'Superior completo',
    'E': 'Pós-graduação',
  },
  38: {
    'A': 'Trabalha com carteira assinada (CLT)',
    'B': 'Trabalha de maneira autônoma ou informal',
    'C': 'Desempregado(a)',
    'D': 'Aposentado(a)',
    'E': 'Pensionista',
    'F': 'Outro',
  },
  39: {
    '1': 'Na indústria.',
    '2': 'Na construção civil.',
    '3': 'No setor de serviços (comércio, banco, transporte, hotelaria, motorista de aplicativo etc).',
    '4': 'Funcionária pública do governo federal, estadual ou municipal.',
    '5': 'Profissional liberal (por exemplo: dentista, advogado (a), psicólogo (a), etc) , professora ou técnica de nível superior.',
    '6': 'Trabalhadora fora de casa em atividades informais (pintora, eletricista, encanadora, feirante, ambulante, guardadora de carros, catadora de lixo etc.).',
    '7': 'Trabalha em sua casa em serviços (alfaiataria, cozinha, aulas particulares, artesanato, carpintaria, marcenaria etc)',
    '8': 'Trabalhadora doméstica em casa de outras pessoas (faxineira, cozinheira, empregado doméstica, motorista particular, jardineira, vigia, acompanhante de idosos/as etc.)',
    '9': 'No lar (sem remuneração).',
    '10': 'Não trabalha.',
    '11': 'Outra opção.',
    '12': 'Não sei.',
  },
  40: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4',
    'E': '5 ou mais',
  },
  41: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4',
    'E': '5 ou mais',
    'F': 'Nenhuma',
  },
  42: {
    'A': 'Até 1 SM – até R$ 1.621,00',
    'B': 'Acima de 1 até 2 SM – de R$ 1.621,01 até R$ 3.242,00',
    'C': 'Acima de 2 até 3 SM – de R$ 3.242,01 até R$ 4.863,00',
    'D': 'Acima de 3 até 5 SM – de R$ 4.863,01 até R$ 8.105,00',
    'E': 'Acima de 5 até 7 SM – de R$ 8.105,01 até R$ 11.347,00',
    'F': 'Acima de 7 até 10 SM – de R$ 11.347,01 até R$ 16.210,00',
    'G': 'Acima de 10 SM – acima de R$ 16.210,00',
  },
  43: {
    'A': 'Sim',
    'B': 'Não',
  },
  44: {
    'A': 'Sim',
    'B': 'Não',
  },
  45: {
    'A': 'Não se aplica',
    'B': 'Auxílio-Doença',
    'C': 'Bolsa Família',
    'D': 'BPC',
    'E': 'Outros',
  },
  46: {
    'A': 'Próprio, quitado',
    'B': 'Cedido por instituição/empresa/parentes/conhecidos',
    'C': 'Próprio, com financiamento em curso',
    'D': 'Alugado',
    'E': 'Próprio, construído em terreno sem regularização',
  },
  47: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  48: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  49: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  50: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  51: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  52: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  53: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  54: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  55: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  56: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  57: {
    'A': '1',
    'B': '2',
    'C': '3',
    'D': '4 ou mais',
    'E': 'Não possui',
  },
  58: {
    'A': 'Rede geral de distribuição',
    'B': 'Poço ou nascente',
    'C': 'Outro meio',
  },
  59: {
    'A': 'Asfaltada',
    'B': 'Terra',
  },
  60: {
    'A': 'Híbrido',
    'B': 'Presencial',
    'C': 'Sem preferência',
  },
  61: {
    'A': 'Distância',
    'B': 'Transporte',
    'C': 'Outro',
    'D': 'Sem impeditivos',
  },
  62: {
    'A': 'Sem dispositivo',
    'B': 'Não tenho wifi',
    'C': 'Outro',
    'D': 'Nenhum impeditivo',
  },
  63: {
    '1': 'Wi-fi em casa.',
    '2': 'Dados próprios.',
    '3': 'Wi-fi de terceiros (escola, trabalho, centros públicos, comércio).',
    '4': 'Não acesso a internet.',
  },
  64: {
    '1': 'Celular.',
    '2': 'Tablet.',
    '3': 'Notebook.',
    '4': 'Não acesso.',
  },
  65: {
    'A': 'Dos aparelhos assinalados acima, pelo menos um é meu e tenho acesso a ele irrestrito;',
    'B': 'Dos aparelhos assinalados acima, nenhum deles é meu e preciso solicitar emprestado para alguma das pessoas que residem comigo para usar;',
    'C': 'Dos aparelhos assinalados acima, nenhum deles é meu e preciso ir a espaços fora de casa (escola ou espaço público) para acessá-los.;',
    'D': 'Não possuo acesso a nenhum dos aparelhos listados na pergunta acima.',
  },
  66: {
    'A': 'Possuo um espaço de estudos em que consigo me concentrar, sem necessidade de dividir o ambiente com outras pessoas;',
    'B': 'Possuo um espaço de estudos em casa que é dividido com outras pessoas (sala, cozinha, etc);',
    'C': 'Não possuo um espaço de estudos em casa, e preciso ir a outros locais (escola, bilioteca) para conseguir estudar.',
  },
};

// Função auxiliar para obter a resposta formatada
export const getFormattedAnswer = (questionNumber: number, answer: string): string => {
  const mapping = ANSWER_MAPPINGS[questionNumber];
  if (!mapping) {
    return answer; // Retorna a resposta original se não houver mapeamento
  }

  // Remove espaços e converte para maiúscula para comparação
  const normalizedAnswer = answer.trim().toUpperCase();

  // Tenta encontrar o mapeamento
  const formatted = mapping[normalizedAnswer];
  if (formatted) {
    return formatted;
  }

  // Se não encontrar, retorna a resposta original
  return answer;
};

// Função para obter todas as opções de uma questão
export const getQuestionOptions = (questionNumber: number): string => {
  const mapping = ANSWER_MAPPINGS[questionNumber];
  if (!mapping) {
    return ''; // Retorna vazio se não houver mapeamento
  }

  // Retorna todas as opções formatadas como "A. Opção 1; B. Opção 2; ..."
  const options = Object.entries(mapping)
    .sort(([keyA], [keyB]) => {
      // Ordena por chave (A, B, C... ou 1, 2, 3...)
      if (isNaN(Number(keyA)) && isNaN(Number(keyB))) {
        return keyA.localeCompare(keyB);
      }
      return Number(keyA) - Number(keyB);
    })
    .map(([key, value]) => `${key}. ${value}`)
    .join('; ');

  return options;
};
