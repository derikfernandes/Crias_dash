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
import { LoadingOverlay } from './components/LoadingOverlay';
import { Gerenciamento } from './pages/Gerenciamento';
import { Login } from './pages/Login';
import { Graficos } from './pages/Graficos';
import { Estagio } from './pages/Estagio';
import { useInstitution } from './contexts/InstitutionContext';
import { AUTH_HEADER } from './utils/api';
import { QUESTIONS } from './utils/questions';
import { getFormattedAnswer, getQuestionOptions } from './utils/answerMappings';
import { getCandidateEtapa as getCandidateEtapaUtil } from './utils/etapaUtils';
import { cache, getAnswersCacheKey, getCandidatesCacheKey } from './utils/cache';
import { processInBatches } from './utils/batchProcessor';
import type { CandidateStageRecord } from './types/candidateStage';
import { ESTAGIO_STAGES } from './config/estagioStages';
import { fetchAllCandidateStagesMap } from './utils/candidateStageApi';
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
  const [candidateStagesMap, setCandidateStagesMap] = useState<Map<string, CandidateStageRecord[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingAnswers, setIsLoadingAnswers] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCompiled, setIsExportingCompiled] = useState(false);
  const [isExportingCandidate, setIsExportingCandidate] = useState(false);
  const [selectedEtapas, setSelectedEtapas] = useState<string[]>([]);
  const [selectedAnswerFilters, setSelectedAnswerFilters] = useState<{ question: number; answer: string }[]>([]);
  const [selectedInactivities, setSelectedInactivities] = useState<('finalized' | 'notFinalized' | number)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [answersError, setAnswersError] = useState<string | null>(null);
  const [lastUpdateDate, setLastUpdateDate] = useState<Date | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('Instituições');
  const [initialAnswersLoadComplete, setInitialAnswersLoadComplete] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const abortControllerAnswersRef = useRef<AbortController | null>(null);

  const isInitialDataReady =
    !!selectedInstitution &&
    !isLoadingCandidates &&
    (candidates.length === 0 || initialAnswersLoadComplete);

  const stageNameByCode = useMemo(
    () => new Map(ESTAGIO_STAGES.map((s) => [s.code, s.name])),
    []
  );

  const pickLatestStageRecord = (stages: CandidateStageRecord[]): CandidateStageRecord | null => {
    const withDate = stages.filter((s) => s.enabledAt);
    if (withDate.length > 0) {
      return withDate.reduce((a, b) => {
        const ta = new Date(a.enabledAt || '').getTime() || 0;
        const tb = new Date(b.enabledAt || '').getTime() || 0;
        return tb >= ta ? b : a;
      });
    }
    const withId = stages.filter((s) => s.id != null);
    if (withId.length === 0) return null;
    return withId.reduce((a, b) => ((a.id || 0) > (b.id || 0) ? a : b));
  };

  const getCandidateStageName = (candidateId?: string): string => {
    if (!candidateId) return 'Sem stage';
    const rows = candidateStagesMap.get(candidateId) || [];
    const latest = pickLatestStageRecord(rows);
    const code = latest?.code || '';
    return stageNameByCode.get(code) || 'Sem stage';
  };

  const fetchInstitutions = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingPhase('Instituições');

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
      setLoadingProgress(15);
      setLoadingPhase('Candidatos');
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
    setLoadingProgress(15);
    setLoadingPhase('Candidatos');

    try {
      // Verificar cache primeiro
      const cacheKey = getCandidatesCacheKey(institutionId);
      const cached = cache.get<Candidate[]>(cacheKey);
      
      if (cached) {
        setCandidates(cached);
        setIsLoadingCandidates(false);
        setLoadingProgress(40);
        setLoadingPhase('Respostas');
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
      setLoadingProgress(40);
      setLoadingPhase('Respostas');
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
      setSelectedEtapas([]);
      setSelectedAnswerFilters([]);
      setSelectedInactivities([]);
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
      setSelectedEtapas([]);
      setSelectedAnswerFilters([]);
      setSelectedInactivities([]);
      return;
    }

    if (selectedInstitution && selectedInstitution.id) {
      setLoadingProgress(15);
      setInitialAnswersLoadComplete(false);
      setLoadingPhase('Candidatos');
      fetchCandidates(selectedInstitution.id);
      // Limpar candidato selecionado e respostas ao trocar instituição
      setSelectedCandidate(null);
      setAnswers([]);
      setAnswersError(null);
      setSelectedEtapas([]);
      setSelectedAnswerFilters([]);
      setSelectedInactivities([]);
    } else {
      setCandidates([]);
      setCandidatesError(null);
      setSelectedCandidate(null);
      setAnswers([]);
      setAnswersError(null);
      setSelectedEtapas([]);
      setSelectedAnswerFilters([]);
      setSelectedInactivities([]);
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
    if (!isAuthenticated) {
      setAllCandidatesAnswersMap(new Map());
      return;
    }

    if (
      selectedInstitution &&
      selectedInstitution.id &&
      candidates.length > 0
    ) {
      setInitialAnswersLoadComplete(false);
      setLoadingProgress(40);
      setLoadingPhase('Verificando e classificando todos os candidatos');

      fetchAllAnswers(
        selectedInstitution.id,
        candidates,
        (completed, total) => {
          if (total > 0) {
            setLoadingProgress(40 + 60 * (completed / total));
          }
        }
      ).then((answersMap) => {
        setAllCandidatesAnswersMap((prev) => {
          const merged = new Map(prev);
          answersMap.forEach((answers, candidateId) => {
            merged.set(candidateId, answers);
          });
          return merged;
        });
        setLoadingProgress(100);
        setInitialAnswersLoadComplete(true);
      });
    } else {
      setAllCandidatesAnswersMap(new Map());
      if (selectedInstitution && selectedInstitution.id && candidates.length === 0) {
        setLoadingProgress(100);
        setInitialAnswersLoadComplete(true);
      }
    }
  }, [selectedInstitution?.id, candidates.length, isAuthenticated]);

  useEffect(() => {
    const instId = selectedInstitution?.id;
    if (!isAuthenticated || !instId || candidates.length === 0) {
      setCandidateStagesMap(new Map());
      return;
    }

    const ac = new AbortController();
    let cancelled = false;

    const run = async () => {
      try {
        const next = await fetchAllCandidateStagesMap(instId, candidates, {
          signal: ac.signal,
        });
        if (!cancelled) {
          setCandidateStagesMap(next);
        }
      } catch {
        if (!cancelled) {
          setCandidateStagesMap(new Map());
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [selectedInstitution?.id, candidates, isAuthenticated]);

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
    setInitialAnswersLoadComplete(false);
    setLoadingProgress(0);
    setLoadingPhase('Instituições');

    await fetchInstitutions();

    if (selectedInstitution && selectedInstitution.id) {
      const institutionId = selectedInstitution.id;

      candidates.forEach((candidate) => {
        if (candidate.id) {
          const answersCacheKey = getAnswersCacheKey(institutionId, candidate.id);
          cache.delete(answersCacheKey);
        }
      });

      setAllCandidatesAnswersMap(new Map());
      setLoadingProgress(15);
      setLoadingPhase('Candidatos');

      try {
        const response = await fetch(
          `https://criasapi.geocode.com.br/institution/${selectedInstitution.id}/candidate/`,
          {
            headers: AUTH_HEADER,
          }
        );

        if (response.ok) {
          const updatedCandidates: Candidate[] = await response.json();

          const cacheKey = getCandidatesCacheKey(selectedInstitution.id);
          cache.set(cacheKey, updatedCandidates, 5 * 60 * 1000);

          setCandidates(updatedCandidates);
          setCandidatesError(null);

          if (updatedCandidates.length > 0) {
            updatedCandidates.forEach((candidate) => {
              if (candidate.id && selectedInstitution.id) {
                const answersCacheKey = getAnswersCacheKey(selectedInstitution.id, candidate.id);
                cache.delete(answersCacheKey);
              }
            });

            setLoadingProgress(40);
            setLoadingPhase('Verificando e classificando todos os candidatos');

            const updatedAnswersMap = await fetchAllAnswers(
              selectedInstitution.id,
              updatedCandidates,
              (completed, total) => {
                if (total > 0) {
                  setLoadingProgress(40 + 60 * (completed / total));
                }
              }
            );
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
      } finally {
        setLoadingProgress(100);
        setInitialAnswersLoadComplete(true);
      }

      if (selectedCandidate && selectedCandidate.id) {
        const answersCacheKey = getAnswersCacheKey(selectedInstitution.id, selectedCandidate.id);
        cache.delete(answersCacheKey);
        await fetchAnswers(selectedInstitution.id, selectedCandidate.id);
      }
    } else {
      setLoadingProgress(100);
      setInitialAnswersLoadComplete(true);
    }

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
    setSelectedEtapas([]);
    setSelectedAnswerFilters([]);
    setSelectedInactivities([]);
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

  // Função auxiliar para obter etapa por questão
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
    } else if (question === 67) {
      return 'Etapa 3';
    }
    return 'Desconhecida';
  };


  // Filtrar candidatos: OR dentro de cada tipo, AND entre tipos
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;

    // Filtro por inatividade (qualquer um selecionado = candidato deve bater em pelo menos um)
    if (selectedInactivities.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const etapa = getCandidateEtapaUtil(candidate.id, allCandidatesAnswersMap);
        const isFinalized = etapa === 'Finalizou';

        return selectedInactivities.some((sel) => {
          if (sel === 'finalized') return isFinalized;
          if (sel === 'notFinalized') return !isFinalized;
          if (typeof sel === 'number') {
            if (isFinalized) return false;
            const cid = candidate.id as string;
            const answers = allCandidatesAnswersMap.get(cid) || [];
            let daysOfInactivity = 0;
            if (answers.length === 0) {
              if (candidate.createdAt) {
                try {
                  const createdDate = new Date(candidate.createdAt);
                  createdDate.setHours(0, 0, 0, 0);
                  daysOfInactivity = Math.max(0, Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
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
                    if (!lastAnswerDate || answerDate > lastAnswerDate) lastAnswerDate = answerDate;
                  } catch (e) {}
                }
              });
              if (lastAnswerDate) {
                const lastDate = new Date(lastAnswerDate);
                lastDate.setHours(0, 0, 0, 0);
                daysOfInactivity = Math.max(0, Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
              }
            }
            return daysOfInactivity === sel;
          }
          return false;
        });
      });
    }

    // Filtro por etapa (OR)
    if (selectedEtapas.length > 0) {
      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const etapa = getCandidateEtapaUtil(candidate.id, allCandidatesAnswersMap);
        return selectedEtapas.some((selectedEtapa) => {
          if (selectedEtapa === 'Não responderam nenhuma pergunta') return etapa === 'Sem respostas';
          return etapa === selectedEtapa;
        });
      });
    }

    // Filtro por resposta (OR: candidato deve ter pelo menos uma das respostas selecionadas)
    if (selectedAnswerFilters.length > 0) {
      filtered = filtered.filter((candidate) => {
        if (!candidate.id) return false;
        const answers = allCandidatesAnswersMap.get(candidate.id) || [];
        return selectedAnswerFilters.some(
          (f) => !!answers.find((a) => a.question !== undefined && a.question === f.question && a.answer === f.answer)
        );
      });
    }

    return filtered;
  }, [candidates, selectedEtapas, selectedAnswerFilters, selectedInactivities, allCandidatesAnswersMap]);

  // Função para buscar todas as respostas de todos os candidatos (otimizada)
  const fetchAllAnswers = async (
    institutionId: string,
    candidates: Candidate[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, Answer[]>> => {
    const answersMap = new Map<string, Answer[]>();
    
    // Filtrar candidatos com ID
    const candidatesWithId = candidates.filter((c) => c.id);
    const total = candidatesWithId.length;
    
    if (total === 0) {
      onProgress?.(0, 0);
      return answersMap;
    }

    // Separar candidatos que já estão no cache dos que precisam ser buscados
    const candidatesToFetch: Candidate[] = [];
    
    candidatesWithId.forEach((candidate) => {
      if (!candidate.id) return;
      
      const cacheKey = getAnswersCacheKey(institutionId, candidate.id);
      const cached = cache.get<Answer[]>(cacheKey);
      
      if (cached) {
        answersMap.set(candidate.id, cached);
      } else {
        candidatesToFetch.push(candidate);
      }
    });

    const cachedCount = total - candidatesToFetch.length;
    onProgress?.(cachedCount, total);

    if (candidatesToFetch.length === 0) {
      return answersMap;
    }

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
            const cacheKey = getAnswersCacheKey(institutionId, candidate.id);
            cache.set(cacheKey, answers, 5 * 60 * 1000);
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
        maxConcurrent: 10,
        delayBetweenBatches: 50,
        onProgress: (batchCompleted) => {
          onProgress?.(cachedCount + batchCompleted, total);
        },
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

  const formatDateForExport = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Dados compilados/completos: um aluno por linha
  const generateCompiledData = (
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>
  ): string[][] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseHeaders = [
      'Nome',
      'Telefone',
      'E-mail',
      'Documento',
      'Endereço',
      'Cidade',
      'Criado em',
      'Atualizado em',
      'ID',
      'Etapa',
      'Stage',
      'Questão parou',
      'Dias da última mensagem',
    ];

    const questionNumbers = Object.keys(QUESTIONS)
      .map((k) => Number(k))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b);

    const questionHeaders = questionNumbers.map(
      (q) => QUESTIONS[q] || `Questão ${q}`
    );

    const rows: string[][] = [[...baseHeaders, ...questionHeaders]];

    candidates.forEach((candidate) => {
      const cid = candidate.id || '';
      const answers = answersMap.get(cid) || [];
      const etapa = getCandidateEtapaUtil(cid, answersMap);
      const stage = getCandidateStageName(cid);

      let questaoParou = '';
      let lastDate: Date | null = null;

      if (answers.length > 0) {
        let maxQuestion = -1;
        answers.forEach((a) => {
          if (a.question !== undefined && a.question > maxQuestion) {
            maxQuestion = a.question;
          }
          if (a.answeredAt) {
            try {
              const d = new Date(a.answeredAt);
              if (!isNaN(d.getTime()) && (!lastDate || d > lastDate)) lastDate = d;
            } catch {}
          }
        });
        if (maxQuestion >= 0) questaoParou = String(maxQuestion);
      }

      if (!lastDate && candidate.createdAt) {
        try {
          const d = new Date(candidate.createdAt);
          if (!isNaN(d.getTime())) lastDate = d;
        } catch {}
      }

      let diasUltimaMensagem = '';
      if (lastDate) {
        const last = new Date(lastDate);
        last.setHours(0, 0, 0, 0);
        const days = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        diasUltimaMensagem = String(Math.max(0, days));
      }

      const byQuestion = new Map<number, string>();
      answers.forEach((a) => {
        if (a.question !== undefined) {
          const raw = a.answer || '';
          const formatted = getFormattedAnswer(a.question, raw);
          byQuestion.set(a.question, formatted || raw);
        }
      });

      const questionCells = questionNumbers.map((q) => byQuestion.get(q) || '');

      rows.push([
        candidate.name || '',
        candidate.whatsapp || '',
        candidate.email || '',
        candidate.document || '',
        candidate.addressLine1 || '',
        candidate.city || '',
        formatDateForExport(candidate.createdAt),
        formatDateForExport(candidate.updatedAt),
        cid,
        etapa,
        stage,
        questaoParou,
        diasUltimaMensagem,
        ...questionCells,
      ]);
    });

    return rows;
  };

  const generateCompiledCSV = (
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>
  ): string => {
    const data = generateCompiledData(candidates, answersMap);
    return data.map((row) => row.map(escapeCSV).join(',')).join('\n');
  };

  const downloadCompiledXLSX = (
    candidates: Candidate[],
    answersMap: Map<string, Answer[]>,
    institutionName: string
  ) => {
    const data = generateCompiledData(candidates, answersMap);
    const ws = XLSX.utils.aoa_to_sheet(data);
    const colWidths = [
      { wch: 25 }, { wch: 18 }, { wch: 30 }, { wch: 16 }, { wch: 35 },
      { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 28 },
      { wch: 14 }, { wch: 22 },
    ];
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados completos');
    const sanitized = (institutionName || 'inst').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `candidatos_completos_${sanitized}_${date}.xlsx`);
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

  // Handler de exportação "dados completos" (um candidato por linha, todas as questões em colunas)
  const handleExportCompiled = (format: 'csv' | 'xlsx') => {
    if (!selectedInstitution || filteredCandidates.length === 0) return;
    setIsExportingCompiled(true);
    try {
      if (format === 'csv') {
        const csvContent = generateCompiledCSV(filteredCandidates, allCandidatesAnswersMap);
        const sanitized = (selectedInstitution.name || '')
          .replace(/[^a-z0-9]/gi, '_')
          .toLowerCase();
        const filterSuffix =
          selectedEtapas.length > 0 || selectedAnswerFilters.length > 0 || selectedInactivities.length > 0
            ? '_filtro'
            : '';
        const date = new Date().toISOString().split('T')[0];
        downloadFile(
          csvContent,
          `candidatos_completos_${sanitized}${filterSuffix}_${date}.csv`,
          'text/csv;charset=utf-8;'
        );
      } else {
        downloadCompiledXLSX(
          filteredCandidates,
          allCandidatesAnswersMap,
          selectedInstitution.name || ''
        );
      }
    } catch (err) {
      alert('Erro ao exportar dados completos. Tente novamente.');
      console.error(err);
    } finally {
      setIsExportingCompiled(false);
    }
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
        const filterSuffix =
          selectedEtapas.length > 0 || selectedAnswerFilters.length > 0 || selectedInactivities.length > 0
            ? '_filtro'
            : '';
        const date = new Date().toISOString().split('T')[0];
        const filename = `candidatos_${sanitizedName}${filterSuffix}_${date}.csv`;
        downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
      } else if (format === 'xlsx') {
        downloadXLSXWithFilter(
          selectedInstitution,
          filteredCandidates,
          answersMap,
          selectedEtapas.length > 0 ? selectedEtapas.join('_') : undefined
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
      setSelectedEtapas([]);
      setSelectedAnswerFilters([]);
      setSelectedInactivities([]);
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
        {(selectedInstitution && !isInitialDataReady) || (isAuthenticated && isLoading && !selectedInstitution) ? (
          <div className="loading-overlay-wrapper">
            <LoadingOverlay progress={loadingProgress} phase={loadingPhase} />
          </div>
        ) : (
          <>
            <div className="left-column">
              <div className="profile-chart-container">
                <InstitutionProfile institution={selectedInstitution} />
                {selectedInstitution && candidates.length > 0 ? (
                  <>
                    <EtapasChart
                      candidates={candidates}
                      answersMap={allCandidatesAnswersMap}
                      onEtapaClick={(etapa) => {
                        setSelectedEtapas((prev) =>
                          prev.includes(etapa) ? prev.filter((e) => e !== etapa) : [...prev, etapa]
                        );
                      }}
                      selectedEtapas={selectedEtapas}
                    />
                    <InactivityChart
                      institutionId={selectedInstitution.id}
                      candidates={candidates}
                      answersMap={allCandidatesAnswersMap}
                      onInactivityClick={(type) => {
                        if (type === null) return;
                        setSelectedInactivities((prev) => {
                          const already = prev.some(
                            (s) => s === type || (typeof s === 'number' && typeof type === 'number' && s === type)
                          );
                          if (already) return prev.filter((s) => s !== type);
                          return [...prev, type];
                        });
                      }}
                      selectedInactivities={selectedInactivities}
                    />
                    <AnswersChart
                      candidates={candidates}
                      answersMap={allCandidatesAnswersMap}
                      onAnswerClick={(question, answer) => {
                        if (question === null || answer === null) return;
                        setSelectedAnswerFilters((prev) => {
                          const already = prev.some((f) => f.question === question && f.answer === answer);
                          if (already) return prev.filter((f) => !(f.question === question && f.answer === answer));
                          return [...prev, { question, answer }];
                        });
                      }}
                      selectedAnswerFilters={selectedAnswerFilters}
                      defaultQuestion={60}
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
                onExportCompiled={handleExportCompiled}
                isExportingCompiled={isExportingCompiled}
                answersMap={allCandidatesAnswersMap}
                selectedEtapas={selectedEtapas}
                selectedAnswerFilters={selectedAnswerFilters}
                selectedInactivities={selectedInactivities}
                onClearFilter={() => {
                  setSelectedEtapas([]);
                  setSelectedAnswerFilters([]);
                  setSelectedInactivities([]);
                }}
                totalCandidates={candidates.length}
                getCandidateStageName={getCandidateStageName}
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
          </>
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

  const EstagioPage = () => (
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
        title="Etapas"
        lastUpdateDate={lastUpdateDate}
        username={username}
      />
      <Estagio />
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/gerenciamento" element={<GerenciamentoPage />} />
      <Route path="/detalhe" element={<DetalhePage />} />
      <Route path="/estagio" element={<EstagioPage />} />
    </Routes>
  );
}

export default App;

