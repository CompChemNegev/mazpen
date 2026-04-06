import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../api/client';
import { useApi } from '../api/useApi';

export interface Scenario {
  id: string;
  name: string;
  type: 'drill' | 'real_event' | 'training' | 'other';
  description: string | null;
  created_at: string;
}

interface ScenarioContextType {
  scenarios: Scenario[];
  active: Scenario | null;
  setActive: (s: Scenario) => void;
  scenarioName: string;
  loading: boolean;
}

const ScenarioContext = createContext<ScenarioContextType>({
  scenarios: [],
  active: null,
  setActive: () => {},
  scenarioName: '',
  loading: true,
});

export function ScenarioProvider({ children }: { children: ReactNode }) {
  const { data: apiScenarios, loading } = useApi<Scenario[]>(() => api.getScenarios(), []);
  const scenarios = apiScenarios ?? [];

  const [active, setActiveState] = useState<Scenario | null>(null);

  useEffect(() => {
    if (scenarios.length > 0 && !active) {
      // Try to restore from localStorage, or pick first
      const stored = localStorage.getItem('ecms-scenario');
      const found = stored ? scenarios.find(s => s.name === stored) : null;
      setActiveState(found ?? scenarios[0]);
    }
  }, [scenarios, active]);

  const setActive = useCallback((s: Scenario) => {
    setActiveState(s);
    localStorage.setItem('ecms-scenario', s.name);
  }, []);

  return (
    <ScenarioContext.Provider value={{
      scenarios,
      active,
      setActive,
      scenarioName: active?.name ?? scenarios[0]?.name ?? '',
      loading,
    }}>
      {children}
    </ScenarioContext.Provider>
  );
}

export const useScenario = () => useContext(ScenarioContext);
