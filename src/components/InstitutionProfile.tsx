import { useMemo } from 'react';
import { Institution } from '../types/institution';
import { getDynamicColumns, formatValue } from '../utils/tableUtils';

interface InstitutionProfileProps {
  institution: Institution | null;
}

export const InstitutionProfile = ({
  institution,
}: InstitutionProfileProps) => {
  const fields = useMemo(() => {
    if (!institution) return [];
    return getDynamicColumns([institution]);
  }, [institution]);

  // Ordem preferencial para campos conhecidos
  const fieldOrder = ['name', 'id', 'type', 'document', 'createdAt'];

  const orderedFields = useMemo(() => {
    const known = fields.filter((f) => fieldOrder.includes(f.key));
    const unknown = fields.filter((f) => !fieldOrder.includes(f.key));

    // Ordenar conhecidos pela ordem preferencial
    known.sort((a, b) => {
      const indexA = fieldOrder.indexOf(a.key);
      const indexB = fieldOrder.indexOf(b.key);
      return indexA - indexB;
    });

    return [...known, ...unknown];
  }, [fields]);

  if (!institution) {
    return (
      <div className="profile-container">
        <h2 className="profile-title">Perfil da instituição</h2>
        <p className="empty-message">Selecione uma instituição para ver os detalhes</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h2 className="profile-title">Perfil da instituição</h2>
      <div className="profile-content">
        {orderedFields.map((field) => {
          const value = formatValue(institution[field.key], field.key);
          const isNameField = field.key === 'name';
          return (
            <div
              key={field.key}
              className={`profile-field ${isNameField ? 'name-field' : ''}`}
            >
              <label className="profile-label">{field.label}</label>
              <p
                className={`profile-value ${isNameField ? 'name-value' : ''}`}
              >
                {value || ''}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

