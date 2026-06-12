"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { Profile, ProfileFormValues } from "@/lib/perfil/profile-types"

type EditProfileDialogProps = {
  open: boolean
  profile: Profile
  saving: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ProfileFormValues) => Promise<string>
}

export function EditProfileDialog({
  open,
  profile,
  saving,
  onOpenChange,
  onSubmit,
}: EditProfileDialogProps) {
  const [formError, setFormError] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError("")

    const formData = new FormData(event.currentTarget)
    const error = await onSubmit({
      displayName: String(formData.get("displayName") || ""),
      username: String(formData.get("username") || ""),
      bio: String(formData.get("bio") || ""),
    })

    if (error) {
      setFormError(error)
      return
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Atualize como seu nome aparece no Papirar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="displayName">Nome</FieldLabel>
              <Input
                id="displayName"
                name="displayName"
                defaultValue={profile.displayName}
                minLength={2}
                maxLength={80}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="username">Usuario</FieldLabel>
              <Input
                id="username"
                name="username"
                defaultValue={profile.username}
                minLength={3}
                maxLength={30}
                required
              />
              <FieldDescription>
                Use letras minusculas, numeros e underline.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="bio">Bio</FieldLabel>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={profile.bio}
                maxLength={240}
                className="min-h-24"
              />
            </Field>

            {formError && <FieldError>{formError}</FieldError>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
