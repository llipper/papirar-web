"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    async function confirmSession() {
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get("code")

      if (!code) {
        setError("Link de confirmação inválido.")
        return
      }

      const supabase = createSupabaseBrowserClient()
      const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        setError("Não foi possível confirmar o acesso.")
        return
      }

      router.replace("/lei")
      router.refresh()
    }

    void confirmSession()
  }, [router])

  if (error) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <h1 className="text-xl font-bold">Confirmação não concluída</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        <Button asChild>
          <Link href="/login">Voltar para login</Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-sm text-muted-foreground">
      Confirmando acesso...
    </main>
  )
}
