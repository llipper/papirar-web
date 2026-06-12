import Link from "next/link"
import { RiMapPinLine, RiStickyNoteLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { HighlightRow, NoteRow, Profile } from "@/lib/perfil/profile-types"

type ProfileActivityTabsProps = {
  profile: Profile
  highlights: HighlightRow[]
  notes: NoteRow[]
}

export function ProfileActivityTabs({
  profile,
  highlights,
  notes,
}: ProfileActivityTabsProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Area de estudo
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus registros recentes na lei seca.
          </p>
        </div>
      </div>

      <Tabs defaultValue="activity" className="gap-5">
        <TabsList variant="line" className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Visao geral</TabsTrigger>
          <TabsTrigger value="highlights">Marcacoes</TabsTrigger>
          <TabsTrigger value="notes">Anotacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Marcacoes salvas" value={highlights.length} />
            <StatCard label="Anotacoes criadas" value={notes.length} />
            <StatCard
              label="Perfil"
              value={profile.avatarUrl ? "Completo" : "Basico"}
            />
          </div>
        </TabsContent>

        <TabsContent value="highlights">
          <ActivityList
            emptyTitle="Nenhuma marcacao"
            emptyMessage="As partes marcadas no texto da lei vao aparecer aqui."
          >
            {highlights.map((item) => (
              <ActivityItem
                key={item.id}
                href={`/lei/${item.lei_id}`}
                title={`${item.lei_id} - ${item.color}`}
                text={item.selected_text}
                icon={<RiMapPinLine className="size-4" />}
              />
            ))}
          </ActivityList>
        </TabsContent>

        <TabsContent value="notes">
          <ActivityList
            emptyTitle="Nenhuma anotacao"
            emptyMessage="Suas anotacoes feitas na leitura vao aparecer aqui."
          >
            {notes.map((item) => (
              <ActivityItem
                key={item.id}
                href={`/lei/${item.lei_id}`}
                title={item.lei_title || item.lei_id}
                text={item.note || item.selected_text}
                description={item.selected_text}
                icon={<RiStickyNoteLine className="size-4" />}
              />
            ))}
          </ActivityList>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-0">
      <CardHeader className="p-5">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl leading-none">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

function ActivityList({
  children,
  emptyTitle,
  emptyMessage,
}: {
  children: React.ReactNode
  emptyTitle: string
  emptyMessage: string
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items

  if (isEmpty) {
    return (
      <Card className="p-0">
        <CardContent className="p-6">
          <p className="font-medium">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return <div className="space-y-3">{items}</div>
}

function ActivityItem({
  href,
  title,
  text,
  description,
  icon,
}: {
  href: string
  title: string
  text: string
  description?: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-0">
      <CardHeader className="grid-cols-[1fr_auto] p-5">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-1 line-clamp-2 text-sm">{text}</CardTitle>
          {description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <CardAction>
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={href}>{icon}</Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
