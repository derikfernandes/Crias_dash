import { useState } from 'react';
import { Institution } from '../types/institution';

interface DeleteInstitutionButtonProps {
  institution: Institution;
  onDeleteClick: () => void;
  isDeleting?: boolean;
}

export const DeleteInstitutionButton = ({
  institution,
  onDeleteClick,
  isDeleting = false,
}: DeleteInstitutionButtonProps) => {
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    setShowModal(false);
    onDeleteClick();
  };

  return (
    <>
      <button
        className="delete-button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        disabled={isDeleting}
        title="Excluir instituição"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.5 4V3C5.5 2.17157 6.17157 1.5 7 1.5H9C9.82843 1.5 10.5 2.17157 10.5 3V4M12.5 4V13C12.5 13.8284 11.8284 14.5 11 14.5H5C4.17157 14.5 3.5 13.8284 3.5 13V4M12.5 4H3.5M6.5 7.5V11.5M9.5 7.5V11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Confirmar exclusão</h3>
            <p className="modal-message">
              Tem certeza que deseja excluir a instituição "{institution.name}"?
            </p>
            <div className="modal-actions">
              <button
                className="modal-button cancel-button"
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                className="modal-button delete-confirm-button"
                onClick={handleConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

