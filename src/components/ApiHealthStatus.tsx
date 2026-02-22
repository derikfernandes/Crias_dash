import { useState, useEffect } from 'react';
import { AUTH_HEADER } from '../utils/api';

export const ApiHealthStatus = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      setIsChecking(true);
      try {
        const response = await fetch('https://criasapi.geocode.com.br/health/', {
          headers: AUTH_HEADER,
        });

        if (response.ok) {
          setIsHealthy(true);
        } else {
          setIsHealthy(false);
        }
      } catch (error) {
        setIsHealthy(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkHealth();

    // Verificar a cada 30 segundos
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isChecking) {
    return (
      <div className="api-health-status checking">
        <span className="health-indicator"></span>
        <span className="health-text">Verificando...</span>
      </div>
    );
  }

  return (
    <div className={`api-health-status ${isHealthy ? 'healthy' : 'unhealthy'}`}>
      <span className="health-indicator"></span>
      <span className="health-text">
        {isHealthy ? 'API OK' : 'API Offline'}
      </span>
    </div>
  );
};

