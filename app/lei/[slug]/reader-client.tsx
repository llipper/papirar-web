"use client"

import { useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  RiBookOpenLine,
  RiBrainLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiMapPinLine,
  RiStickyNoteLine,
} from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { TextoMarcado } from "@/components/lei/renderers"
import { arr, pegarConteudo, pegarDocumento, texto } from "@/lib/lei-core"
import {
  rotuloAlinea,
  rotuloArtigo,
  rotuloInciso,
  rotuloParagrafo,
  separarTituloHierarquico,
  textoPrincipal,
  tituloRubrica,
} from "@/lib/lei-format"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

type LegalDocumentRow = {
  slug: string
  bucket: string
  storage_path: string
  checksum_sha256: string
}

type SelectionMenu = {
  text: string
  x: number
  y: number
  anchorId?: string
  blocoIndex: number
  partIndex: number
  startOffset: number
  endOffset: number
}

type HighlightColor = "yellow" | "red" | "blue" | "green"

type ReaderAction = {
  id: string
  createdAt: string
  type: "highlight" | "note"
  text: string
  anchorId?: string
  blocoIndex: number
  partIndex: number
  startOffset: number
  endOffset: number
  color?: HighlightColor
  label?: string
  note?: string
}

type HighlightRow = {
  id: string
  color: HighlightColor
  selected_text: string
  anchor_id?: string | null
  bloco_index: number
  part_index: number
  start_offset: number
  end_offset: number
  created_at: string
}

type NoteRow = {
  id: string
  selected_text: string
  note: string
  anchor_id?: string | null
  bloco_index: number
  part_index: number
  start_offset: number
  end_offset: number
  created_at: string
}

type ExplanationPayload = {
  resumo?: {
    titulo?: string
    texto?: string
  }
  explicacao?: {
    titulo?: string
    texto?: string
  }
  termosImportantes?: Array<{
    termo?: string
    significado?: string
  }>
  passoAPasso?: string[]
  exemploPratico?: {
    titulo?: string
    situacao?: string
    conclusao?: string
  }
  exemploConcurso?: {
    titulo?: string
    situacao?: string
    resposta?: string
    explicacao?: string
  }
  pegadinha?: {
    titulo?: string
    afirmacao?: string
    gabarito?: string
    explicacao?: string
  }
  memorize?: {
    titulo?: string
    frase?: string
  }
}

const highlightLabels = {
  yellow: "Importante",
  red: "Cai muito",
  blue: "Revisar",
  green: "Dominado",
} satisfies Record<HighlightColor, string>

function getHighlightLabel(color: HighlightColor) {
  return highlightLabels[color]
}

function getTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Array<{ node: Text; start: number; end: number }> = []
  let fullText = ""
  let currentNode = walker.nextNode()

  while (currentNode) {
    const node = currentNode as Text
    const start = fullText.length
    fullText += node.data
    nodes.push({ node, start, end: fullText.length })
    currentNode = walker.nextNode()
  }

  return { fullText, nodes }
}

function getBoundary(
  nodes: Array<{ node: Text; start: number; end: number }>,
  offset: number,
  type: "start" | "end"
) {
  const node = nodes.find((item) =>
    type === "start"
      ? offset >= item.start && offset < item.end
      : offset > item.start && offset <= item.end
  )

  if (node) {
    return { node: node.node, offset: offset - node.start }
  }

  const fallback = nodes.at(type === "start" ? 0 : -1)
  if (!fallback) return null

  return {
    node: fallback.node,
    offset: type === "start" ? 0 : fallback.node.data.length,
  }
}

function getReaderPartElement(node: Node | null) {
  const element =
    node instanceof HTMLElement ? node : node?.parentElement || null

  return element?.closest<HTMLElement>("[data-reader-block-index]") || null
}

function getSelectionPosition(partElement: HTMLElement, range: Range) {
  const rawText = range.toString()
  const text = rawText.trim()
  const leadingTrimmed = rawText.length - rawText.trimStart().length
  const before = range.cloneRange()

  before.selectNodeContents(partElement)
  before.setEnd(range.startContainer, range.startOffset)

  const startOffset = before.toString().length + leadingTrimmed

  return {
    text,
    anchorId: partElement.dataset.readerAnchorId || undefined,
    blocoIndex: Number(partElement.dataset.readerBlockIndex || 0),
    partIndex: Number(partElement.dataset.readerPartIndex || 0),
    startOffset,
    endOffset: startOffset + text.length,
  }
}

const explanationTabs = [
  { key: "resumo", label: "Resumo" },
  { key: "explicacao", label: "Explicacao" },
  { key: "termos", label: "Termos" },
  { key: "exemplo", label: "Exemplo" },
  { key: "prova", label: "Prova" },
  { key: "memorize", label: "Memorize" },
]

function parseExplanationJson(explanation: string): ExplanationPayload | null {
  try {
    return JSON.parse(explanation) as ExplanationPayload
  } catch {
    const match = explanation.match(/\{[\s\S]*\}/)
    if (!match) return null

    try {
      return JSON.parse(match[0]) as ExplanationPayload
    } catch {
      return null
    }
  }
}

function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return firstStart < secondEnd && secondStart < firstEnd
}

function normalizeReaderActions(actions: ReaderAction[]) {
  return actions
    .slice()
    .sort((a, b) => {
      const startDiff = a.startOffset - b.startOffset
      if (startDiff !== 0) return startDiff

      const lengthDiff =
        b.endOffset - b.startOffset - (a.endOffset - a.startOffset)
      if (lengthDiff !== 0) return lengthDiff

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
    .reduce<ReaderAction[]>((normalized, action) => {
      if (action.type !== "highlight") return [...normalized, action]

      const overlappingIndex = normalized.findIndex(
        (item) =>
          item.type === "highlight" &&
          (action.anchorId && item.anchorId
            ? item.anchorId === action.anchorId
            : item.blocoIndex === action.blocoIndex &&
              item.partIndex === action.partIndex) &&
          rangesOverlap(
            action.startOffset,
            action.endOffset,
            item.startOffset,
            item.endOffset
          )
      )

      if (overlappingIndex < 0) return [...normalized, action]

      const existing = normalized[overlappingIndex]
      const actionLength = action.endOffset - action.startOffset
      const existingLength = existing.endOffset - existing.startOffset
      const shouldReplace =
        actionLength > existingLength ||
        (actionLength === existingLength &&
          new Date(action.createdAt).getTime() >
            new Date(existing.createdAt).getTime())

      if (!shouldReplace) return normalized

      return normalized.map((item, index) =>
        index === overlappingIndex ? action : item
      )
    }, [])
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
}

const highlightOptions: Array<{
  color: HighlightColor
  label: string
  className: string
}> = [
  {
    color: "yellow",
    label: getHighlightLabel("yellow"),
    className: "bg-yellow-200 text-yellow-950",
  },
  {
    color: "red",
    label: getHighlightLabel("red"),
    className: "bg-red-200 text-red-950",
  },
  {
    color: "blue",
    label: getHighlightLabel("blue"),
    className: "bg-blue-200 text-blue-950",
  },
  {
    color: "green",
    label: getHighlightLabel("green"),
    className: "bg-emerald-200 text-emerald-950",
  },
]

async function sha256(buffer: ArrayBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function getDocumentoTitulo(json: unknown) {
  if (!json || typeof json !== "object") return ""

  const documento = "documento" in json ? (json.documento as unknown) : json
  if (!documento || typeof documento !== "object" || !("titulo" in documento)) {
    return ""
  }

  return typeof documento.titulo === "string" ? documento.titulo : ""
}

type ReaderBlockType =
  | "corpo"
  | "preambulo"
  | "parte"
  | "livro"
  | "titulo"
  | "capitulo"
  | "secao"
  | "subsecao"
  | "artigo"
  | "rubrica"

type ReaderBlock = {
  text: string
  type: ReaderBlockType
  anchorIds?: string[]
}

function normalizarTextoLei(value: unknown) {
  let textValue = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")

  if (textValue.includes("\\n")) {
    textValue = textValue.replace(/\\n\\n/g, "\n\n").replace(/\\n/g, "\n")
  }

  return textValue
    .replace(
      /\s*\((?:Reda[cç][aã]o|Inclu[ií]do|Inclu[ií]da|Vig[eê]ncia|Vigencia|Par[aá]grafo com reda[cç][aã]o|Vide)[^)]*\)/gi,
      ""
    )
    .trim()
}

function textoVetadoLei(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[().]/g, "")
    .trim()

  return normalized === "vetado"
}

function itemVetadoLei(item: unknown) {
  if (!item || typeof item !== "object") return false
  const value = normalizarTextoLei(textoPrincipal(item))

  return value ? textoVetadoLei(value) : false
}

function addReaderBlock(
  blocks: ReaderBlock[],
  value: unknown,
  type: ReaderBlockType = "corpo",
  anchorIds?: string[]
) {
  const blockText = normalizarTextoLei(value)
  if (!blockText) return

  blocks.push({ text: blockText, type, anchorIds })
}

function nodeAnchor(item: any, fallback: string) {
  if (typeof item?.id === "string" && item.id.trim()) return item.id.trim()
  if (item?.numero !== undefined && item?.numero !== null) {
    return `${fallback}_${String(item.numero).trim().toLowerCase()}`
  }
  if (item?.letra)
    return `${fallback}_${String(item.letra).replace(/\W+/g, "")}`
  return fallback
}

function joinAnchor(parent: string, child: string) {
  return parent ? `${parent}/${child}` : child
}

function tituloComNumero(
  item: any,
  label: "PARTE" | "TÍTULO" | "CAPÍTULO" | "SEÇÃO"
) {
  const title = normalizarTextoLei(item?.titulo)
  const number = normalizarTextoLei(item?.numero)
  if (!number) return title

  const prefix = `${label} ${number}`
  if (!title) return prefix

  const titleAscii = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
  const prefixAscii = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()

  return titleAscii.startsWith(prefixAscii) ? title : `${prefix} - ${title}`
}

function tipoTituloHierarquico(
  value: string,
  fallback: ReaderBlockType
): ReaderBlockType {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

  if (normalized.startsWith("livro ")) return "livro"
  if (normalized.startsWith("titulo ")) return "titulo"
  if (normalized.startsWith("capitulo ")) return "capitulo"
  if (normalized.startsWith("secao ")) return "secao"
  if (normalized.startsWith("subsecao ")) return "subsecao"

  return fallback
}

function appendTituloHierarquico(
  blocks: ReaderBlock[],
  value: unknown,
  fallback: ReaderBlockType
) {
  const title = normalizarTextoLei(value)
  if (!title) return

  for (const part of title.split("/")) {
    const titlePart = normalizarTextoLei(part)
    if (!titlePart) continue
    addReaderBlock(
      blocks,
      titlePart,
      tipoTituloHierarquico(titlePart, fallback)
    )
  }
}

type ReaderPart = {
  text: string
  anchorId: string
}

function appendDispositivos(
  parts: ReaderPart[],
  value: unknown,
  label: (item: any) => string,
  parentAnchor: string,
  fallback: string
) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object" || itemVetadoLei(item)) continue

    const anchorId = joinAnchor(parentAnchor, nodeAnchor(item, fallback))
    const lines: string[] = []
    const rubrica = normalizarTextoLei(tituloRubrica(item))
    if (rubrica) lines.push(rubrica)

    const body = normalizarTextoLei(textoPrincipal(item))
    const prefix = normalizarTextoLei(label(item))
    if (body) lines.push(prefix ? `${prefix} ${body}`.trim() : body)

    const nested: ReaderPart[] = []
    appendDispositivos(nested, item.incisos, rotuloInciso, anchorId, "inciso")
    appendDispositivos(
      nested,
      item.paragrafos,
      rotuloParagrafo,
      anchorId,
      "paragrafo"
    )
    appendDispositivos(nested, item.alineas, rotuloAlinea, anchorId, "alinea")

    if (lines.length) parts.push({ text: lines.join("\n\n"), anchorId })
    parts.push(...nested)
  }
}

function appendArtigos(blocks: ReaderBlock[], value: unknown) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object" || itemVetadoLei(item)) continue

    const articleAnchor = nodeAnchor(item, "artigo")
    addReaderBlock(blocks, rotuloArtigo(item), "artigo", [articleAnchor])
    addReaderBlock(blocks, tituloRubrica(item), "rubrica", [
      joinAnchor(articleAnchor, "rubrica"),
    ])

    const parts: ReaderPart[] = []
    const body = normalizarTextoLei(textoPrincipal(item))
    if (body) parts.push({ text: body, anchorId: articleAnchor })

    appendDispositivos(
      parts,
      item.incisos,
      rotuloInciso,
      articleAnchor,
      "inciso"
    )
    appendDispositivos(
      parts,
      item.paragrafos,
      rotuloParagrafo,
      articleAnchor,
      "paragrafo"
    )
    appendDispositivos(
      parts,
      item.alineas,
      rotuloAlinea,
      articleAnchor,
      "alinea"
    )

    if (parts.length) {
      addReaderBlock(
        blocks,
        parts.map((part) => part.text).join("\n\n"),
        "corpo",
        parts.map((part) => part.anchorId)
      )
    }
  }
}

function appendSecoes(blocks: ReaderBlock[], value: unknown) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object") continue
    appendTituloHierarquico(blocks, tituloComNumero(item, "SEÇÃO"), "secao")
    appendArtigos(blocks, item.artigos)
  }
}

function appendCapitulos(blocks: ReaderBlock[], value: unknown) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object") continue
    appendTituloHierarquico(
      blocks,
      tituloComNumero(item, "CAPÍTULO"),
      "capitulo"
    )
    appendSecoes(blocks, item.secoes)
    appendArtigos(blocks, item.artigos)
  }
}

function appendTitulos(blocks: ReaderBlock[], value: unknown) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object") continue
    appendTituloHierarquico(blocks, tituloComNumero(item, "TÍTULO"), "titulo")
    appendCapitulos(blocks, item.capitulos)
    appendSecoes(blocks, item.secoes)
    appendArtigos(blocks, item.artigos)
  }
}

function appendPartes(blocks: ReaderBlock[], value: unknown) {
  for (const item of arr(value)) {
    if (!item || typeof item !== "object") continue

    addReaderBlock(blocks, tituloComNumero(item, "PARTE"), "parte")
    appendTitulos(blocks, item.titulos)
    appendCapitulos(blocks, item.capitulos)
    appendSecoes(blocks, item.secoes)
    appendArtigos(blocks, item.artigos)
  }
}

function appendPreambulo(blocks: ReaderBlock[], value: unknown) {
  if (!value || typeof value !== "object") return

  addReaderBlock(blocks, (value as any).titulo, "preambulo")

  for (const item of arr((value as any).considerandos)) {
    addReaderBlock(blocks, textoPrincipal(item))
  }
}

function appendDecreto(blocks: ReaderBlock[], value: unknown) {
  if (!value || typeof value !== "object") return

  appendArtigos(blocks, (value as any).artigos)
}

function getReaderBlocks(lei: unknown) {
  const documento = pegarDocumento(lei)
  const conteudo = pegarConteudo(lei)
  const blocks: ReaderBlock[] = []
  const rawBlocks = arr(conteudo?.blocos)

  if (rawBlocks.length) {
    for (const item of rawBlocks) {
      if (item && typeof item === "object") {
        const parts = arr((item as any).partes)
          .map((part) => normalizarTextoLei(part))
          .filter(Boolean)

        if (parts.length) {
          addReaderBlock(blocks, parts.join("\n\n"))
          continue
        }

        addReaderBlock(blocks, (item as any).texto)
      } else {
        addReaderBlock(blocks, item)
      }
    }

    return blocks
  }

  appendDecreto(blocks, documento?.decreto)
  appendPreambulo(blocks, conteudo?.preambulo || documento?.preambulo)
  appendPartes(blocks, conteudo?.partes)

  if (conteudo !== documento) {
    appendPartes(blocks, documento?.partes)
  }

  appendTitulos(blocks, conteudo?.titulos)
  appendCapitulos(blocks, conteudo?.capitulos)
  appendSecoes(blocks, conteudo?.secoes)
  appendArtigos(blocks, conteudo?.artigos)

  return blocks
}

function splitReaderParts(block: ReaderBlock) {
  return block.text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n\n+/)
    .filter(Boolean)
}

function readerBlockClassName(type: ReaderBlockType) {
  if (type === "parte")
    return "my-10 text-center text-2xl font-bold uppercase tracking-widest text-foreground"
  if (type === "livro" || type === "titulo")
    return "mt-12 text-center text-lg font-bold uppercase tracking-[0.18em] text-foreground"
  if (type === "capitulo")
    return "mt-10 text-center text-base font-bold uppercase tracking-[0.18em] text-foreground"
  if (type === "secao" || type === "subsecao")
    return "mt-8 text-center text-sm font-bold uppercase tracking-[0.16em] text-foreground"
  if (type === "preambulo")
    return "mt-8 text-center text-lg font-bold uppercase tracking-widest text-foreground"
  if (type === "artigo") return "mt-8 text-lg font-bold text-foreground"
  if (type === "rubrica")
    return "mt-3 inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"

  return "mt-4 text-base leading-8 text-muted-foreground"
}

function partClassName(type: ReaderBlockType, textValue: string) {
  if (type !== "corpo") return readerBlockClassName(type)

  const trimmed = textValue.trim()
  if (/^(§\s*\d|Parágrafo único)/i.test(trimmed)) {
    return "mt-5 border-l-2 pl-5 text-sm leading-7 text-muted-foreground"
  }
  if (/^[IVXLCDM]+\b/.test(trimmed)) {
    return "mt-4 border-l pl-5 text-sm leading-7 text-muted-foreground"
  }
  if (/^[a-z]\)/.test(trimmed)) {
    return "mt-3 border-l pl-5 text-sm leading-7 text-muted-foreground"
  }

  return readerBlockClassName(type)
}

function RenderCanonicalDocumento({ lei }: { lei: unknown }) {
  const documento = pegarDocumento(lei)
  const conteudo = pegarConteudo(lei)
  const blocks = getReaderBlocks(lei)

  return (
    <>
      <header className="mb-12 text-center">
        <Badge variant="outline" className="mb-4">
          Papirar
        </Badge>

        {texto(documento?.titulo) && (
          <h1 className="text-3xl font-bold tracking-tight">
            {documento.titulo}
          </h1>
        )}

        {documento?.decreto?.numero && (
          <p className="mt-3 text-sm text-muted-foreground">
            Decreto n. {documento.decreto.numero}
            {documento.decreto.data ? ` - ${documento.decreto.data}` : ""}
          </p>
        )}

        {documento?.lei?.numero && (
          <p className="mt-3 text-sm text-muted-foreground">
            Lei n. {documento.lei.numero}
            {documento.lei.data ? ` - ${documento.lei.data}` : ""}
          </p>
        )}

        {texto(conteudo?.apelido) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {conteudo.apelido}
          </p>
        )}
      </header>

      <Separator className="mb-10" />

      <article className="mx-auto max-w-4xl">
        {blocks.map((block, blocoIndex) => {
          const parts = splitReaderParts(block)

          return (
            <div key={`${blocoIndex}-${block.text.slice(0, 16)}`}>
              {parts.map((part, partIndex) => {
                const className = partClassName(block.type, part)
                const anchorId = block.anchorIds?.[partIndex]
                const content =
                  block.type === "parte" ||
                  block.type === "livro" ||
                  block.type === "titulo" ||
                  block.type === "capitulo" ||
                  block.type === "secao" ||
                  block.type === "subsecao" ? (
                    separarTituloHierarquico(part).map((title, index) => (
                      <span key={`${title.texto}-${index}`} className="block">
                        {title.rotulo || title.texto}
                        {title.descricao && (
                          <span className="mt-2 block text-sm tracking-[0.14em]">
                            {title.descricao}
                          </span>
                        )}
                      </span>
                    ))
                  ) : (
                    <TextoMarcado valor={part} />
                  )

                if (block.type === "rubrica") {
                  return (
                    <span
                      key={`${blocoIndex}-${partIndex}`}
                      data-reader-block-index={blocoIndex}
                      data-reader-part-index={partIndex}
                      data-reader-anchor-id={anchorId}
                      className={className}
                    >
                      {content}
                    </span>
                  )
                }

                return (
                  <p
                    key={`${blocoIndex}-${partIndex}`}
                    data-reader-block-index={blocoIndex}
                    data-reader-part-index={partIndex}
                    data-reader-anchor-id={anchorId}
                    className={className}
                  >
                    {content}
                  </p>
                )
              })}
            </div>
          )
        })}
      </article>
    </>
  )
}

function mapRemoteReaderActions(
  highlights: HighlightRow[] = [],
  notes: NoteRow[] = []
) {
  return [
    ...highlights.map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      type: "highlight" as const,
      text: item.selected_text,
      anchorId: item.anchor_id || undefined,
      blocoIndex: item.bloco_index,
      partIndex: item.part_index,
      startOffset: item.start_offset,
      endOffset: item.end_offset,
      color: item.color,
      label: getHighlightLabel(item.color),
    })),
    ...notes.map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      type: "note" as const,
      text: item.selected_text,
      anchorId: item.anchor_id || undefined,
      blocoIndex: item.bloco_index,
      partIndex: item.part_index,
      startOffset: item.start_offset,
      endOffset: item.end_offset,
      note: item.note,
    })),
  ]
}

function readLocalReaderActions(storageKey: string) {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as ReaderAction[]) : []
  } catch {
    return []
  }
}

function mergeReaderActions(
  storageKey: string,
  remoteActions: ReaderAction[],
  includeLocal = true
) {
  const mergedActions = new Map<string, ReaderAction>()
  const localActions = includeLocal ? readLocalReaderActions(storageKey) : []

  for (const action of [...localActions, ...remoteActions]) {
    mergedActions.set(action.id, action)
  }

  const actions = normalizeReaderActions(Array.from(mergedActions.values()))
  localStorage.setItem(storageKey, JSON.stringify(actions))

  return actions
}

async function loadRemoteReaderActions(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  slug: string
) {
  const { data: highlights, error: highlightsError } = await supabase
    .from("lei_highlights")
    .select(
      "id,color,selected_text,anchor_id,bloco_index,part_index,start_offset,end_offset,created_at"
    )
    .eq("lei_id", slug)
    .order("created_at", { ascending: true })

  const { data: notes, error: notesError } = await supabase
    .from("lei_notes")
    .select(
      "id,selected_text,note,anchor_id,bloco_index,part_index,start_offset,end_offset,created_at"
    )
    .eq("lei_id", slug)
    .order("created_at", { ascending: true })

  if (highlightsError || notesError) return null

  return mapRemoteReaderActions(
    (highlights || []) as HighlightRow[],
    (notes || []) as NoteRow[]
  )
}

export default function LeiReaderClient({ slug }: { slug: string }) {
  const router = useRouter()
  const readerRef = useRef<HTMLDivElement>(null)
  const selectionMenuRef = useRef<HTMLDivElement>(null)
  const selectionRangeRef = useRef<Range | null>(null)
  const storageKey = `papirar:lei:${slug}:marcacoes`
  const [lei, setLei] = useState<unknown>(null)
  const [leiTitle, setLeiTitle] = useState("")
  const [userId, setUserId] = useState("")
  const [erro, setErro] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(null)
  const [readerActions, setReaderActions] = useState<ReaderAction[]>(() => {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? (JSON.parse(stored) as ReaderAction[]) : []
    } catch {
      return []
    }
  })
  const [annotationsOpen, setAnnotationsOpen] = useState(false)
  const [annotationsTab, setAnnotationsTab] = useState<"highlights" | "notes">(
    "notes"
  )
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState("")
  const [explainOpen, setExplainOpen] = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explanation, setExplanation] = useState("")
  const [actionMessage, setActionMessage] = useState("")

  useEffect(() => {
    async function carregarLei() {
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

      setUserId(session.user.id)

      const { data: documento, error: documentoError } = await supabase
        .from("legal_documents")
        .select("slug,bucket,storage_path,checksum_sha256")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle()

      if (documentoError || !documento) {
        setErro("Documento indisponível para este usuário.")
        setCarregando(false)
        return
      }

      const indice = documento as LegalDocumentRow
      const { data: arquivo, error: arquivoError } = await supabase.storage
        .from(indice.bucket)
        .download(indice.storage_path)

      if (arquivoError || !arquivo) {
        setErro("Nao foi possivel baixar o documento.")
        setCarregando(false)
        return
      }

      const buffer = await arquivo.arrayBuffer()
      const checksum = await sha256(buffer)

      if (checksum !== indice.checksum_sha256) {
        console.warn("Checksum do documento diferente do índice.", {
          slug,
          esperado: indice.checksum_sha256,
          recebido: checksum,
        })
      }

      const json = JSON.parse(new TextDecoder().decode(buffer))

      setLei(json)
      setLeiTitle(getDocumentoTitulo(json))
      setCarregando(false)

      const remoteActions = await loadRemoteReaderActions(supabase, slug)
      if (remoteActions) {
        setReaderActions(mergeReaderActions(storageKey, remoteActions, false))
      }
    }

    void carregarLei()
  }, [router, slug, storageKey])

  useEffect(() => {
    if (!userId) return

    const supabase = createSupabaseBrowserClient()
    let disposed = false
    let reloadTimeout: number | undefined

    async function reloadReaderActions() {
      const remoteActions = await loadRemoteReaderActions(supabase, slug)
      if (!remoteActions) return
      if (disposed) return

      setReaderActions(mergeReaderActions(storageKey, remoteActions, false))
    }

    function scheduleReload() {
      if (reloadTimeout) window.clearTimeout(reloadTimeout)
      reloadTimeout = window.setTimeout(() => {
        void reloadReaderActions()
      }, 180)
    }

    const channel = supabase
      .channel(`lei-actions:${slug}:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lei_highlights",
        },
        scheduleReload
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lei_notes",
        },
        scheduleReload
      )
      .subscribe()

    return () => {
      disposed = true
      if (reloadTimeout) window.clearTimeout(reloadTimeout)
      void supabase.removeChannel(channel)
    }
  }, [slug, storageKey, userId])

  useEffect(() => {
    if (!actionMessage) return

    const timeout = window.setTimeout(() => setActionMessage(""), 2200)
    return () => window.clearTimeout(timeout)
  }, [actionMessage])

  useLayoutEffect(() => {
    if (!selectionMenu || !selectionMenuRef.current) return

    const rect = selectionMenuRef.current.getBoundingClientRect()
    let nextX = selectionMenu.x
    let nextY = selectionMenu.y
    const padding = 10

    if (rect.left < padding) nextX += padding - rect.left
    if (rect.right > window.innerWidth - padding) {
      nextX -= rect.right - (window.innerWidth - padding)
    }
    if (rect.top < padding) nextY += padding - rect.top

    if (
      Math.abs(nextX - selectionMenu.x) > 0.5 ||
      Math.abs(nextY - selectionMenu.y) > 0.5
    ) {
      setSelectionMenu({ ...selectionMenu, x: nextX, y: nextY })
    }
  }, [selectionMenu])

  useEffect(() => {
    if (!readerRef.current) return

    const reader = readerRef.current
    const existingReaderMarks = Array.from(
      reader.querySelectorAll("[data-reader-action-id]")
    )

    for (const element of existingReaderMarks) {
      if (element instanceof HTMLButtonElement) {
        element.remove()
      } else {
        element.replaceWith(...Array.from(element.childNodes))
      }
    }

    reader.normalize()

    const highlightActions = readerActions.filter(
      (action) => action.type === "highlight" && action.color
    )
    const noteActions = readerActions.filter((action) => action.type === "note")

    for (const action of [...highlightActions, ...noteActions]) {
      const partElement = action.anchorId
        ? reader.querySelector<HTMLElement>(
            `[data-reader-anchor-id="${CSS.escape(action.anchorId)}"]`
          )
        : reader.querySelector<HTMLElement>(
            `[data-reader-block-index="${action.blocoIndex}"][data-reader-part-index="${action.partIndex}"]`
          )
      const markRoot = partElement || reader
      const { fullText, nodes } = getTextNodes(markRoot)
      const text = action.text
      let startOffset =
        fullText.slice(action.startOffset, action.endOffset) === text
          ? action.startOffset
          : -1
      if (!partElement && startOffset < 0) {
        startOffset = fullText.indexOf(text, action.startOffset)
        if (startOffset < 0) startOffset = fullText.indexOf(text)
      }
      if (startOffset < 0) continue

      const endOffset = startOffset + text.length
      const startNode = getBoundary(nodes, startOffset, "start")
      const endNode = getBoundary(nodes, endOffset, "end")
      const option =
        action.type === "highlight" && action.color
          ? highlightOptions.find((item) => item.color === action.color)
          : undefined

      if (!startNode || !endNode) continue

      const range = document.createRange()
      range.setStart(startNode.node, startNode.offset)
      range.setEnd(endNode.node, endNode.offset)

      const wrapper =
        action.type === "highlight"
          ? document.createElement("mark")
          : document.createElement("span")
      wrapper.dataset.readerActionId = action.id

      if (action.type === "highlight" && option) {
        wrapper.dataset.leiHighlight = action.color
        wrapper.className = `${option.className} scroll-mt-24 rounded px-0.5`
      } else {
        wrapper.dataset.leiNote = "true"
        wrapper.className =
          "scroll-mt-24 rounded px-0.5 underline decoration-border decoration-dotted underline-offset-4"
      }

      try {
        range.surroundContents(wrapper)
      } catch {
        const content = range.extractContents()
        wrapper.appendChild(content)
        range.insertNode(wrapper)
      }

      if (action.type === "note") {
        const noteButton = document.createElement("button")
        noteButton.type = "button"
        noteButton.dataset.readerActionId = action.id
        noteButton.dataset.leiNoteButton = "true"
        noteButton.className =
          "mx-1 inline-flex size-5 align-middle items-center justify-center rounded-full border bg-background text-[10px] text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
        noteButton.setAttribute("aria-label", "Abrir anotacao deste trecho")
        noteButton.title = action.note || "Anotacao"
        noteButton.innerHTML =
          '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M5 3H19C19.5523 3 20 3.44772 20 4V22L16 19H5C4.44772 19 4 18.5523 4 18V4C4 3.44772 4.44772 3 5 3ZM6 5V17H16.6667L18 18V5H6Z"/></svg>'
        noteButton.addEventListener("click", () => {
          setAnnotationsTab("notes")
          setAnnotationsOpen(true)
        })
        wrapper.after(noteButton)
      }
    }
  }, [lei, readerActions])

  async function saveReaderAction(
    action: Omit<ReaderAction, "id" | "createdAt">
  ) {
    const startOffset = Math.max(0, action.startOffset)
    const endOffset = Math.max(startOffset + 1, action.endOffset)
    const selectedText = action.text.slice(0, 2000)
    const overlappingHighlights =
      action.type === "highlight"
        ? readerActions.filter(
            (item) =>
              item.type === "highlight" &&
              (action.anchorId && item.anchorId
                ? item.anchorId === action.anchorId
                : item.blocoIndex === action.blocoIndex &&
                  item.partIndex === action.partIndex) &&
              rangesOverlap(
                startOffset,
                endOffset,
                item.startOffset,
                item.endOffset
              )
          )
        : []

    if (!userId) {
      const nextAction = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...action,
        text: selectedText,
        startOffset,
        endOffset,
      }
      const overlappingIds = new Set(
        overlappingHighlights.map((item) => item.id)
      )
      const actions = normalizeReaderActions([
        ...readerActions.filter((item) => !overlappingIds.has(item.id)),
        nextAction,
      ])

      localStorage.setItem(storageKey, JSON.stringify(actions))
      setReaderActions(actions)
      return false
    }

    const supabase = createSupabaseBrowserClient()

    if (overlappingHighlights.length > 0) {
      const overlappingIds = overlappingHighlights.map((item) => item.id)

      await supabase.from("lei_highlights").delete().in("id", overlappingIds)
    }

    if (action.type === "highlight") {
      const { data, error } = await supabase
        .from("lei_highlights")
        .insert({
          user_id: userId,
          lei_id: slug,
          anchor_id: action.anchorId ?? null,
          bloco_index: action.blocoIndex,
          part_index: action.partIndex,
          start_offset: startOffset,
          end_offset: endOffset,
          color: action.color,
          selected_text: selectedText,
        })
        .select("id,created_at")
        .single()

      if (!error && data) {
        setReaderActions((actions) => {
          const overlappingIds = new Set(
            overlappingHighlights.map((item) => item.id)
          )
          const nextActions = normalizeReaderActions([
            ...actions.filter((item) => !overlappingIds.has(item.id)),
            {
              ...action,
              id: data.id as string,
              createdAt: data.created_at as string,
              text: selectedText,
              anchorId: action.anchorId,
              blocoIndex: action.blocoIndex,
              partIndex: action.partIndex,
              startOffset,
              endOffset,
            },
          ])

          localStorage.setItem(storageKey, JSON.stringify(nextActions))
          return nextActions
        })
        return true
      }
    }

    if (action.type === "note") {
      const { data, error } = await supabase
        .from("lei_notes")
        .insert({
          user_id: userId,
          lei_id: slug,
          lei_title: leiTitle,
          anchor_id: action.anchorId ?? null,
          bloco_index: action.blocoIndex,
          part_index: action.partIndex,
          start_offset: startOffset,
          end_offset: endOffset,
          selected_text: selectedText,
          note: action.note?.slice(0, 4000) || "",
        })
        .select("id,created_at")
        .single()

      if (!error && data) {
        setReaderActions((actions) => {
          const nextActions = normalizeReaderActions([
            ...actions,
            {
              ...action,
              id: data.id as string,
              createdAt: data.created_at as string,
              text: selectedText,
              anchorId: action.anchorId,
              blocoIndex: action.blocoIndex,
              partIndex: action.partIndex,
              startOffset,
              endOffset,
            },
          ])

          localStorage.setItem(storageKey, JSON.stringify(nextActions))
          return nextActions
        })
        return true
      }
    }

    const overlappingIds = new Set(overlappingHighlights.map((item) => item.id))
    const nextAction = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...action,
      text: selectedText,
      startOffset,
      endOffset,
    }
    const actions = normalizeReaderActions([
      ...readerActions.filter((item) => !overlappingIds.has(item.id)),
      nextAction,
    ])

    localStorage.setItem(storageKey, JSON.stringify(actions))
    setReaderActions(actions)
    return false
  }

  async function deleteReaderAction(action: ReaderAction) {
    const supabase = createSupabaseBrowserClient()
    const table = action.type === "note" ? "lei_notes" : "lei_highlights"

    await supabase.from(table).delete().eq("id", action.id)

    const actions = readerActions.filter((item) => item.id !== action.id)
    localStorage.setItem(storageKey, JSON.stringify(actions))
    setReaderActions(actions)
  }

  function scrollToReaderAction(action: ReaderAction) {
    const target = readerRef.current?.querySelector<HTMLElement>(
      `[data-reader-action-id="${action.id}"]`
    )

    if (!target) {
      setActionMessage("Trecho nao encontrado no texto carregado.")
      return
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" })
    target.classList.add("ring-2", "ring-ring", "ring-offset-2")
    window.setTimeout(() => {
      target.classList.remove("ring-2", "ring-ring", "ring-offset-2")
    }, 1600)
  }

  function clearSelection() {
    window.getSelection()?.removeAllRanges()
    selectionRangeRef.current = null
    setSelectionMenu(null)
  }

  function captureSelection() {
    const selection = window.getSelection()

    if (!selection || !readerRef.current || selection.rangeCount === 0) {
      setSelectionMenu(null)
      return
    }

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer

    if (!readerRef.current.contains(container)) {
      setSelectionMenu(null)
      return
    }

    const startPart = getReaderPartElement(range.startContainer)
    const endPart = getReaderPartElement(range.endContainer)

    if (!startPart || !endPart || startPart !== endPart) {
      setSelectionMenu(null)
      return
    }

    const position = getSelectionPosition(startPart, range)

    if (!position.text) {
      setSelectionMenu(null)
      return
    }

    const rect = range.getBoundingClientRect()
    selectionRangeRef.current = range.cloneRange()

    setSelectionMenu({
      text: position.text,
      x: Math.min(
        Math.max(rect.left + rect.width / 2, 12),
        window.innerWidth - 12
      ),
      y: Math.max(rect.top - 12, 8),
      anchorId: position.anchorId,
      blocoIndex: position.blocoIndex,
      partIndex: position.partIndex,
      startOffset: position.startOffset,
      endOffset: position.endOffset,
    })
  }

  async function applyHighlight(color: HighlightColor) {
    const range = selectionRangeRef.current
    const option = highlightOptions.find((item) => item.color === color)

    if (!range || !option) return

    const savedRemote = await saveReaderAction({
      type: "highlight",
      color,
      label: option.label,
      text: selectionMenu?.text || "",
      anchorId: selectionMenu?.anchorId,
      blocoIndex: selectionMenu?.blocoIndex || 0,
      partIndex: selectionMenu?.partIndex || 0,
      startOffset: selectionMenu?.startOffset || 0,
      endOffset:
        selectionMenu?.endOffset ||
        Math.max(1, selectionMenu?.text.length || 1),
    })
    setActionMessage(
      savedRemote
        ? `Marcado como ${option.label}.`
        : `Marcado como ${option.label} neste aparelho.`
    )
    setAnnotationsTab("highlights")
    clearSelection()
  }

  function openNote() {
    setNoteText("")
    setNoteOpen(true)
  }

  async function saveNote() {
    if (!selectionMenu?.text || !noteText.trim()) return

    const savedRemote = await saveReaderAction({
      type: "note",
      text: selectionMenu.text,
      note: noteText.trim(),
      anchorId: selectionMenu.anchorId,
      blocoIndex: selectionMenu.blocoIndex,
      partIndex: selectionMenu.partIndex,
      startOffset: selectionMenu.startOffset,
      endOffset: selectionMenu.endOffset,
    })
    setActionMessage(
      savedRemote ? "Anotacao salva." : "Anotacao salva neste aparelho."
    )
    setAnnotationsTab("notes")
    setNoteOpen(false)
    clearSelection()
  }

  async function explainSelection() {
    if (!selectionMenu?.text) return

    setExplainOpen(true)
    setExplainLoading(true)
    setExplanation("")

    try {
      const response = await fetch("/api/explain-selection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectionMenu.text,
          documentSlug: slug,
        }),
      })

      const data = (await response.json()) as {
        explanation?: string
        error?: string
      }

      setExplanation(
        data.explanation || data.error || "Nao foi possivel explicar o trecho."
      )
    } catch {
      setExplanation(
        "Nao foi possivel conectar ao servico de explicacao agora."
      )
    } finally {
      setExplainLoading(false)
    }
  }

  if (carregando) {
    return (
      <main className="min-h-screen bg-background px-6 py-14 text-center text-sm text-muted-foreground">
        Carregando documento...
      </main>
    )
  }

  if (erro) {
    return (
      <main className="min-h-screen bg-background px-6 py-14 text-center text-sm text-destructive">
        {erro}
      </main>
    )
  }

  if (!lei) return null

  const explanationData = parseExplanationJson(explanation)
  const savedHighlights = readerActions.filter(
    (action) => action.type === "highlight"
  )
  const savedNotes = readerActions.filter((action) => action.type === "note")

  return (
    <main className="min-h-screen bg-background text-foreground">
      {selectionMenu && (
        <div
          ref={selectionMenuRef}
          className="fixed z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-full flex-wrap items-center gap-1 rounded-lg border bg-background p-1.5 shadow-lg"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
          role="toolbar"
          aria-label="Ações para o trecho selecionado"
        >
          {highlightOptions.map((option) => (
            <button
              key={option.color}
              type="button"
              onClick={() => applyHighlight(option.color)}
              className={`rounded-md px-2 py-1 text-xs font-medium ${option.className}`}
              title={option.label}
            >
              {option.label}
            </button>
          ))}

          <button
            type="button"
            onClick={openNote}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
          >
            <RiStickyNoteLine className="size-3.5" />
            Criar anotacao
          </button>

          <button
            type="button"
            onClick={explainSelection}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium"
          >
            <RiBrainLine className="size-3.5" />
            Explicacao
          </button>
        </div>
      )}

      {actionMessage && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-lg">
          <RiCheckLine className="size-4 text-emerald-600" />
          {actionMessage}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => setAnnotationsOpen(true)}
        className="fixed right-5 bottom-5 z-40 shadow-lg"
      >
        <RiStickyNoteLine className="size-4" />
        Estudo
        {readerActions.length > 0 && (
          <Badge
            variant="secondary"
            className="ml-1 h-5 min-w-5 rounded-full px-1.5"
          >
            {readerActions.length}
          </Badge>
        )}
      </Button>

      <Sheet open={annotationsOpen} onOpenChange={setAnnotationsOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5">
            <SheetTitle>Mapa de estudo</SheetTitle>
            <SheetDescription>
              Veja onde marcou, onde anotou e volte direto ao trecho.
            </SheetDescription>
          </SheetHeader>

          <Tabs
            value={annotationsTab}
            onValueChange={(value) =>
              setAnnotationsTab(value as "highlights" | "notes")
            }
            className="min-h-0 flex-1 gap-0"
          >
            <div className="border-b px-5 py-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="highlights">
                  Marcacoes
                  <Badge variant="secondary" className="ml-1">
                    {savedHighlights.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="notes">
                  Anotacoes
                  <Badge variant="secondary" className="ml-1">
                    {savedNotes.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <TabsContent value="highlights" className="m-0 p-5">
                {savedHighlights.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                    Nenhuma marcacao salva ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedHighlights
                      .slice()
                      .reverse()
                      .map((action) => (
                        <article
                          key={action.id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {action.label || "Marcacao"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Texto destacado
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-3 text-muted-foreground">
                                {action.text}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteReaderAction(action)}
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                              title="Remover marcacao"
                            >
                              <RiDeleteBinLine className="size-4" />
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => scrollToReaderAction(action)}
                          >
                            <RiMapPinLine className="size-4" />
                            Ir para trecho
                          </Button>
                        </article>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="notes" className="m-0 p-5">
                {savedNotes.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                    Nenhuma anotacao salva ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedNotes
                      .slice()
                      .reverse()
                      .map((action) => (
                        <article
                          key={action.id}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Anotacao</Badge>
                                <span className="text-xs text-muted-foreground">
                                  Indicada no texto
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-muted-foreground">
                                {action.text}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteReaderAction(action)}
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                              title="Remover anotacao"
                            >
                              <RiDeleteBinLine className="size-4" />
                            </button>
                          </div>
                          {action.note && (
                            <p className="rounded-md bg-muted p-3 leading-6">
                              {action.note}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="mt-2 w-full justify-start"
                            onClick={() => scrollToReaderAction(action)}
                          >
                            <RiMapPinLine className="size-4" />
                            Ir para trecho
                          </Button>
                        </article>
                      ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {selectionMenu && (
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar anotacao</DialogTitle>
              <DialogDescription>
                A anotacao vai aparecer como um indicador no proprio trecho.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <blockquote className="line-clamp-3 border-l-2 pl-4 text-sm leading-7 text-muted-foreground">
                &quot;{selectionMenu.text}&quot;
              </blockquote>

              <Textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                className="min-h-28"
                placeholder="Escreva sua anotacao..."
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setNoteOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={saveNote}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {selectionMenu && (
        <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
          <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="px-6 py-5">
              <div className="flex items-start gap-3 pr-8">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-foreground">
                  <RiBrainLine className="size-5" />
                </span>
                <div>
                  <DialogTitle>Explicacao do trecho marcado</DialogTitle>
                  <DialogDescription>
                    Leitura objetiva para estudo, sem substituir o texto legal.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Separator />

            <ScrollArea className="max-h-[62vh]">
              <div className="space-y-6 px-6 py-5">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <RiStickyNoteLine className="size-4" />
                    Trecho selecionado
                  </div>
                  <blockquote className="border-l-2 pl-4 text-sm leading-7 text-foreground">
                    &quot;{selectionMenu.text}&quot;
                  </blockquote>
                </section>

                <Separator />

                {explainLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-9 w-72" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : explanationData ? (
                  <Tabs defaultValue="resumo" className="gap-5">
                    <TabsList
                      variant="line"
                      className="w-full justify-start overflow-x-auto text-muted-foreground"
                    >
                      {explanationTabs.map((tab) => (
                        <TabsTrigger
                          key={tab.key}
                          value={tab.key}
                          className="flex-none px-3"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="resumo" className="min-h-40">
                      <article className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiBookOpenLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            {explanationData.resumo?.titulo || "Em resumo"}
                          </h3>
                        </div>
                        <p className="max-w-prose text-sm leading-8 text-muted-foreground">
                          {explanationData.resumo?.texto ||
                            "Nao foi possivel resumir este trecho."}
                        </p>
                      </article>
                    </TabsContent>

                    <TabsContent value="explicacao" className="min-h-40">
                      <article className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiBrainLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            {explanationData.explicacao?.titulo ||
                              "O que significa?"}
                          </h3>
                        </div>
                        <p className="max-w-prose text-sm leading-8 whitespace-pre-line text-muted-foreground">
                          {explanationData.explicacao?.texto ||
                            "Nao foi possivel explicar este trecho."}
                        </p>
                        {explanationData.passoAPasso &&
                          explanationData.passoAPasso.length > 0 && (
                            <ol className="space-y-2 text-sm text-muted-foreground">
                              {explanationData.passoAPasso.map(
                                (step, index) => (
                                  <li
                                    key={`${step}-${index}`}
                                    className="flex gap-3"
                                  >
                                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-xs">
                                      {index + 1}
                                    </span>
                                    <span className="leading-7">{step}</span>
                                  </li>
                                )
                              )}
                            </ol>
                          )}
                      </article>
                    </TabsContent>

                    <TabsContent value="termos" className="min-h-40">
                      <article className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiBookOpenLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            Termos importantes
                          </h3>
                        </div>
                        {explanationData.termosImportantes &&
                        explanationData.termosImportantes.length > 0 ? (
                          <div className="space-y-3">
                            {explanationData.termosImportantes.map(
                              (item, index) => (
                                <div
                                  key={`${item.termo}-${index}`}
                                  className="border-l-2 pl-4"
                                >
                                  <p className="text-sm font-medium">
                                    {item.termo || "Termo"}
                                  </p>
                                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                                    {item.significado || "Sem explicacao."}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nao ha termo juridico importante neste trecho.
                          </p>
                        )}
                      </article>
                    </TabsContent>

                    <TabsContent value="exemplo" className="min-h-40">
                      <article className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiStickyNoteLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            {explanationData.exemploPratico?.titulo ||
                              "Exemplo pratico"}
                          </h3>
                        </div>
                        <div className="space-y-3 text-sm leading-8 text-muted-foreground">
                          <p>{explanationData.exemploPratico?.situacao}</p>
                          <p>{explanationData.exemploPratico?.conclusao}</p>
                        </div>
                      </article>
                    </TabsContent>

                    <TabsContent value="prova" className="min-h-40">
                      <article className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiCheckLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            {explanationData.exemploConcurso?.titulo ||
                              "Como pode cair em prova"}
                          </h3>
                        </div>
                        <div className="space-y-3 text-sm leading-8 text-muted-foreground">
                          <p>{explanationData.exemploConcurso?.situacao}</p>
                          {explanationData.exemploConcurso?.resposta && (
                            <Badge variant="outline">
                              {explanationData.exemploConcurso.resposta}
                            </Badge>
                          )}
                          <p>{explanationData.exemploConcurso?.explicacao}</p>
                        </div>
                      </article>
                    </TabsContent>

                    <TabsContent value="memorize" className="min-h-40">
                      <article className="space-y-5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                            <RiCheckLine className="size-4" />
                          </span>
                          <h3 className="text-base font-semibold">
                            {explanationData.memorize?.titulo ||
                              "Para memorizar"}
                          </h3>
                        </div>
                        <p className="max-w-prose text-sm leading-8 text-muted-foreground">
                          {explanationData.memorize?.frase}
                        </p>
                        {explanationData.pegadinha && (
                          <div className="space-y-3 border-l-2 pl-4">
                            <p className="text-sm font-medium">
                              {explanationData.pegadinha.titulo ||
                                "Pegadinha comum"}
                            </p>
                            <p className="text-sm leading-7 text-muted-foreground">
                              {explanationData.pegadinha.afirmacao}
                            </p>
                            {explanationData.pegadinha.gabarito && (
                              <Badge variant="outline">
                                {explanationData.pegadinha.gabarito}
                              </Badge>
                            )}
                            <p className="text-sm leading-7 text-muted-foreground">
                              {explanationData.pegadinha.explicacao}
                            </p>
                          </div>
                        )}
                      </article>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="max-w-prose text-sm leading-8 whitespace-pre-line text-muted-foreground">
                    {explanation}
                  </p>
                )}
              </div>
            </ScrollArea>

            <DialogFooter className="items-center justify-between sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Use como apoio. Confira sempre o texto legal.
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={() => setExplainOpen(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div
        ref={readerRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        onTouchEnd={captureSelection}
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14"
      >
        <RenderCanonicalDocumento lei={lei} />
      </div>
    </main>
  )
}
