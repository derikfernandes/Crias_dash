import { useMemo } from 'react';

export interface EstagioStageChartRow {
  key: string;
  label: string;
  count: number;
}

interface EstagioStagesChartProps {
  rows: EstagioStageChartRow[];
}

export const EstagioStagesChart = ({ rows }: EstagioStagesChartProps) => {
  const total = useMemo(
    () => rows.reduce((sum, r) => sum + r.count, 0),
    [rows]
  );

  const maxCount = useMemo(
    () => Math.max(...rows.map((r) => r.count), 1),
    [rows]
  );

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="chart-container estagio-stages-chart">
      <div className="chart-header">
        <h3 className="chart-title">Candidatos por etapa (API)</h3>
        <span className="chart-total">Total: {total}</span>
      </div>
      <div className="chart-content">
        {rows.map((row) => (
          <div key={row.key} className="chart-bar-item">
            <div className="chart-bar-label">
              <span className="chart-bar-name">{row.label}</span>
              <span className="chart-bar-value">
                {row.count}
                {total > 0 && (
                  <span className="chart-bar-percentage">
                    {' '}
                    ({Math.round((row.count / total) * 100)}%)
                  </span>
                )}
              </span>
            </div>
            <div className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{
                  width: `${(row.count / maxCount) * 100}%`,
                }}
              >
                <span className="chart-bar-fill" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
