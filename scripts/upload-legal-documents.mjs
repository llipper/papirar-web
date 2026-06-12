import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const bucket = "legal-documents"
const version = "v1"

const documents = [
  {
    slug: "estatuto_da_crianca_e_do_adolescente",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_da_crianca_e_do_adolescente/estatuto_da_crianca_e_do_adolescente.json",
    storagePath:
      "estatutos/estatuto_da_crianca_e_do_adolescente/v1/estatuto_da_crianca_e_do_adolescente.json",
  },
  {
    slug: "estatuto_da_igualdade_racial",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_da_igualdade_racial/estatuto_da_igualdade_racial.json",
    storagePath:
      "estatutos/estatuto_da_igualdade_racial/v1/estatuto_da_igualdade_racial.json",
  },
  {
    slug: "estatuto_da_pessoa_com_deficiencia",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_da_pessoa_com_deficiencia/estatuto_da_pessoa_com_deficiencia.json",
    storagePath:
      "estatutos/estatuto_da_pessoa_com_deficiencia/v1/estatuto_da_pessoa_com_deficiencia.json",
  },
  {
    slug: "estatuto_do_desarmamento",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_do_desarmamento/estatuto_do_desarmamento.json",
    storagePath:
      "estatutos/estatuto_do_desarmamento/v1/estatuto_do_desarmamento.json",
  },
  {
    slug: "estatuto_do_idoso",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_do_idoso/estatuto_do_idoso.json",
    storagePath: "estatutos/estatuto_do_idoso/v1/estatuto_do_idoso.json",
  },
  {
    slug: "estatuto_dos_militares",
    categoria: "estatutos",
    file: "public/json/estatutos/estatuto_dos_militares/estatuto_dos_militares.json",
    storagePath:
      "estatutos/estatuto_dos_militares/v1/estatuto_dos_militares.json",
  },
  {
    slug: "lei_11340_maria_da_penha",
    categoria: "leis",
    file: "public/json/leis/lei_11340_maria_da_penha/lei_11340_maria_da_penha.json",
    storagePath:
      "leis/lei_11340_maria_da_penha/v1/lei_11340_maria_da_penha.json",
  },
  {
    slug: "lei_11343_drogas",
    categoria: "leis",
    file: "public/json/leis/lei_11343_drogas/lei_11343_drogas.json",
    storagePath: "leis/lei_11343_drogas/v1/lei_11343_drogas.json",
  },
  {
    slug: "lei_12527_acesso_a_informacao",
    categoria: "leis",
    file: "public/json/leis/lei_12527_acesso_a_informacao/lei_12527_acesso_a_informacao.json",
    storagePath:
      "leis/lei_12527_acesso_a_informacao/v1/lei_12527_acesso_a_informacao.json",
  },
  {
    slug: "lei_12846_anticorrupcao",
    categoria: "leis",
    file: "public/json/leis/lei_12846_anticorrupcao/lei_12846_anticorrupcao.json",
    storagePath:
      "leis/lei_12846_anticorrupcao/v1/lei_12846_anticorrupcao.json",
  },
  {
    slug: "lei_12850_organizacoes_criminosas",
    categoria: "leis",
    file: "public/json/leis/lei_12850_organizacoes_criminosas/lei_12850_organizacoes_criminosas.json",
    storagePath:
      "leis/lei_12850_organizacoes_criminosas/v1/lei_12850_organizacoes_criminosas.json",
  },
  {
    slug: "lei_12965_marco_civil_da_internet",
    categoria: "leis",
    file: "public/json/leis/lei_12965_marco_civil_da_internet/lei_12965_marco_civil_da_internet.json",
    storagePath:
      "leis/lei_12965_marco_civil_da_internet/v1/lei_12965_marco_civil_da_internet.json",
  },
  {
    slug: "lei_13303_estatais",
    categoria: "leis",
    file: "public/json/leis/lei_13303_estatais/lei_13303_estatais.json",
    storagePath: "leis/lei_13303_estatais/v1/lei_13303_estatais.json",
  },
  {
    slug: "lei_13709_lgpd",
    categoria: "leis",
    file: "public/json/leis/lei_13709_lgpd/lei_13709_lgpd.json",
    storagePath: "leis/lei_13709_lgpd/v1/lei_13709_lgpd.json",
  },
  {
    slug: "lei_13869_abuso_de_autoridade",
    categoria: "leis",
    file: "public/json/leis/lei_13869_abuso_de_autoridade/lei_13869_abuso_de_autoridade.json",
    storagePath:
      "leis/lei_13869_abuso_de_autoridade/v1/lei_13869_abuso_de_autoridade.json",
  },
  {
    slug: "lei_14133_licitacoes_e_contratos",
    categoria: "leis",
    file: "public/json/leis/lei_14133_licitacoes_e_contratos/lei_14133_licitacoes_e_contratos.json",
    storagePath:
      "leis/lei_14133_licitacoes_e_contratos/v1/lei_14133_licitacoes_e_contratos.json",
  },
  {
    slug: "lei_7210_execucao_penal",
    categoria: "leis",
    file: "public/json/leis/lei_7210_execucao_penal/lei_7210_execucao_penal.json",
    storagePath:
      "leis/lei_7210_execucao_penal/v1/lei_7210_execucao_penal.json",
  },
  {
    slug: "lei_8072_crimes_hediondos",
    categoria: "leis",
    file: "public/json/leis/lei_8072_crimes_hediondos/lei_8072_crimes_hediondos.json",
    storagePath:
      "leis/lei_8072_crimes_hediondos/v1/lei_8072_crimes_hediondos.json",
  },
  {
    slug: "lei_8112_servidores_publicos_federais",
    categoria: "leis",
    file: "public/json/leis/lei_8112_servidores_publicos_federais/lei_8112_servidores_publicos_federais.json",
    storagePath:
      "leis/lei_8112_servidores_publicos_federais/v1/lei_8112_servidores_publicos_federais.json",
  },
  {
    slug: "lei_8429_improbidade_administrativa",
    categoria: "leis",
    file: "public/json/leis/lei_8429_improbidade_administrativa/lei_8429_improbidade_administrativa.json",
    storagePath:
      "leis/lei_8429_improbidade_administrativa/v1/lei_8429_improbidade_administrativa.json",
  },
  {
    slug: "lei_9455_tortura",
    categoria: "leis",
    file: "public/json/leis/lei_9455_tortura/lei_9455_tortura.json",
    storagePath: "leis/lei_9455_tortura/v1/lei_9455_tortura.json",
  },
  {
    slug: "lei_9613_lavagem_de_dinheiro",
    categoria: "leis",
    file: "public/json/leis/lei_9613_lavagem_de_dinheiro/lei_9613_lavagem_de_dinheiro.json",
    storagePath:
      "leis/lei_9613_lavagem_de_dinheiro/v1/lei_9613_lavagem_de_dinheiro.json",
  },
  {
    slug: "lei_9784_processo_administrativo_federal",
    categoria: "leis",
    file: "public/json/leis/lei_9784_processo_administrativo_federal/lei_9784_processo_administrativo_federal.json",
    storagePath:
      "leis/lei_9784_processo_administrativo_federal/v1/lei_9784_processo_administrativo_federal.json",
  },
  {
    slug: "convencao_americana_direitos_humanos_pacto_san_jose",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/convencao_americana_direitos_humanos_pacto_san_jose/convencao_americana_direitos_humanos_pacto_san_jose.json",
    storagePath:
      "tratados_internacionais/convencao_americana_direitos_humanos_pacto_san_jose/v1/convencao_americana_direitos_humanos_pacto_san_jose.json",
  },
  {
    slug: "convencao_contra_a_tortura",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/convencao_contra_a_tortura/convencao_contra_a_tortura.json",
    storagePath:
      "tratados_internacionais/convencao_contra_a_tortura/v1/convencao_contra_a_tortura.json",
  },
  {
    slug: "convencao_sobre_direitos_das_pessoas_com_deficiencia",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/convencao_sobre_direitos_das_pessoas_com_deficiencia/convencao_sobre_direitos_das_pessoas_com_deficiencia.json",
    storagePath:
      "tratados_internacionais/convencao_sobre_direitos_das_pessoas_com_deficiencia/v1/convencao_sobre_direitos_das_pessoas_com_deficiencia.json",
  },
  {
    slug: "declaracao_universal_dos_direitos_humanos",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/declaracao_universal_dos_direitos_humanos/declaracao_universal_dos_direitos_humanos.json",
    storagePath:
      "tratados_internacionais/declaracao_universal_dos_direitos_humanos/v1/declaracao_universal_dos_direitos_humanos.json",
  },
  {
    slug: "pacto_internacional_dos_direitos_civis_e_politicos",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/pacto_internacional_dos_direitos_civis_e_politicos/pacto_internacional_dos_direitos_civis_e_politicos.json",
    storagePath:
      "tratados_internacionais/pacto_internacional_dos_direitos_civis_e_politicos/v1/pacto_internacional_dos_direitos_civis_e_politicos.json",
  },
  {
    slug: "pacto_internacional_dos_direitos_economicos_sociais_e_culturais",
    categoria: "tratados_internacionais",
    file: "public/json/tratados_internacionais/pacto_internacional_dos_direitos_economicos_sociais_e_culturais/pacto_internacional_dos_direitos_economicos_sociais_e_culturais.json",
    storagePath:
      "tratados_internacionais/pacto_internacional_dos_direitos_economicos_sociais_e_culturais/v1/pacto_internacional_dos_direitos_economicos_sociais_e_culturais.json",
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

function collectIds(node, ids = new Map()) {
  if (!node || typeof node !== "object") return ids

  if (typeof node.id === "string") {
    ids.set(node.id, (ids.get(node.id) ?? 0) + 1)
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      value.forEach((item) => collectIds(item, ids))
    } else if (value && typeof value === "object") {
      collectIds(value, ids)
    }
  }

  return ids
}

function hasMojibake(text) {
  return (
    text.includes(String.fromCharCode(0xfffd)) ||
    /[\u00c3][\u0080-\u00bf]/.test(text) ||
    /[\u00c2][\u0080-\u00bf]/.test(text) ||
    text.includes("â€") ||
    text.includes("â€“")
  )
}

function hasDocumentShape(json) {
  const documento = json.documento || json

  return Boolean(
    documento &&
      typeof documento === "object" &&
      documento.titulo &&
      documento.tipo &&
      (documento.partes ||
        documento.titulos ||
        documento.capitulos ||
        documento.artigos ||
        documento.convencao),
  )
}

async function readAndValidateDocument(doc) {
  const filePath = path.join(root, doc.file)
  const bytes = await fs.readFile(filePath)
  const text = bytes.toString("utf8").replace(/^\uFEFF/, "")
  const json = JSON.parse(text)
  const documento = json.documento || json
  const duplicateIds = [...collectIds(json).entries()].filter(
    ([, count]) => count > 1,
  )
  const artigosCount = countArticles(documento)

  if (!hasDocumentShape(json)) {
    throw new Error(`${doc.file}: estrutura de documento invalida.`)
  }

  if (duplicateIds.length > 0) {
    throw new Error(
      `${doc.file}: ids duplicados: ${duplicateIds.map(([id]) => id).join(", ")}`,
    )
  }

  if (hasMojibake(text)) {
    throw new Error(`${doc.file}: texto com acento corrompido.`)
  }

  if (artigosCount === 0) {
    throw new Error(`${doc.file}: nenhum artigo encontrado.`)
  }

  return {
    bytes,
    documento,
    artigosCount,
    checksum: crypto.createHash("sha256").update(bytes).digest("hex"),
  }
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
  const dryRun = process.argv.includes("--dry-run")
  const preparedRows = []

  for (const doc of documents) {
    const prepared = await readAndValidateDocument(doc)

    preparedRows.push({
      doc,
      ...prepared,
      row: {
        slug: doc.slug,
        titulo: prepared.documento.titulo,
        categoria: doc.categoria,
        tipo: prepared.documento.tipo,
        bucket,
        storage_path: doc.storagePath,
        version,
        size_bytes: prepared.bytes.length,
        artigos_count: prepared.artigosCount,
        checksum_sha256: prepared.checksum,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
    })
  }

  console.log(`Validacao OK: ${preparedRows.length} documento(s).`)

  if (dryRun) {
    for (const item of preparedRows) {
      console.log(
        `Pronto: ${item.doc.storagePath} (${item.artigosCount} artigos)`,
      )
    }

    console.log("Dry-run: nada foi enviado.")
    return
  }

  await readEnvFile()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL nao foi encontrado.")
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY nao foi encontrado.")
  }

  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  await ensureBucket(supabase)

  for (const item of preparedRows) {
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(item.doc.storagePath, item.bytes, {
        cacheControl: "3600",
        contentType: "application/json",
        upsert: true,
      })

    if (uploadError) throw uploadError

    console.log(`Enviado: ${item.doc.storagePath}`)
  }

  const { error: upsertError } = await supabase
    .from("legal_documents")
    .upsert(
      preparedRows.map((item) => item.row),
      { onConflict: "slug" },
    )

  if (upsertError) throw upsertError

  console.log(`OK: ${preparedRows.length} documentos enviados e registrados.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
