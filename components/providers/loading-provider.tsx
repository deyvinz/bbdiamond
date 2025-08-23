"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { LoadingPage } from "@/components/ui/loading"

interface LoadingContextType {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  showLoading: () => void
  hideLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  const showLoading = () => setIsLoading(true)
  const hideLoading = () => setIsLoading(false)

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, showLoading, hideLoading }}>
      {isLoading && <LoadingPage />}
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}
