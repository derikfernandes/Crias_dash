import { useState } from 'react';
import { Institution } from '../types/institution';
import { ManageInstitutions } from '../components/ManageInstitutions';
import { ManageCandidates } from '../components/ManageCandidates';
import { ManageAnswers } from '../components/ManageAnswers';

type ManagementTab = 'institutions' | 'candidates' | 'answers';

export const Gerenciamento = () => {
  const [activeTab, setActiveTab] = useState<ManagementTab>('institutions');

  const handleInstitutionCreated = (_institution: Institution) => {
    // Instituição criada com sucesso
  };

  return (
    <div className="app">
      <div className="app-container">
        <div className="management-header">
          <h1 className="management-title">Gerenciamento</h1>
        </div>

        <div className="management-tabs">
          <button
            className={`management-tab ${
              activeTab === 'institutions' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('institutions')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M3 4C3 3.44772 3.44772 3 4 3H16C16.5523 3 17 3.44772 17 4V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V4Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M3 7H17M7 3V17"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            Instituições
          </button>
          <button
            className={`management-tab ${
              activeTab === 'candidates' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('candidates')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 12C5.58172 12 2 14.2386 2 17V20H18V17C18 14.2386 14.4183 12 10 12Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            Candidatos
          </button>
          <button
            className={`management-tab ${
              activeTab === 'answers' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('answers')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2C5.58172 2 2 4.23858 2 7C2 9.76142 5.58172 12 10 12C14.4183 12 18 9.76142 18 7C18 4.23858 14.4183 2 10 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2 11V14C2 16.7614 5.58172 19 10 19C14.4183 19 18 16.7614 18 14V11"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            Respostas
          </button>
        </div>

        <div className="management-content">
          {activeTab === 'institutions' && (
            <ManageInstitutions
              onInstitutionCreated={handleInstitutionCreated}
              isActive={activeTab === 'institutions'}
            />
          )}
          {activeTab === 'candidates' && (
            <ManageCandidates isActive={activeTab === 'candidates'} />
          )}
          {activeTab === 'answers' && (
            <ManageAnswers isActive={activeTab === 'answers'} />
          )}
        </div>
      </div>
    </div>
  );
};

