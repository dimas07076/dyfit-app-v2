// client/src/hooks/useFormPersistence.ts
import { useEffect, useState, useCallback } from 'react';

interface UseFormPersistenceOptions<T> {
  formKey: string;
  initialValues: T;
  enabled?: boolean;
}

export function useFormPersistence<T extends Record<string, any>>({ 
  formKey, 
  initialValues, 
  enabled = true 
}: UseFormPersistenceOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);

  // Restore form values on mount
  useEffect(() => {
    if (!enabled) return;

    const savedValues = localStorage.getItem(`form_${formKey}`);
    if (savedValues) {
      try {
        const parsedValues = JSON.parse(savedValues);
        setValues({ ...initialValues, ...parsedValues });
      } catch (error) {
        console.warn(`Failed to restore form values for ${formKey}:`, error);
        localStorage.removeItem(`form_${formKey}`);
      }
    }
  }, [formKey, enabled]);

  // Save form values to localStorage when they change
  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      localStorage.setItem(`form_${formKey}`, JSON.stringify(values));
    }, 500); // Debounce to avoid excessive localStorage writes

    return () => clearTimeout(timeoutId);
  }, [values, formKey, enabled]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateFields = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    if (enabled) {
      localStorage.removeItem(`form_${formKey}`);
    }
  }, [initialValues, formKey, enabled]);

  const clearPersistence = useCallback(() => {
    if (enabled) {
      localStorage.removeItem(`form_${formKey}`);
    }
  }, [formKey, enabled]);

  return {
    values,
    setValues,
    updateField,
    updateFields,
    resetForm,
    clearPersistence
  };
}