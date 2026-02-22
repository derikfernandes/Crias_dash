import { useMemo } from 'react';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';

interface EtapasChartProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
  onEtapaClick?: (etapa: string | null) => void;
  selectedEtapa?: string | null;
}

interface EtapaData {
  nome: string;
  quantidade: number;
}

export const EtapasChart = ({
  candidates,
  answersMap,
  onEtapaClick,
  selectedEtapa,
}: EtapasChartProps) => {
  const getEtapa = (question: number): string => {
    if (question >= 0 && question <= 1) {
      return 'Inicial';
    } else if (question >= 2 && question <= 24) {
      return 'Conhecendo Você';
    } else if (question >= 25 && question <= 45) {
      return 'Conhecendo sua Família';
    } else if (question >= 46 && question <= 58) {
      return 'Formulário Socioeconômico';
    } else if (question >= 59 && question <= 64) {
      return 'Sobre sua participação';
    } else if (question === 65) {
      return 'Finalizou';
    }
    return 'Desconhecida';
  };

  const etapasData = useMemo(() => {
    const etapas: EtapaData[] = [
      { nome: 'Inicial', quantidade: 0 },
      { nome: 'Conhecendo Você', quantidade: 0 },
      { nome: 'Conhecendo sua Família', quantidade: 0 },
      { nome: 'Formulário Socioeconômico', quantidade: 0 },
      { nome: 'Sobre sua participação', quantidade: 0 },
      { nome: 'Finalizou', quantidade: 0 },
    ];

    candidates.forEach((candidate) => {
      const candidateId = candidate.id || '';
      const answers = answersMap.get(candidateId) || [];
      
      if (answers.length === 0) {
        // Se não tem respostas, não conta em nenhuma etapa
        return;
      }

      // Verificar se tem resposta na questão 65 (Finalizou)
      const hasQuestion65 = answers.some((answer) => answer.question === 65);
      
      if (hasQuestion65) {
        // Se tem questão 65, está na etapa "Finalizou"
        const etapaData = etapas.find((e) => e.nome === 'Finalizou');
        if (etapaData) {
          etapaData.quantidade += 1;
        }
      } else {
        // Caso contrário, encontrar a etapa mais avançada que o candidato respondeu
        let etapaMaisAvancada = '';
        let maiorNumeroQuestao = -1;

        answers.forEach((answer) => {
          if (answer.question !== undefined && answer.question > maiorNumeroQuestao) {
            maiorNumeroQuestao = answer.question;
            etapaMaisAvancada = getEtapa(answer.question);
          }
        });

        // Se encontrou uma etapa, adicionar o candidato nela
        if (etapaMaisAvancada) {
          const etapaData = etapas.find((e) => e.nome === etapaMaisAvancada);
          if (etapaData) {
            etapaData.quantidade += 1;
          }
        }
      }
    });

    return etapas;
  }, [candidates, answersMap]);

  const maxQuantidade = Math.max(
    ...etapasData.map((e) => e.quantidade),
    1
  );

  if (candidates.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Candidatos por Etapa</h3>
        <div className="empty-message">
          Nenhum candidato selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Candidatos por Etapa</h3>
        <span className="chart-total">Total: {candidates.length}</span>
      </div>
      <div className="chart-content">
        {etapasData.map((etapa) => {
          const isSelected = selectedEtapa === etapa.nome;
          return (
            <div
              key={etapa.nome}
              className={`chart-bar-item ${isSelected ? 'selected' : ''} ${
                etapa.quantidade > 0 ? 'clickable' : ''
              }`}
              onClick={() => {
                if (etapa.quantidade > 0 && onEtapaClick) {
                  onEtapaClick(isSelected ? null : etapa.nome);
                }
              }}
            >
              <div className="chart-bar-label">
                <span className="chart-bar-name">{etapa.nome}</span>
                <span className="chart-bar-value">
                  {etapa.quantidade}
                  {candidates.length > 0 && (
                    <span className="chart-bar-percentage">
                      {' '}
                      ({Math.round((etapa.quantidade / candidates.length) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
              <div className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{
                    width: `${(etapa.quantidade / maxQuantidade) * 100}%`,
                  }}
                >
                  <span className="chart-bar-fill"></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

