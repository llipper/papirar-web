"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"

import type {
  HighlightRow,
  NoteRow,
  Profile,
  ProfileFormValues,
  ProfileRow,
} from "@/lib/perfil/profile-types"
import {
  avatarBucket,
  defaultUsername,
  normalizeUsername,
  profileFromRow,
  profileSelect,
  validateDisplayName,
  validateUsername,
} from "@/lib/perfil/profile-utils"

export function useProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [highlights, setHighlights] = useState<HighlightRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      setError("")

      const supabase = createSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const user = session.user
      const email = user.email || ""

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select(profileSelect)
        .eq("id", user.id)
        .maybeSingle()

      let row = existingProfile as ProfileRow | null

      if (profileError) {
        setError("Nao foi possivel carregar seu perfil.")
        setLoading(false)
        return
      }

      if (!row) {
        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            display_name:
              typeof user.user_metadata?.name === "string"
                ? user.user_metadata.name
                : email.split("@")[0],
            username: defaultUsername(email, user.id),
            bio: "",
          })
          .select(profileSelect)
          .single()

        if (createError || !createdProfile) {
          setError("Nao foi possivel criar seu perfil.")
          setLoading(false)
          return
        }

        row = createdProfile as ProfileRow
      }

      const avatarUrl = getAvatarUrl(row)
      const [highlightsResult, notesResult] = await Promise.all([
        supabase
          .from("lei_highlights")
          .select("id,lei_id,color,selected_text,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("lei_notes")
          .select("id,lei_id,lei_title,selected_text,note,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ])

      setProfile(profileFromRow(row, email, avatarUrl))
      setHighlights((highlightsResult.data || []) as HighlightRow[])
      setNotes((notesResult.data || []) as NoteRow[])
      setLoading(false)
    }

    void loadProfile()
  }, [router])

  async function updateProfile(values: ProfileFormValues) {
    if (!profile) return "Perfil nao carregado."

    const displayName = values.displayName.trim()
    const username = normalizeUsername(values.username)
    const bio = values.bio.trim().slice(0, 240)
    const nameError = validateDisplayName(displayName)
    const usernameError = validateUsername(username)

    if (nameError || usernameError) return nameError || usernameError

    setSaving(true)

    const supabase = createSupabaseBrowserClient()
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName, username, bio })
      .eq("id", profile.id)
      .select(profileSelect)
      .single()

    setSaving(false)

    if (updateError || !data) return "Nao foi possivel salvar o perfil."

    const row = data as ProfileRow
    setProfile(profileFromRow(row, profile.email, getAvatarUrl(row)))
    return ""
  }

  async function uploadAvatar(file: File) {
    if (!profile) return

    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem para o avatar.")
      return
    }

    setUploadingAvatar(true)

    const supabase = createSupabaseBrowserClient()
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(extension)
      ? extension.replace("jpeg", "jpg")
      : "jpg"
    const avatarPath = `${profile.id}/avatar.${safeExtension}`

    const { error: uploadError } = await supabase.storage
      .from(avatarBucket)
      .upload(avatarPath, file, {
        upsert: true,
        contentType: file.type,
      })

    if (uploadError) {
      setUploadingAvatar(false)
      setError("Nao foi possivel enviar o avatar.")
      return
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: avatarPath })
      .eq("id", profile.id)
      .select(profileSelect)
      .single()

    setUploadingAvatar(false)

    if (updateError || !data) {
      setError("Avatar enviado, mas nao foi possivel atualizar o perfil.")
      return
    }

    const row = data as ProfileRow
    const avatarUrl = `${getPublicAvatarUrl(avatarPath)}?v=${Date.now()}`
    setProfile(profileFromRow(row, profile.email, avatarUrl))
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace("/login")
    router.refresh()
  }

  return {
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
  }
}

function getAvatarUrl(row: ProfileRow) {
  if (!row.avatar_path) return null

  return `${getPublicAvatarUrl(row.avatar_path)}?v=${row.updated_at || ""}`
}

function getPublicAvatarUrl(path: string) {
  const supabase = createSupabaseBrowserClient()

  return supabase.storage.from(avatarBucket).getPublicUrl(path).data.publicUrl
}
