"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { RiBookOpenLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")

    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError("Email ou senha inválidos.")
      return
    }

    router.push("/lei")
    router.refresh()
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-9 items-center justify-center rounded-lg border bg-background">
                <RiBookOpenLine className="size-5" />
              </div>
              <span className="sr-only">Papirar</span>
            </Link>
            <h1 className="text-xl font-bold">Entrar no Papirar</h1>
            <FieldDescription className="text-center">
              Ainda não tem conta? <Link href="/signup">Criar conta</Link>
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
            />
          </Field>

          {error && <FieldError>{error}</FieldError>}

          <Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
