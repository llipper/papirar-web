"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { RiBookOpenLine, RiEyeCloseLine, RiEyeLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")

    const formData = new FormData(event.currentTarget)
    const displayName = String(formData.get("displayName") || "").trim()
    const email = String(formData.get("email") || "")
    const password = String(formData.get("password") || "")
    const confirmPassword = String(formData.get("confirmPassword") || "")

    if (displayName.length < 2 || displayName.length > 80) {
      setError("O nome deve ter entre 2 e 80 caracteres.")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.")
      return
    }

    setLoading(true)

    const supabase = createSupabaseBrowserClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
        data: {
          name: displayName,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    router.replace("/login")
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
            <h1 className="text-xl font-bold">Criar conta</h1>
            <FieldDescription className="text-center">
              Já tem conta? <Link href="/login">Entrar</Link>
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="displayName">Nome</FieldLabel>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={80}
              placeholder="Seu nome"
              required
            />
          </Field>

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
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? (
                    <RiEyeCloseLine className="size-4" />
                  ) : (
                    <RiEyeLine className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="confirmPassword">Confirmar senha</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={
                    showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                  }
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? (
                    <RiEyeCloseLine className="size-4" />
                  ) : (
                    <RiEyeLine className="size-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          {error && <FieldError>{error}</FieldError>}

          <Field>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
