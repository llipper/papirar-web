"use client"

import { useRef, type ChangeEvent } from "react"
import {
  RiBookOpenLine,
  RiCameraLine,
  RiEditLine,
  RiStickyNoteLine,
  RiTimeLine,
} from "@remixicon/react"

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import type { Profile } from "@/lib/perfil/profile-types"
import { initials } from "@/lib/perfil/profile-utils"

type ProfileHeaderCardProps = {
  profile: Profile
  highlightsCount: number
  notesCount: number
  uploadingAvatar: boolean
  onAvatarFile: (file: File) => void
  onEdit: () => void
}

export function ProfileHeaderCard({
  profile,
  highlightsCount,
  notesCount,
  uploadingAvatar,
  onAvatarFile,
  onEdit,
}: ProfileHeaderCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    onAvatarFile(file)
    event.target.value = ""
  }

  return (
    <Card className="p-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="rounded-full transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
            title="Alterar avatar"
          >
            <Avatar
              className="size-24 border border-border shadow-sm"
              size="lg"
            >
              {profile.avatarUrl && (
                <AvatarImage
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                />
              )}
              <AvatarFallback className="text-2xl font-semibold">
                {initials(profile.displayName)}
              </AvatarFallback>
              <AvatarBadge className="size-7">
                <RiCameraLine className="size-3.5" />
              </AvatarBadge>
            </Avatar>
          </button>

          <Button size="sm" variant="outline" onClick={onEdit}>
            <RiEditLine className="size-4" />
            Editar
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <div className="mt-5 min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight">
            {profile.displayName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            @{profile.username}
          </p>
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          {profile.bio ||
            "Lei seca com audio, revisao diaria e foco em aprovacao."}
        </p>

        <div className="mt-6 grid gap-3">
          <ProfileMetric
            icon={<RiBookOpenLine className="size-4" />}
            label="Marcacoes"
            value={highlightsCount}
          />
          <ProfileMetric
            icon={<RiStickyNoteLine className="size-4" />}
            label="Anotacoes"
            value={notesCount}
          />
          <ProfileMetric
            icon={<RiTimeLine className="size-4" />}
            label="Membro desde"
            value={
              profile.createdAt
                ? new Date(profile.createdAt).getFullYear()
                : "Papirar"
            }
          />
        </div>

        <div className="mt-6 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Status
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Revisao ativa</Badge>
            <Badge variant="outline">
              {profile.avatarUrl ? "Perfil completo" : "Perfil basico"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}
