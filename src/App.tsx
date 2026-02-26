import { useState, useEffect, useRef, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Institution } from './types/institution';
import { Candidate } from './types/candidate';
import { Answer } from './types/answer';
import { InstitutionProfile } from './components/InstitutionProfile';
import { CandidatesTable } from './components/CandidatesTable';
import { CandidateAnswersPanel } from './components/CandidateAnswersPanel';
import { EtapasChart } from './components/EtapasChart';
import { AnswersChart } from './components/AnswersChart';
import { InactivityChart } from './components/InactivityChart';
import { NavigationHeader } from './components/NavigationHeader';
import { Gerenciamento } from './pages/Gerenciamento';
import { Login } from './pages/Login';
import { Graficos } from './pages/Graficos';
import { useInstitution } from './contexts/InstitutionContext';
import { AUTH_HEADER } from './utils/api';
import { QUESTIONS } from './utils/questions';
import { getFormattedAnswer, getQuestionOptions } from './utils/answerMappings';
import { getCandidateEtapa as getCandidateEtapaUtil } from './utils/etapaUtils';
import { cache, getAnswersCacheKey, getCandidatesCacheKey } from './utils/cache';
import { processInBatches } from './utils/batchProcessor';
import * as XLSX from 'xlsx';
import './App.css';

function App() {
  const { selectedInstitution, setSelectedInstitution } = useInstitution();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [allCandidatesAnswersMap, setAllCandidatesAnswersMap] = useState<
    Map<string, Answer[]>
  >(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCandidate, setIsExportingCandidate] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedInactivity, setSelectedInactivity] = useState<'finalized' | 'notFinalized' | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllerAnswersRef = useRef<AbortController | null>(null);

  const fetchInstitutions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        'https://criasapi.geocode.com.br/institution/',
        {
          headers: AUTH_HEADER,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar instituições');
      }

      const data: Institution[] = await response.json();
      
      // Se o usuário for "institutosol", filtrar apenas a instituição com ID 1
      let filteredData = data;
      if (username === 'institutosol') {
        filteredData = data.filter((inst) => {
          // Verificar se o id é '1' (string) ou convertido para string é '1'
          return inst.id === '1' || String(inst.id) === '1';
        });
      }
      
      setInstitutions(filteredData);
      
      // Selecionar automaticamente a instituição com id 1 (se ainda não houver uma selecionada)
      if (!selectedInstitution) {
        const defaultInstitution = filteredData.find((inst) => {
          // Verificar se o id é '1' (string) ou convertido para string é '1'
          return inst.id === '1' || String(inst.id) === '1';
        });
        if (defaultInstitution) {
          setSelectedInstitution(defaultInstitution);
        }
      } else if (username === 'institutosol') {
        // Se o usuário for institutosol e já tiver uma instituição selecionada,
        // garantir que seja a instituição com ID 1
        const institutionId = selectedInstitution.id === '1' || String(selectedInstitution.id) === '1';
        if (!institutionId) {
          const defaultInstitution = filteredData.find((inst) => {
            return inst.id === '1' || String(inst.id) === '1';
          });
          if (defaultInstitution) {
            setSelectedInstitution(defaultInstitution);
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as instituições'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCandidates = async (institutionId: string) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoadingCandidates(true);
    setCandidatesError(null);
    setCandidates([]);

    try {
      // Verificar cache primeiro
      const cacheKey = getCandidatesCacheKey(institutionId);
      const cached = cache.get<Candidate[]>(cacheKey);
      
      if (cached) {
        setCandidates(cached);
        setIsLoadingCandidates(false);
        return;
      }

      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/`,
        {
          headers: AUTH_HEADER,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar candidatos');
      }

      const data: Candidate[] = await response.json();
      
      // Armazenar no cache
      cache.set(cacheKey, data, 5 * 60 * 1000); // Cache por 5 minutos
      
      setCandidates(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Requisição foi cancelada, não fazer nada
        return;
      }
      setCandidatesError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar os candidatos'
      );
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // Verificar autenticação ao carregar
  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    const savedUsername = localStorage.getItem('username');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      if (savedUsername) {
        setUsername(savedUsername);
      }
    } else {
      // Se não estiver autenticado, garantir que estados estão limpos
      setIsAuthenticated(false);
      setUsername(null);
      setInstitutions([]);
      setCandidates([]);
      setSelectedCandidate(null);
      setAnswers([]);
      setAllCandidatesAnswersMap(new Map());
      setSelectedInstitution(null);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Limpar estados ao fazer login
      setCandidates([]);
      setSelectedCandidate(null);
      setAnswers([]);
      setAllCandidatesAnswersMap(new Map());
      setSelectedInstitution(null);
      setSelectedEtapa(null);
      setSelectedQuestion(null);
      setSelectedAnswer(null);
      setSelectedInactivity(null);
      setError(null);
      setCandidatesError(null);
      setAnswersError(null);
      
      // Buscar instituições
      fetchInstitutions().then(() => {
        setLastUpdateDate(new Date());
      });
    } else {
      // Se não autenticado, limpar tudo
      setInstitutions([]);
      setCandidates([]);
      setSelectedCandidate(null);
      setAnswers([]);
      setAllCandidatesAnswersMap(new Map());
      setSelectedInstitution(null);
    }
  }, [isAuthenticated]);

  const fetchAnswers = async (
    institutionId: string,
    candidateId: string
  ) => {
    // Cancelar requisição anterior se existir
    if (abortControllerAnswersRef.current) {
      abortControllerAnswersRef.current.abort();
    }

    // Criar novo AbortController
    const abortController = new AbortController();
    abortControllerAnswersRef.current = abortController;

    setIsLoadingAnswers(true);
    setAnswersError(null);
    setAnswers([]);

    try {
      const response = await fetch(
        `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/${candidateId}/answer/`,
        {
          headers: AUTH_HEADER,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao carregar respostas');
      }

      const data: Answer[] = await response.json();
      setAnswers(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Requisição foi cancelada, não fazer nada
        return;
      }
      setAnswersError(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao carregar as respostas'
      );
    } finally {
      setIsLoadingAnswers(false);
    }
  };

  useEffect(() => {
    // Só buscar candidatos se estiver autenticado
    if (!isAuthenticated) {
      setCandidates([]);
      setCandidatesError(null);
      setSelectedCandidate(null);
      setAnswers([]);
      setAnswersError(null);
      setSelectedEtapa(null);
      return;
    }

    if (selectedInstitution && selectedInstitution.id) {
      fetchCandidates(selectedInstitution.id);
      // Limpar candidato selecionado e respostas ao trocar instituição
      setSelectedCandidate(null);
      setAnswers([]);
      setAnswersError(null);
      setSelectedEtapa(null);
    } else {
      setCandidates([]);
      setCandidatesError(null);
      setSelectedCandidate(null);
      setAnswers([]);
      setAnswersError(null);
      setSelectedEtapa(null);
    }

    // Cleanup: cancelar requisição ao desmontar ou trocar instituição
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedInstitution, isAuthenticated]);

  useEffect(() => {
    // Só buscar respostas se estiver autenticado
    if (!isAuthenticated) {
      setAnswers([]);
      setAnswersError(null);
      return;
    }

    if (
      selectedCandidate &&
      selectedCandidate.id &&
      selectedInstitution &&
      selectedInstitution.id
    ) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    } else {
      setAnswers([]);
      setAnswersError(null);
    }

    // Cleanup: cancelar requisição ao desmontar ou trocar candidato
    return () => {
      if (abortControllerAnswersRef.current) {
        abortControllerAnswersRef.current.abort();
      }
    };
  }, [selectedCandidate, selectedInstitution, isAuthenticated]);

  // Buscar respostas de todos os candidatos para o gráfico (otimizado)
  useEffect(() => {
    // Só buscar respostas se estiver autenticado
    if (!isAuthenticated) {
      setAllCandidatesAnswersMap(new Map());
      return;
    }

    if (
      selectedInstitution &&
      selectedInstitution.id &&
      candidates.length > 0
    ) {
      // Para muitos candidatos, carregar apenas uma amostra inicial
      // O resto será carregado sob demanda quando necessário
      const maxInitialLoad = 200; // Carregar apenas 200 inicialmente
      const candidatesToLoad = candidates.slice(0, maxInitialLoad);
      
      fetchAllAnswers(selectedInstitution.id, candidatesToLoad).then((answersMap) => {
        setAllCandidatesAnswersMap((prev) => {
          // Mesclar com dados anteriores (caso já tenha alguns carregados)
          const merged = new Map(prev);
          answersMap.forEach((answers, candidateId) => {
            merged.set(candidateId, answers);
          });
          return merged;
        });
      });
    } else {
      setAllCandidatesAnswersMap(new Map());
    }
  }, [selectedInstitution?.id, candidates.length, isAuthenticated]);

  const handleSelect = (institution: Institution) => {
    setSelectedInstitution(institution);
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleRetry = () => {
    fetchInstitutions();
  };

  const handleRetryCandidates = () => {
    if (selectedInstitution && selectedInstitution.id) {
      fetchCandidates(selectedInstitution.id);
    }
  };

  const handleRetryAnswers = () => {
    if (
      selectedCandidate &&
      selectedCandidate.id &&
      selectedInstitution &&
      selectedInstitution.id
    ) {
      fetchAnswers(selectedInstitution.id, selectedCandidate.id);
    }
  };

  // Função para atualizar tudo: instituições, candidatos e respostas
  const handleRefreshAll = async () => {
    // Atualizar instituições
    await fetchInstitutions();
    
    // Se houver instituição selecionada, atualizar candidatos
    if (selectedInstitution && selectedInstitution.id) {
      // LIMPAR CACHE DE RESPOSTAS desta instituição antes de atualizar
      // Isso força uma nova busca de todas as respostas
      const institutionId = selectedInstitution.id;
      
      // Limpar cache de respostas de todos os candidatos desta instituição
      // Percorrer todos os candidatos atuais e limpar seus caches
      candidates.forEach((candidate) => {
        if (candidate.id) {
          const answersCacheKey = getAnswersCacheKey(institutionId, candidate.id);
          cache.delete(answersCacheKey);
        }
      });
      
      // Limpar o mapa de respostas para forçar recarregamento
      setAllCandidatesAnswersMap(new Map());
      
      // Buscar candidatos diretamente para ter os dados atualizados
      try {
        const response = await fetch(
          `https://criasapi.geocode.com.br/institution/${selectedInstitution.id}/candidate/`,
          {
            headers: AUTH_HEADER,
          }
        );

        if (response.ok) {
          const updatedCandidates: Candidate[] = await response.json();
          
          // Atualizar cache de candidatos
          const cacheKey = getCandidatesCacheKey(selectedInstitution.id);
          cache.set(cacheKey, updatedCandidates, 5 * 60 * 1000);
          
          setCandidates(updatedCandidates);
          setCandidatesError(null);
          
          // ATUALIZAR TODAS AS RESPOSTAS DE TODOS OS CANDIDATOS (não apenas 200)
          // Isso garante que os gráficos mostrem dados atualizados
          if (updatedCandidates.length > 0) {
            // Limpar cache de respostas dos novos candidatos também
            updatedCandidates.forEach((candidate) => {
              if (candidate.id && selectedInstitution.id) {
                const answersCacheKey = getAnswersCacheKey(selectedInstitution.id, candidate.id);
                cache.delete(answersCacheKey);
              }
            });
            
            // Buscar TODAS as respostas de TODOS os candidatos (sem limite)
            const updatedAnswersMap = await fetchAllAnswers(selectedInstitution.id, updatedCandidates);
            setAllCandidatesAnswersMap(updatedAnswersMap);
          } else {
            setAllCandidatesAnswersMap(new Map());
          }
        }
      } catch (err) {
        setCandidatesError(
          err instanceof Error
            ? err.message
            : 'Ocorreu um erro ao carregar os candidatos'
        );
      }
      
      // Se houver candidato selecionado, atualizar suas respostas
      if (selectedCandidate && selectedCandidate.id) {
        // Limpar cache da resposta deste candidato também
        const answersCacheKey = getAnswersCacheKey(selectedInstitution.id, selectedCandidate.id);
        cache.delete(answersCacheKey);
        await fetchAnswers(selectedInstitution.id, selectedCandidate.id);
      }
    }
    
    // Atualizar data da última atualização
    setLastUpdateDate(new Date());
  };

  const handleLogout = () => {
    // Limpar localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    
    // Limpar todos os estados
    setIsAuthenticated(false);
    setUsername(null);
    setInstitutions([]);
    setCandidates([]);
    setSelectedCandidate(null);
    setAnswers([]);
    setAllCandidatesAnswersMap(new Map());
    setSelectedInstitution(null);
    setSelectedEtapa(null);
    setSelectedQuestion(null);
    setSelectedAnswer(null);
    setSelectedInactivity(null);
    setError(null);
    setCandidatesError(null);
    setAnswersError(null);
    setLastUpdateDate(null);
    
    // Cancelar requisições em andamento
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (abortControllerAnswersRef.current) {
      abortControllerAnswersRef.current.abort();
      abortControllerAnswersRef.current = null;
    }
  };

  // Função auxiliar para obter etapa por questão (questões 1 a 66)
  const getEtapa = (question: number): string => {
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


  // Filtrar candidatos por etapa, resposta ou inatividade
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Filtro por inatividade (tem prioridade sobre etapa e resposta)
    if (selectedInactivity !== null) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const etapa = getCandidateEtapaUtil(candidate.id, allCandidatesAnswersMap);
        const isFinalized = etapa === 'Finalizou';

        if (selectedInactivity === 'finalized') {
          return isFinalized;
        } else if (selectedInactivity === 'notFinalized') {
          return !isFinalized;
        } else if (typeof selectedInactivity === 'number') {
          // Filtrar por dias específicos de inatividade
          if (isFinalized) return false;
          
          const answers = allCandidatesAnswersMap.get(candidate.id) || [];
          let daysOfInactivity = 0;

          if (answers.length === 0) {
            if (candidate.createdAt) {
              try {
                const createdDate = new Date(candidate.createdAt);
                createdDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                daysOfInactivity = Math.max(0, daysDiff);
              } catch (e) {
                return false;
              }
            }
          } else {
            let lastAnswerDate: Date | null = null;
            answers.forEach((answer) => {
              if (answer.answeredAt) {
                try {
                  const answerDate = new Date(answer.answeredAt);
                  if (!lastAnswerDate || answerDate > lastAnswerDate) {
                    lastAnswerDate = answerDate;
                  }
                } catch (e) {
                  // Ignorar
                }
              }
            });

            if (lastAnswerDate) {
              const lastDate = new Date(lastAnswerDate);
              lastDate.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
              daysOfInactivity = Math.max(0, daysDiff);
            }
          }

          return daysOfInactivity === selectedInactivity;
        }

        return true;
      });
    }

    // Filtro por etapa
    if (selectedEtapa) {
      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const etapa = getCandidateEtapaUtil(candidate.id, allCandidatesAnswersMap);
        // "Não responderam nenhuma pergunta" corresponde à etapa "Sem respostas"
        if (selectedEtapa === 'Não responderam nenhuma pergunta') {
          return etapa === 'Sem respostas';
        }
        return etapa === selectedEtapa;
      });
    }

    // Filtro por resposta
    if (selectedQuestion !== null && selectedAnswer !== null) {
      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const answers = allCandidatesAnswersMap.get(candidate.id) || [];
        const answer = answers.find(
          (a) => a.question !== undefined && a.question === selectedQuestion && a.answer === selectedAnswer
        );
        return !!answer;
      });
    }

    return filtered;
  }, [candidates, selectedEtapa, selectedQuestion, selectedAnswer, selectedInactivity, allCandidatesAnswersMap]);

  // Função para buscar todas as respostas de todos os candidatos (otimizada)
  const fetchAllAnswers = async (
    institutionId: string,
    candidates: Candidate[]
  ): Promise<Map<string, Answer[]>> => {
    const answersMap = new Map<string, Answer[]>();
    
    // Filtrar candidatos com ID
    const candidatesWithId = candidates.filter((c) => c.id);
    
    if (candidatesWithId.length === 0) {
      return answersMap;
    }

    // Separar candidatos que já estão no cache dos que precisam ser buscados
    const candidatesToFetch: Candidate[] = [];
    
    candidatesWithId.forEach((candidate) => {
      if (!candidate.id) return;
      
      const cacheKey = getAnswersCacheKey(institutionId, candidate.id);
      const cached = cache.get<Answer[]>(cacheKey);
      
      if (cached) {
        // Usar dados do cache
        answersMap.set(candidate.id, cached);
      } else {
        // Adicionar à lista de candidatos para buscar
        candidatesToFetch.push(candidate);
      }
    });

    // Se todos já estão no cache, retornar imediatamente
    if (candidatesToFetch.length === 0) {
      return answersMap;
    }

    // Processar em lotes para evitar sobrecarga
    await processInBatches(
      candidatesToFetch,
      async (candidate) => {
        if (!candidate.id) return;
        
        try {
          const response = await fetch(
            `https://criasapi.geocode.com.br/institution/${institutionId}/candidate/${candidate.id}/answer/`,
            { headers: AUTH_HEADER }
          );
          
          if (response.ok && candidate.id) {
            const answers: Answer[] = await response.json();
            
            // Armazenar no cache
            const cacheKey = getAnswersCacheKey(institutionId, candidate.id);
            cache.set(cacheKey, answers, 5 * 60 * 1000); // Cache por 5 minutos
            
            answersMap.set(candidate.id, answers);
          }
        } catch (err) {
          console.error(
            `Erro ao buscar respostas do candidato ${candidate.id}:`,
            err
          );
        }
      },
      {
        maxConcurrent: 10, // Máximo 10 requisições simultâneas
        delayBetweenBatches: 50, // 50ms entre lotes
      }
    );

    return answersMap;
  };


  // Função para escapar valores CSV
  const escapeCSV = (value: string | number): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Se contém vírgula, aspas ou quebra de linha, precisa ser envolvido em aspas
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Função para gerar CSV
  const generateCSV = (
    institution: Institution,
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>
  ): string => {
    const headers = [
      'Instituição',
      'Instituição ID',
      'Candidato ID',
      'Candidato Nome',
      'Candidato WhatsApp',
      'Candidato Email',
      'Candidato Documento',
      'Candidato Endereço',
      'Candidato Cidade',
      'Questão',
      'Enunciado',
      'Etapa',
      'Resposta',
      'Opção Selecionada',
      'Opções',
      'Data da Resposta',
    ];

    const rows: string[] = [headers.map(escapeCSV).join(',')];

    candidates.forEach((candidate) => {
      const candidateId = candidate.id || '';
      const answers = answersMap.get(candidateId) || [];

      if (answers.length === 0) {
        // Linha mesmo sem respostas
        rows.push(
          [
            escapeCSV(institution.name || ''),
            escapeCSV(institution.id || ''),
            escapeCSV(candidateId),
            escapeCSV(candidate.name || ''),
            escapeCSV(candidate.whatsapp || ''),
            escapeCSV(candidate.email || ''),
            escapeCSV(candidate.document || ''),
            escapeCSV(candidate.addressLine1 || ''),
            escapeCSV(candidate.city || ''),
            '',
            '',
            '',
            '',
            '',
            '',
          ].join(',')
        );
      } else {
        answers.forEach((answer) => {
          if (answer.answeredAt && answer.question !== undefined) {
            const date = new Date(answer.answeredAt).toLocaleString('pt-BR');
            const formattedAnswer = getFormattedAnswer(answer.question, answer.answer || '');
            const options = getQuestionOptions(answer.question);
            const selectedOption = formattedAnswer !== answer.answer ? formattedAnswer : (answer.answer || '');
            rows.push(
              [
                escapeCSV(institution.name || ''),
                escapeCSV(institution.id || ''),
                escapeCSV(candidateId),
                escapeCSV(candidate.name || ''),
                escapeCSV(candidate.whatsapp || ''),
                escapeCSV(candidate.email || ''),
                escapeCSV(candidate.document || ''),
                escapeCSV(candidate.addressLine1 || ''),
                escapeCSV(candidate.city || ''),
                escapeCSV(answer.question),
                escapeCSV(QUESTIONS[answer.question] || ''),
                escapeCSV(getEtapa(answer.question)),
                escapeCSV(answer.answer || ''),
                escapeCSV(selectedOption),
                escapeCSV(options),
                escapeCSV(date),
              ].join(',')
            );
          }
        });
      }
    });

    return rows.join('\n');
  };

  // Função para fazer download do arquivo
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    // Adicionar BOM para UTF-8 (ajuda Excel a reconhecer acentos)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Função para gerar dados em formato de array para XLSX
  const generateExcelData = (
    institution: Institution,
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>
  ): any[][] => {
    const headers = [
      'Instituição',
      'Instituição ID',
      'Candidato ID',
      'Candidato Nome',
      'Candidato WhatsApp',
      'Candidato Email',
      'Candidato Documento',
      'Candidato Endereço',
      'Candidato Cidade',
      'Questão',
      'Enunciado',
      'Etapa',
      'Resposta',
      'Opção Selecionada',
      'Opções',
      'Data da Resposta',
    ];

    const rows: any[][] = [headers];

    candidates.forEach((candidate) => {
      const candidateId = candidate.id || '';
      const answers = answersMap.get(candidateId) || [];

      if (answers.length === 0) {
        // Linha mesmo sem respostas
        rows.push([
          institution.name || '',
          institution.id || '',
          candidateId,
          candidate.name || '',
          candidate.whatsapp || '',
          candidate.email || '',
          candidate.document || '',
          candidate.addressLine1 || '',
          candidate.city || '',
          '',
          '',
          '',
          '',
          '',
          '',
        ]);
      } else {
        answers.forEach((answer) => {
          if (answer.answeredAt && answer.question !== undefined) {
            const date = new Date(answer.answeredAt).toLocaleString('pt-BR');
            const formattedAnswer = getFormattedAnswer(answer.question, answer.answer || '');
            const options = getQuestionOptions(answer.question);
            const selectedOption = formattedAnswer !== answer.answer ? formattedAnswer : (answer.answer || '');
            rows.push([
              institution.name || '',
              institution.id || '',
              candidateId,
              candidate.name || '',
              candidate.whatsapp || '',
              candidate.email || '',
              candidate.document || '',
              candidate.addressLine1 || '',
              candidate.city || '',
              answer.question,
              QUESTIONS[answer.question] || '',
              getEtapa(answer.question),
              answer.answer || '',
              selectedOption,
              options,
              date,
            ]);
          }
        });
      }
    });

    return rows;
  };

  // Função para gerar e fazer download de XLSX (não usada, mantida para compatibilidade)
  // @ts-expect-error - Função mantida para compatibilidade, não está sendo usada
  const downloadXLSX = (
    institution: Institution,
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>
  ) => {
    const data = generateExcelData(institution, candidates, answersMap);
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Instituição
      { wch: 12 }, // Instituição ID
      { wch: 12 }, // Candidato ID
      { wch: 25 }, // Candidato Nome
      { wch: 15 }, // WhatsApp
      { wch: 30 }, // Email
      { wch: 15 }, // Documento
      { wch: 30 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 10 }, // Questão
      { wch: 50 }, // Enunciado
      { wch: 25 }, // Etapa
      { wch: 30 }, // Resposta
      { wch: 30 }, // Opção Selecionada
      { wch: 60 }, // Opções
      { wch: 20 }, // Data
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidatos');

    const sanitizedName = (institution.name || '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `candidatos_${sanitizedName}_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Função para gerar e fazer download de XLSX com suporte a filtro
  const downloadXLSXWithFilter = (
    institution: Institution,
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>,
    etapa?: string | null
  ) => {
    const data = generateExcelData(institution, candidates, answersMap);
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Instituição
      { wch: 12 }, // Instituição ID
      { wch: 12 }, // Candidato ID
      { wch: 25 }, // Candidato Nome
      { wch: 15 }, // WhatsApp
      { wch: 30 }, // Email
      { wch: 15 }, // Documento
      { wch: 30 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 10 }, // Questão
      { wch: 50 }, // Enunciado
      { wch: 25 }, // Etapa
      { wch: 30 }, // Resposta
      { wch: 30 }, // Opção Selecionada
      { wch: 60 }, // Opções
      { wch: 20 }, // Data
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidatos');

    const sanitizedName = (institution.name || '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const etapaSuffix = etapa
      ? `_${etapa.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
      : '';
    const date = new Date().toISOString().split('T')[0];
    const filename = `candidatos_${sanitizedName}${etapaSuffix}_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Função para gerar CSV de um único candidato
  const generateCandidateCSV = (
    institution: Institution,
    candidate: Candidate,
    candidateAnswers: Answer[]
  ): string => {
    const headers = [
      'Instituição',
      'Instituição ID',
      'Candidato ID',
      'Candidato Nome',
      'Candidato WhatsApp',
      'Candidato Email',
      'Candidato Documento',
      'Candidato Endereço',
      'Candidato Cidade',
      'Questão',
      'Enunciado',
      'Etapa',
      'Resposta',
      'Opção Selecionada',
      'Opções',
      'Data da Resposta',
    ];

    const rows: string[] = [headers.map(escapeCSV).join(',')];

    if (candidateAnswers.length === 0) {
      rows.push(
        [
          escapeCSV(institution.name || ''),
          escapeCSV(institution.id || ''),
          escapeCSV(candidate.id || ''),
          escapeCSV(candidate.name || ''),
          escapeCSV(candidate.whatsapp || ''),
          escapeCSV(candidate.email || ''),
          escapeCSV(candidate.document || ''),
          escapeCSV(candidate.addressLine1 || ''),
            escapeCSV(candidate.city || ''),
            '',
            '',
            '',
            '',
            '',
            '',
        ].join(',')
      );
    } else {
      candidateAnswers.forEach((answer) => {
        if (answer.answeredAt && answer.question !== undefined) {
          const date = new Date(answer.answeredAt).toLocaleString('pt-BR');
          const formattedAnswer = getFormattedAnswer(answer.question, answer.answer || '');
          const options = getQuestionOptions(answer.question);
          rows.push(
            [
              escapeCSV(institution.name || ''),
              escapeCSV(institution.id || ''),
              escapeCSV(candidate.id || ''),
              escapeCSV(candidate.name || ''),
              escapeCSV(candidate.whatsapp || ''),
              escapeCSV(candidate.email || ''),
              escapeCSV(candidate.document || ''),
              escapeCSV(candidate.addressLine1 || ''),
              escapeCSV(candidate.city || ''),
              escapeCSV(answer.question),
              escapeCSV(QUESTIONS[answer.question] || ''),
              escapeCSV(getEtapa(answer.question)),
              escapeCSV(answer.answer || ''),
              escapeCSV(formattedAnswer !== answer.answer ? formattedAnswer : (answer.answer || '')),
              escapeCSV(options),
              escapeCSV(date),
            ].join(',')
          );
        }
      });
    }

    return rows.join('\n');
  };

  // Função para gerar XLSX de um único candidato
  const downloadCandidateXLSX = (
    institution: Institution,
    candidate: Candidate,
    candidateAnswers: Answer[]
  ) => {
    const headers = [
      'Instituição',
      'Instituição ID',
      'Candidato ID',
      'Candidato Nome',
      'Candidato WhatsApp',
      'Candidato Email',
      'Candidato Documento',
      'Candidato Endereço',
      'Candidato Cidade',
      'Questão',
      'Enunciado',
      'Etapa',
      'Resposta',
      'Opção Selecionada',
      'Opções',
      'Data da Resposta',
    ];

    const rows: any[][] = [headers];

    if (candidateAnswers.length === 0) {
      rows.push([
        institution.name || '',
        institution.id || '',
        candidate.id || '',
        candidate.name || '',
        candidate.whatsapp || '',
        candidate.email || '',
        candidate.document || '',
        candidate.addressLine1 || '',
        candidate.city || '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    } else {
      candidateAnswers.forEach((answer) => {
        if (answer.answeredAt && answer.question !== undefined) {
          const date = new Date(answer.answeredAt).toLocaleString('pt-BR');
          const formattedAnswer = getFormattedAnswer(answer.question, answer.answer || '');
          const options = getQuestionOptions(answer.question);
          rows.push([
            institution.name || '',
            institution.id || '',
            candidate.id || '',
            candidate.name || '',
            candidate.whatsapp || '',
            candidate.email || '',
            candidate.document || '',
            candidate.addressLine1 || '',
            candidate.city || '',
            answer.question,
            QUESTIONS[answer.question] || '',
            getEtapa(answer.question),
            answer.answer || '',
            formattedAnswer !== answer.answer ? formattedAnswer : (answer.answer || ''),
            options,
            date,
          ]);
        }
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Instituição
      { wch: 12 }, // Instituição ID
      { wch: 12 }, // Candidato ID
      { wch: 25 }, // Candidato Nome
      { wch: 15 }, // WhatsApp
      { wch: 30 }, // Email
      { wch: 15 }, // Documento
      { wch: 30 }, // Endereço
      { wch: 20 }, // Cidade
      { wch: 10 }, // Questão
      { wch: 50 }, // Enunciado
      { wch: 25 }, // Etapa
      { wch: 30 }, // Resposta
      { wch: 30 }, // Opção Selecionada
      { wch: 60 }, // Opções
      { wch: 20 }, // Data
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidato');

    const sanitizedName = (candidate.name || '')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const filename = `candidato_${sanitizedName}_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
  };

  // Handler de exportação de todos os candidatos
  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!selectedInstitution || filteredCandidates.length === 0) return;

    setIsExporting(true);

    try {
      // Buscar todas as respostas dos candidatos filtrados
      if (!selectedInstitution.id) return;
      const answersMap = await fetchAllAnswers(
        selectedInstitution.id,
        filteredCandidates
      );

      if (format === 'csv') {
        // Gerar CSV
        const csvContent = generateCSV(
          selectedInstitution,
          filteredCandidates,
          answersMap
        );

        // Fazer download
        const sanitizedName = (selectedInstitution.name || '')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const etapaSuffix = selectedEtapa
          ? `_${selectedEtapa.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
          : '';
        const date = new Date().toISOString().split('T')[0];
        const filename = `candidatos_${sanitizedName}${etapaSuffix}_${date}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
      } else if (format === 'xlsx') {
        // Gerar e fazer download de XLSX
        downloadXLSXWithFilter(
          selectedInstitution,
          filteredCandidates,
          answersMap,
          selectedEtapa
        );
      }
    } catch (err) {
      alert('Erro ao exportar dados. Tente novamente.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handler de exportação de um único candidato
  const handleExportCandidate = (format: 'csv' | 'xlsx') => {
    if (!selectedCandidate || !selectedInstitution) return;

    setIsExportingCandidate(true);

    try {
      if (format === 'csv') {
        // Gerar CSV
        const csvContent = generateCandidateCSV(
          selectedInstitution,
          selectedCandidate,
          answers
        );

        // Fazer download
        const sanitizedName = (selectedCandidate.name || '')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const date = new Date().toISOString().split('T')[0];
        const filename = `candidato_${sanitizedName}_${date}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
      } else if (format === 'xlsx') {
        // Gerar e fazer download de XLSX
        downloadCandidateXLSX(selectedInstitution, selectedCandidate, answers);
      }
    } catch (err) {
      alert('Erro ao exportar dados do candidato. Tente novamente.');
      console.error(err);
    } finally {
      setIsExportingCandidate(false);
    }
  };

  // Verificar se o usuário tem permissão para acessar gerenciamento
  const canAccessGerenciamento = username === 'crias_adm' || username === 'chatis_adm';

  // Se não estiver autenticado, mostrar página de login
  if (!isAuthenticated) {
    return <Login onLogin={() => {
      // Limpar estados antes de fazer login novamente
      setCandidates([]);
      setSelectedCandidate(null);
      setAnswers([]);
      setAllCandidatesAnswersMap(new Map());
      setSelectedInstitution(null);
      setSelectedEtapa(null);
      setSelectedQuestion(null);
      setSelectedAnswer(null);
      setSelectedInactivity(null);
      setError(null);
      setCandidatesError(null);
      setAnswersError(null);
      
      // Cancelar requisições em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (abortControllerAnswersRef.current) {
        abortControllerAnswersRef.current.abort();
        abortControllerAnswersRef.current = null;
      }
      
      // Fazer login
      setIsAuthenticated(true);
      const savedUsername = localStorage.getItem('username');
      setUsername(savedUsername);
    }} />;
  }

  // Componente HomePage
  const HomePage = () => (
    <div className="app">
      <NavigationHeader
        institutions={institutions}
        selectedInstitution={selectedInstitution}
        onSelectInstitution={handleSelect}
        onRefresh={handleRefreshAll}
        isLoading={isLoading || isLoadingCandidates}
        error={error}
        onRetry={handleRetry}
        onLogout={handleLogout}
        canAccessGerenciamento={canAccessGerenciamento}
        title="Crias"
        lastUpdateDate={lastUpdateDate}
        username={username}
      />
      <div className="app-container">
        <div className="left-column">
          <div className="profile-chart-container">
            <InstitutionProfile institution={selectedInstitution} />
            {selectedInstitution && candidates.length > 0 ? (
              <>
                <EtapasChart
                  candidates={candidates}
                  answersMap={allCandidatesAnswersMap}
                  onEtapaClick={(etapa) => {
                    setSelectedEtapa(etapa);
                    // Limpar filtro de resposta ao filtrar por etapa
                    if (etapa) {
                      setSelectedQuestion(null);
                      setSelectedAnswer(null);
                    }
                  }}
                  selectedEtapa={selectedEtapa}
                />
                <InactivityChart
                  candidates={candidates}
                  answersMap={allCandidatesAnswersMap}
                  onInactivityClick={(type) => {
                    setSelectedInactivity(type);
                    // Limpar outros filtros ao filtrar por inatividade
                    if (type !== null) {
                      setSelectedEtapa(null);
                      setSelectedQuestion(null);
                      setSelectedAnswer(null);
                    }
                  }}
                  selectedInactivity={selectedInactivity}
                />
                <AnswersChart
                  candidates={candidates}
                  answersMap={allCandidatesAnswersMap}
                  onAnswerClick={(question, answer) => {
                    setSelectedQuestion(question);
                    setSelectedAnswer(answer);
                    // Limpar outros filtros ao filtrar por resposta
                    if (question !== null) {
                      setSelectedEtapa(null);
                      setSelectedInactivity(null);
                    }
                  }}
                  selectedQuestion={selectedQuestion}
                  selectedAnswer={selectedAnswer}
                  defaultQuestion={17}
                />
              </>
            ) : (
              <>
                <div></div>
                <div></div>
                <div></div>
              </>
            )}
          </div>
        </div>
        <div className="full-width-column">
          <CandidatesTable
            candidates={filteredCandidates}
            allCandidates={candidates}
            isLoading={isLoadingCandidates}
            error={candidatesError}
            onRetry={handleRetryCandidates}
            onSelectCandidate={handleSelectCandidate}
            selectedCandidateId={selectedCandidate?.id || null}
            onExport={handleExport}
            isExporting={isExporting}
            answersMap={allCandidatesAnswersMap}
            selectedEtapa={selectedEtapa}
            selectedQuestion={selectedQuestion}
            selectedAnswer={selectedAnswer}
            onClearFilter={() => {
              setSelectedEtapa(null);
              setSelectedQuestion(null);
              setSelectedAnswer(null);
            }}
            totalCandidates={candidates.length}
          />
        </div>
        {selectedCandidate && (
          <div className="full-width-column">
            <CandidateAnswersPanel
              candidate={selectedCandidate}
              answers={answers}
              isLoading={isLoadingAnswers}
              error={answersError}
              onRetry={handleRetryAnswers}
              onExport={handleExportCandidate}
              isExporting={isExportingCandidate}
            />
          </div>
        )}
      </div>
    </div>
  );

  // Componente GerenciamentoPage
  const GerenciamentoPage = () => {
    // Verificar permissão
    if (!canAccessGerenciamento) {
      return (
        <div className="app">
          <NavigationHeader
            institutions={institutions}
            selectedInstitution={selectedInstitution}
            onSelectInstitution={handleSelect}
            onRefresh={handleRefreshAll}
            isLoading={isLoading || isLoadingCandidates}
            error={error}
            onRetry={handleRetry}
            onLogout={handleLogout}
            canAccessGerenciamento={canAccessGerenciamento}
            title="Acesso Negado"
            lastUpdateDate={lastUpdateDate}
            username={username}
          />
          <div className="app-container">
            <div className="error-container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
              <p className="error-message">
                Você não tem permissão para acessar esta página. 
                Apenas usuários administradores podem acessar o Gerenciamento.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="app">
        <NavigationHeader
          institutions={institutions}
          selectedInstitution={selectedInstitution}
          onSelectInstitution={handleSelect}
          onRefresh={handleRefreshAll}
          isLoading={isLoading || isLoadingCandidates}
          error={error}
          onRetry={handleRetry}
          onLogout={handleLogout}
          canAccessGerenciamento={canAccessGerenciamento}
          title="Gerenciamento"
          lastUpdateDate={lastUpdateDate}
          username={username}
        />
        <Gerenciamento />
      </div>
    );
  };

  // Componente DetalhePage
  const DetalhePage = () => (
    <div className="app">
      <NavigationHeader
        institutions={institutions}
        selectedInstitution={selectedInstitution}
        onSelectInstitution={handleSelect}
        onRefresh={handleRefreshAll}
        isLoading={isLoading || isLoadingCandidates}
        error={error}
        onRetry={handleRetry}
        onLogout={handleLogout}
        canAccessGerenciamento={canAccessGerenciamento}
        title="Detalhes"
        lastUpdateDate={lastUpdateDate}
        username={username}
      />
      <div className="app-container">
        <Graficos
          candidates={selectedInstitution ? candidates : []}
          answersMap={allCandidatesAnswersMap}
        />
      </div>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/gerenciamento" element={<GerenciamentoPage />} />
      <Route path="/detalhe" element={<DetalhePage />} />
    </Routes>
  );
}

export default App;

