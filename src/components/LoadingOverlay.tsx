import './LoadingOverlay.css';

interface LoadingOverlayProps {
  progress: number;
  phase?: string;
}

export const LoadingOverlay = ({ progress, phase = 'Carregando...' }: LoadingOverlayProps) => {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="Carregando dados">
      <div className="loading-overlay-content">
        <div className="loading-spinner" aria-hidden />
        <p className="loading-phase">{phase}</p>
        <div className="loading-bar-container">
          <div
            className="loading-bar-fill"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
        <p className="loading-percent">{clampedProgress}%</p>
      </div>
    </div>
  );
};
