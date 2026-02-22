import { SelectableChart } from '../components/SelectableChart';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';

interface GraficosProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
}

export const Graficos = ({ candidates, answersMap }: GraficosProps) => {
  // Gráficos padrão pré-selecionados:
  // 1. Cidade de nascimento (Questão 13)
  // 2. Escolas (Questão 16)
  // 3. Online ou presencial (Questão 59)
  // 4. Ano escolar (Questão 20)
  // 5. Se foi indicado (Questão 1)
  // 6. Nome da indicação (Questão 0)
  
  return (
    <div className="graficos-page">
      <div className="graficos-grid">
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={1}
          defaultChartType="answers"
          defaultQuestion={13} // Cidade/Estado de nascimento
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={2}
          defaultChartType="answers"
          defaultQuestion={16} // Qual nome da sua escola?
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={3}
          defaultChartType="answers"
          defaultQuestion={59} // Online ou presencial
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={4}
          defaultChartType="answers"
          defaultQuestion={20} // Qual série você está cursando? (9º ano ou outro)
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={5}
          defaultChartType="answers"
          defaultQuestion={1} // Foi indicado por alguém?
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={6}
          defaultChartType="answers"
          defaultQuestion={0} // Nome de quem indicou
        />
      </div>
    </div>
  );
};

