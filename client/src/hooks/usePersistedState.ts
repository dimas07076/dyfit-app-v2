import { useState, useEffect } from "react"

/**
 * Hook para persistir valores de estado local no localStorage.
 * Ideal para campos de formulários que não devem perder dados ao trocar de rota ou aba.
 * 
 * @param key Nome da chave no localStorage
 * @param defaultValue Valor inicial padrão
 */
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      const storedValue = localStorage.getItem(key)
      return storedValue ? (JSON.parse(storedValue) as T) : defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // silencioso
    }
  }, [key, state])

  const clear = () => {
    localStorage.removeItem(key)
    setState(defaultValue)
  }

  return [state, setState, clear] as const
}