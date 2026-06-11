import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { createClient } from "@supabase/supabase-js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const bucket = "legal-documents"

const documents = [
  {
    slug: "codigo_civil",
    categoria: "codigos",
    file: "public/json/codigos/codigo_civil/codigo_civil.json",
    storagePath: "codigos/codigo_civil/v1/codigo_civil.json",
  },
  {
    slug: "codigo_de_processo_civil",
    categoria: "codigos",
    file: "public/json/codigos/codigo_de_processo_civil/codigo_de_processo_civil.json",
    storagePath:
      "codigos/codigo_de_processo_civil/v1/codigo_de_processo_civil.json",
  },
  {
    slug: "codigo_de_processo_penal",
    categoria: "codigos",
    file: "public/json/codigos/codigo_de_processo_penal/codigo_de_processo_penal.json",
    storagePath:
      "codigos/codigo_de_processo_penal/v1/codigo_de_processo_penal.json",
  },
  {
    slug: "codigo_de_processo_penal_militar",
    categoria: "codigos",
    file: "public/json/codigos/codigo_de_processo_penal_militar/codigo_de_processo_penal_militar.json",
    storagePath:
      "codigos/codigo_de_processo_penal_militar/v1/codigo_de_processo_penal_militar.json",
  },
  {
    slug: "codigo_de_transito_brasileiro",
    categoria: "codigos",
    file: "public/json/codigos/codigo_de_transito_brasileiro/codigo_de_transito_brasileiro.json",
    storagePath:
      "codigos/codigo_de_transito_brasileiro/v1/codigo_de_transito_brasileiro.json",
  },
  {
    slug: "codigo_penal",
    categoria: "codigos",
    file: "public/json/codigos/codigo_penal/codigo_penal.json",
    storagePath: "codigos/codigo_penal/v1/codigo_penal.json",
  },
  {
    slug: "codigo_penal_militar",
    categoria: "codigos",
    file: "public/json/codigos/codigo_penal_militar/codigo_penal_militar.json",
    storagePath: "codigos/codigo_penal_militar/v1/codigo_penal_militar.json",
  },
  {
    slug: "constituicao_federal_de_1988",
    categoria: "constituicao",
    file: "public/json/constituicao/constituicao_federal_de_1988/constituicao_federal_de_1988.json",
    storagePath:
      "constituicao/constituicao_federal_de_1988/v1/constituicao_federal_de_1988.json",
  },
]

function readEnvFile() {
  return fs
    .readFile(path.join(root, ".env.local"), "utf8")
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
      }
    })
    .catch(() => undefined)
}

function arr(value) {
  return Array.isArray(value) ? value : []
}

function countArticles(node) {
  if (!node || typeof node !== "object") return 0

  let total = arr(node.artigos).length

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      total += value.reduce((sum, item) => sum + countArticles(item), 0)
    } else if (value && typeof value === "object") {
      total += countArticles(value)
    }
  }

  return total
}

async function ensureBucket(supabase) {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets()

  if (listError) throw listError

  const exists = buckets.some((item) => item.name === bucket)
  const options = {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  }

  if (exists) {
    const { error } = await supabase.storage.updateBucket(bucket, options)
    if (error) throw error
    return
  }

  const { error } = await supabase.storage.createBucket(bucket, options)
  if (error) throw error
}

async function main() {
  await readEnvFile()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao foi encontrado.")
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao foi encontrado.")
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  await ensureBucket(supabase)

  const rows = []

  for (const doc of documents) {
    const filePath = path.join(root, doc.file)
    const bytes = await fs.readFile(filePath)
    const text = bytes.toString("utf8").replace(/^\uFEFF/, "")
    const json = JSON.parse(text)
    const documento = json.documento || json
    const checksum = crypto.createHash("sha256").update(bytes).digest("hex")

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(doc.storagePath, bytes, {
        cacheControl: "3600",
        contentType: "application/json",
        upsert: true,
      })

    if (uploadError) throw uploadError

    rows.push({
      slug: doc.slug,
      titulo: documento.titulo,
      categoria: doc.categoria,
      tipo: documento.tipo,
      bucket,
      storage_path: doc.storagePath,
      version: "v1",
      size_bytes: bytes.length,
      artigos_count: countArticles(documento),
      checksum_sha256: checksum,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    console.log(`Enviado: ${doc.storagePath}`)
  }

  const { error: upsertError } = await supabase
    .from("legal_documents")
    .upsert(rows, { onConflict: "slug" })

  if (upsertError) throw upsertError

  console.log(`OK: ${rows.length} documentos enviados e registrados.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
