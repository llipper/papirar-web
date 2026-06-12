"use client"

import Link from "next/link"
import { useState } from "react"
import { RiArrowLeftLine, RiLogoutBoxRLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"

import { useProfile } from "@/hooks/use-profile"

import { EditProfileDialog } from "./edit-profile-dialog"
import { ProfileActivityTabs } from "./profile-activity-tabs"
import { ProfileHeaderCard } from "./profile-header-card"
import { ProfileLoading } from "./profile-loading"

export default function ProfileClient() {
  const [editOpen, setEditOpen] = useState(false)
  const {
    error,
    highlights,
    loading,
    notes,
    profile,
    saving,
    signOut,
    updateProfile,
    uploadAvatar,
    uploadingAvatar,
  } = useProfile()

  if (loading) return <ProfileLoading />

  if (error && !profile) {
    return (
      <main className="min-h-screen bg-background px-5 py-10 text-foreground">
        <div className="mx-auto max-w-2xl rounded-lg border p-6 text-sm text-destructive">
          {error}
        </div>
      </main>
    )
  }

  if (!profile) return null

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button className="mb-3 -ml-2" variant="ghost" asChild>
              <Link href="/lei">
                <RiArrowLeftLine className="size-4" />
                Leis
              </Link>
            </Button>

            <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              Conta Papirar
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Perfil
            </h1>
          </div>

          <Button className="self-start" variant="outline" onClick={signOut}>
            <RiLogoutBoxRLine className="size-4" />
            Sair
          </Button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <ProfileHeaderCard
            profile={profile}
            highlightsCount={highlights.length}
            notesCount={notes.length}
            uploadingAvatar={uploadingAvatar}
            onAvatarFile={uploadAvatar}
            onEdit={() => setEditOpen(true)}
          />

          <div className="min-w-0">
            <ProfileActivityTabs
              profile={profile}
              highlights={highlights}
              notes={notes}
            />
          </div>
        </section>
      </div>

      <EditProfileDialog
        open={editOpen}
        profile={profile}
        saving={saving}
        onOpenChange={setEditOpen}
        onSubmit={updateProfile}
      />
    </main>
  )
}
