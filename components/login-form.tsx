"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, type FormEvent } from "react"
import { RiEyeCloseLine, RiEyeLine } from "@remixicon/react"

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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
              <div className="flex size-12 items-center justify-center rounded-xl border bg-background p-2 shadow-sm">
                <Image
                  src="/logo/logo.png"
                  alt="Papirar"
                  width={32}
                  height={32}
                  priority
                  className="size-8 object-contain"
                />
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
            <InputGroup>
              <InputGroupInput
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
