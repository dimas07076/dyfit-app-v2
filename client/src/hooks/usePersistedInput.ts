import { useState, useEffect } from "react"

/**
 * Hook para manter o valor de um campo salvo no localStorage.
 * Ideal para formulários que precisam preservar o preenchimento entre páginas.
 */
export function usePersistedInput(key: string, defaultValue = "") {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue
    try {
      return localStorage.getItem(key) || defaultValue
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {}
  }, [key, value])

  const clear = () => {
    localStorage.removeItem(key)
    setValue(defaultValue)
  }

  return [value, setValue, clear] as const
}