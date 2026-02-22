import { createContext, useContext, useState, ReactNode } from 'react';
import { Institution } from '../types/institution';

interface InstitutionContextType {
  selectedInstitution: Institution | null;
  setSelectedInstitution: (institution: Institution | null) => void;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(
  undefined
);

export const InstitutionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedInstitution, setSelectedInstitution] =
    useState<Institution | null>(null);

  return (
    <InstitutionContext.Provider
      value={{ selectedInstitution, setSelectedInstitution }}
    >
      {children}
    </InstitutionContext.Provider>
  );
};

export const useInstitution = () => {
  const context = useContext(InstitutionContext);
  if (context === undefined) {
    throw new Error('useInstitution must be used within an InstitutionProvider');
  }
  return context;
};

