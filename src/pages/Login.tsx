import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

// Credenciais válidas
const VALID_CREDENTIALS = {
  'crias_adm': '#Cr1as123',
  'institutosol': '#S0l123',
  'chatis_adm': '#Ch4tis123',
};

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simular um pequeno delay para melhor UX
    setTimeout(() => {
      // Verificar credenciais
      if (username in VALID_CREDENTIALS && VALID_CREDENTIALS[username as keyof typeof VALID_CREDENTIALS] === password) {
        // Salvar autenticação no localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', username);
        setIsLoading(false);
        onLogin();
      } else {
        setError('Usuário ou senha incorretos');
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">Crias</h1>
          <p className="login-subtitle">Acesso ao Sistema</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Digite seu usuário"
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Digite sua senha"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message-login">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

