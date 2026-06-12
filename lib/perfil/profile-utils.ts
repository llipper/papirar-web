import type { Profile, ProfileRow } from "./profile-types"

export const avatarBucket = "avatars"
export const profileSelect =
  "id,display_name,username,bio,avatar_path,created_at,updated_at"

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "P"

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
}

export function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30)
}

export function defaultUsername(email: string, userId: string) {
  const prefix = normalizeUsername(email.split("@")[0] || "aluno")
  const base = prefix.length >= 3 ? prefix : "aluno"

  return `${base}_${userId.replaceAll("-", "").slice(0, 6)}`.slice(0, 30)
}

export function validateDisplayName(value: string) {
  const name = value.trim()
  if (name.length < 2) return "Use pelo menos 2 caracteres."
  if (name.length > 80) return "Use no maximo 80 caracteres."
  if (/[\x00-\x1F\x7F]/.test(name)) return "Remova caracteres invalidos."

  return ""
}

export function validateUsername(value: string) {
  const username = value.trim().toLowerCase()
  if (username.length < 3) return "Use pelo menos 3 caracteres."
  if (username.length > 30) return "Use no maximo 30 caracteres."
  if (!/^[a-z0-9_]+$/.test(username)) {
    return "Use apenas letras minusculas, numeros e underline."
  }

  return ""
}

export function profileFromRow(
  row: ProfileRow,
  email: string,
  avatarUrl: string | null
) {
  return {
    id: row.id,
    email,
    displayName: row.display_name || "Aluno Papirar",
    username: row.username || "papirar",
    bio: row.bio || "",
    avatarPath: row.avatar_path,
    avatarUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies Profile
}
