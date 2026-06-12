"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export type LeiItem = {
  slug: string
  categoria: string
  categoriaLabel: string
  apelido?: string
  titulo?: string
  cor: string
}

type LegalDocumentRow = {
  slug?: string
  titulo?: string
  categoria?: string
}

const categoriaLabels: Record<string, string> = {
  constituicao: "Constitucional",
  codigos: "Códigos",
  estatutos: "Civil & Estatutos",
  leis: "Leis Especiais",
  tratados_internacionais: "Direitos Humanos",
}

const cores = [
  "from-indigo-500 to-indigo-700",
  "from-rose-600 to-rose-800",
  "from-emerald-500 to-emerald-700",
  "from-lime-500 to-green-700",
  "from-purple-700 to-purple-950",
  "from-sky-500 to-blue-700",
  "from-orange-500 to-red-700",
]

function textoBusca(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : ""
}

export default function LeisClient() {
  const router = useRouter()
  const [leis, setLeis] = useState<LeiItem[]>([])
  const [busca, setBusca] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dragState = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
  })

  useEffect(() => {
    async function carregarLeis() {
      setErro("")
      setCarregando(true)

      const supabase = createSupabaseBrowserClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const { data, error } = await supabase
        .from("legal_documents")
        .select("slug,titulo,categoria")
        .eq("is_active", true)
        .order("categoria", { ascending: true })
        .order("titulo", { ascending: true })

      setCarregando(false)

      if (error) {
        setErro("Não foi possível carregar os documentos permitidos.")
        return
      }

      const documentos = (data || []) as LegalDocumentRow[]

      setLeis(
        documentos.map((documento, index) => ({
          slug: documento.slug || "",
          categoria: documento.categoria || "leis",
          categoriaLabel:
            categoriaLabels[documento.categoria || ""] ??
            documento.categoria ??
            "Leis",
          apelido: documento.titulo,
          titulo: documento.titulo,
          cor: cores[index % cores.length],
        }))
      )
    }

    void carregarLeis()
  }, [router])

  const leisFiltradas = useMemo(() => {
    const termo = textoBusca(busca).trim()
    if (!termo) return leis

    return leis.filter((lei) =>
      [lei.slug, lei.apelido, lei.titulo, lei.categoriaLabel]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(termo)
    )
  }, [busca, leis])

  const grupos = useMemo(() => {
    return leisFiltradas.reduce<Record<string, LeiItem[]>>((acc, lei) => {
      if (!acc[lei.categoriaLabel]) acc[lei.categoriaLabel] = []
      acc[lei.categoriaLabel].push(lei)
      return acc
    }, {})
  }, [leisFiltradas])

  function scrollCategoria(categoria: string, direcao: "left" | "right") {
    const el = scrollRefs.current[categoria]
    if (!el) return

    el.scrollBy({
      left: direcao === "left" ? -420 : 420,
      behavior: "smooth",
    })
  }

  function onMouseDown(e: MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget

    dragState.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    }

    setIsDragging(false)
  }

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!dragState.current.isDown) return

    e.preventDefault()

    const el = e.currentTarget
    const x = e.pageX - el.offsetLeft
    const walk = (x - dragState.current.startX) * 1.4

    if (Math.abs(walk) > 6) {
      setIsDragging(true)
    }

    el.scrollLeft = dragState.current.scrollLeft - walk
  }

  function stopDragging() {
    dragState.current.isDown = false

    setTimeout(() => {
      setIsDragging(false)
    }, 0)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8 flex justify-end">
          <Button
            variant="outline"
            className="hover:border-black hover:bg-black hover:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-black"
            asChild
          >
            <Link href="/perfil">
              <UserRound className="size-4" />
              Perfil
            </Link>
          </Button>
        </div>

        <header className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-3 text-[10px] font-bold tracking-[0.45em] text-indigo-500 uppercase">
            Minha Legislação
          </p>

          <h1 className="font-serif text-5xl font-black tracking-[-0.06em] md:text-7xl">
            VADE MECUM
          </h1>

          <p className="mt-4 text-sm text-muted-foreground">
            Escolha uma legislação para leitura organizada.
          </p>

          <div className="mx-auto mt-8 flex h-12 max-w-md items-center gap-3 rounded-xl border bg-card px-4 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar lei..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </header>

        {carregando && (
          <p className="text-center text-sm text-muted-foreground">
            Carregando documentos...
          </p>
        )}

        {erro && !carregando && (
          <p className="text-center text-sm text-red-600">{erro}</p>
        )}

        {!erro && !carregando && leis.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum documento disponível para este usuário.
          </p>
        )}

        <div className="space-y-16">
          {Object.entries(grupos).map(([categoria, itens]) => (
            <section key={categoria} className="mx-auto max-w-5xl">
              <div className="mb-5 flex items-center justify-between px-1">
                <div>
                  <h2 className="text-[17px] font-semibold tracking-[-0.03em]">
                    {categoria}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {itens.length} {itens.length === 1 ? "lei" : "leis"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollCategoria(categoria, "left")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:bg-foreground hover:text-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollCategoria(categoria, "right")}
                    className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition hover:bg-foreground hover:text-background"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div
                ref={(el) => {
                  scrollRefs.current[categoria] = el
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
                className="no-scrollbar flex cursor-grab gap-8 overflow-x-auto scroll-smooth pb-7 select-none active:cursor-grabbing"
              >
                {itens.map((lei) => (
                  <Link
                    key={`${lei.categoria}-${lei.slug}`}
                    href={`/lei/${lei.slug}`}
                    draggable={false}
                    onClick={(e) => {
                      if (isDragging) e.preventDefault()
                    }}
                    className="group shrink-0"
                  >
                    <div
                      className={[
                        "relative h-[270px] w-[190px] overflow-hidden rounded-[7px] bg-gradient-to-br p-5",
                        "shadow-[0_18px_42px_rgba(0,0,0,0.18)] transition duration-300",
                        "group-hover:-translate-y-2 group-hover:shadow-[0_28px_65px_rgba(0,0,0,0.24)]",
                        lei.cor,
                      ].join(" ")}
                    >
                      <div className="absolute inset-x-0 top-0 h-8 bg-white/15" />

                      <p className="mt-2 mb-6 text-[10px] font-bold tracking-[0.28em] text-white/70 uppercase">
                        {categoria}
                      </p>

                      <h3 className="font-serif text-[16px] leading-[1.05] font-black text-white">
                        {lei.apelido ||
                          lei.titulo ||
                          lei.slug.replaceAll("_", " ")}
                      </h3>

                      <div className="absolute right-0 bottom-0 left-0 flex h-14 items-center justify-between bg-white/18 px-5 backdrop-blur-[1px]">
                        <p className="max-w-[130px] truncate text-[11px] font-medium text-white/60">
                          {lei.slug}
                        </p>

                        <BookOpen className="h-4 w-4 text-white/60" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
