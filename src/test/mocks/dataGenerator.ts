/**
 * Gerador de dados mockados para testes
 * Simula 10.000 alunos com dados realistas
 */

import { Candidate } from '../../types/candidate';
import { Answer } from '../../types/answer';
import { Institution } from '../../types/institution';

const NAMES = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza',
  'Juliana Ferreira', 'Ricardo Alves', 'Fernanda Lima', 'Bruno Martins', 'Camila Rocha',
];

const CITIES = [
  'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Brasília',
  'Curitiba', 'Recife', 'Porto Alegre', 'Fortaleza', 'Manaus',
];

function generatePhone(): string {
  const ddd = Math.floor(Math.random() * 90) + 10;
  const number = Math.floor(Math.random() * 900000000) + 100000000;
  return `(${ddd}) ${number.toString().slice(0, 5)}-${number.toString().slice(5)}`;
}

function generateEmail(name: string): string {
  const domain = ['gmail.com', 'hotmail.com', 'yahoo.com.br'][Math.floor(Math.random() * 3)];
  const normalizedName = name.toLowerCase().replace(/\s+/g, '.');
  return `${normalizedName}@${domain}`;
}

function generateCPF(): string {
  const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  return numbers.join('').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3-XX');
}

function generateAddress(): string {
  const streets = ['Rua', 'Avenida', 'Praça'];
  const streetNames = ['das Flores', 'do Comércio', 'Principal'];
  const street = streets[Math.floor(Math.random() * streets.length)];
  const name = streetNames[Math.floor(Math.random() * streetNames.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  return `${street} ${name}, ${number}`;
}

function generateDate(daysAgo: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo - Math.floor(Math.random() * 730));
  return date.toISOString();
}

function generateAnswers(candidateId: string, maxQuestions: number = 66): Answer[] {
  const answers: Answer[] = [];
  const numAnswers = Math.floor(Math.random() * maxQuestions) + 1;
  
  for (let i = 0; i < numAnswers; i++) {
    const question = i;
    let answer: string;
    
    if (question === 0 || question === 1) {
      answer = Math.random() > 0.5 ? 'Sim' : 'Não';
    } else if (question >= 2 && question <= 24) {
      const options = ['Opção A', 'Opção B', 'Opção C', 'Sim', 'Não'];
      answer = options[Math.floor(Math.random() * options.length)];
    } else if (question === 65) {
      answer = 'Finalizado';
    } else {
      answer = `Resposta ${question}`;
    }
    
    answers.push({
      id: `${candidateId}-${question}`,
      candidateId: parseInt(candidateId) || 0,
      question,
      answer,
      answeredAt: generateDate(Math.floor(Math.random() * 180)),
    });
  }
  
  return answers;
}

export function generateMockCandidate(id: number, institutionId: string): Candidate {
  const nameIndex = id % NAMES.length;
  const name = `${NAMES[nameIndex]} ${id}`;
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const createdAt = generateDate(Math.floor(Math.random() * 365));
  
  return {
    id: String(id),
    institutionId: parseInt(institutionId) || 0,
    name,
    email: generateEmail(name),
    whatsapp: generatePhone(),
    document: generateCPF(),
    addressLine1: generateAddress(),
    city,
    createdAt,
    updatedAt: createdAt,
  };
}

export function generateMockCandidates(count: number, institutionId: string): Candidate[] {
  return Array.from({ length: count }, (_, i) => 
    generateMockCandidate(i + 1, institutionId)
  );
}

export function generateMockAnswers(
  candidates: Candidate[],
  answerRate: number = 0.8
): Map<string, Answer[]> {
  const answersMap = new Map<string, Answer[]>();
  
  candidates.forEach((candidate) => {
    if (candidate.id && Math.random() < answerRate) {
      const answers = generateAnswers(candidate.id);
      answersMap.set(candidate.id, answers);
    }
  });
  
  return answersMap;
}

export function generateMockInstitution(id: number): Institution {
  return {
    id: String(id),
    name: `Instituição ${id}`,
    type: 'ONG',
    document: generateCPF(),
    email: `instituicao${id}@example.com`,
    phone: generatePhone(),
  };
}

export function generateScaleTestData(institutionId: string = '1') {
  console.log('Gerando dados de teste para 10.000 alunos...');
  
  const startTime = Date.now();
  const candidates = generateMockCandidates(10000, institutionId);
  const answersMap = generateMockAnswers(candidates, 0.75);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log(`✅ Dados gerados em ${duration}s`);
  console.log(`   - ${candidates.length} candidatos`);
  console.log(`   - ${answersMap.size} candidatos com respostas`);
  
  const totalAnswers = Array.from(answersMap.values()).reduce(
    (sum, answers) => sum + answers.length,
    0
  );
  console.log(`   - ${totalAnswers} respostas no total`);
  
  return {
    candidates,
    answersMap,
    institution: generateMockInstitution(parseInt(institutionId) || 1),
  };
}

