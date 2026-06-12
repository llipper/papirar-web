export type ProfileRow = {
  id: string
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_path: string | null
  created_at: string | null
  updated_at: string | null
}

export type Profile = {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatarPath: string | null
  avatarUrl: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type HighlightRow = {
  id: string
  lei_id: string
  color: string
  selected_text: string
  created_at: string
}

export type NoteRow = {
  id: string
  lei_id: string
  lei_title: string | null
  selected_text: string
  note: string
  created_at: string
}

export type ProfileFormValues = {
  displayName: string
  username: string
  bio: string
}
