import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface ValidationActions {
  readonly register: (id: string) => () => void;
  readonly report: (id: string, invalid: boolean) => void;
  readonly isBlocked: () => boolean;
}

interface ValidationStatus {
  readonly hasInvalid: boolean;
}

const ValidationActionsContext = createContext<ValidationActions | null>(null);
const ValidationStatusContext = createContext<ValidationStatus>({ hasInvalid: false });

export const ValidationProvider = ({ children }: { readonly children: ReactNode }) => {
  const invalidFields = useRef<Set<string>>(new Set());
  const [hasInvalid, setHasInvalid] = useState(false);

  const sync = useCallback(() => {
    setHasInvalid(invalidFields.current.size > 0);
  }, []);

  const actions = useMemo<ValidationActions>(() => {
    return {
      register: (id: string) => {
        return () => {
          if (invalidFields.current.has(id)) {
            invalidFields.current.delete(id);
            sync();
          }
        };
      },
      report: (id: string, invalid: boolean) => {
        const wasInvalid = invalidFields.current.has(id);
        if (invalid && !wasInvalid) {
          invalidFields.current.add(id);
          sync();
        } else if (!invalid && wasInvalid) {
          invalidFields.current.delete(id);
          sync();
        }
      },
      isBlocked: () => invalidFields.current.size > 0,
    };
  }, [sync]);

  const status = useMemo<ValidationStatus>(() => ({ hasInvalid }), [hasInvalid]);

  return (
    <ValidationActionsContext.Provider value={actions}>
      <ValidationStatusContext.Provider value={status}>{children}</ValidationStatusContext.Provider>
    </ValidationActionsContext.Provider>
  );
};

export const useValidationActions = () => useContext(ValidationActionsContext);
export const useValidation = () => useContext(ValidationStatusContext);
