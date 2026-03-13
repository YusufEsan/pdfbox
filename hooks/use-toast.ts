"use client"

import { useState, useCallback } from "react"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback(({ title, description, variant = "default" }: ToastProps) => {
    // Gerçek bir uygulamada burada bir toast state management olur.
    // Şimdilik sadece konsola basıyoruz ve alert veriyoruz.
    console.log(`Toast [${variant}]: ${title} - ${description}`)
    if (variant === "destructive") {
        alert(`${title}\n${description}`)
    }
  }, [])

  return { toast, toasts }
}
