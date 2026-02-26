import { SelectableChart } from '../components/SelectableChart';
import { Candidate } from '../types/candidate';
import { Answer } from '../types/answer';

interface GraficosProps {
  candidates: Candidate[];
  answersMap: Map<string, Answer[]>;
}

export const Graficos = ({ candidates, answersMap }: GraficosProps) => {
  // Gráficos padrão pré-selecionados (questões 1 a 66):
  // 1. Cidade de nascimento (Questão 13)
  // 2. Escolas (Questão 17)
  // 3. Preferência Híbrido/Presencial (Questão 60)
  // 4. Série cursando (Questão 21)
  // 5. Foi indicado (Questão 1)
  // 6. Nome completo (Questão 2)
  return (
    <div className="graficos-page">
      <div className="graficos-grid">
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={1}
          defaultChartType="answers"
          defaultQuestion={13}
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={2}
          defaultChartType="answers"
          defaultQuestion={17}
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={3}
          defaultChartType="answers"
          defaultQuestion={60}
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={4}
          defaultChartType="answers"
          defaultQuestion={21}
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={5}
          defaultChartType="answers"
          defaultQuestion={1}
        />
        <SelectableChart
          candidates={candidates}
          answersMap={answersMap}
          chartId={6}
          defaultChartType="answers"
          defaultQuestion={2}
        />
      </div>
    </div>
  );
};

