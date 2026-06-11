/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { arr, pegarConteudo, pegarDocumento } from "@/lib/lei-core";

export type LegalDocumentIndex = {
  slug: string;
  titulo: string;
  categoria: string;
  tipo: string;
  bucket: string;
  storage_path: string;
  version: string;
  size_bytes: number;
  artigos_count: number;
  checksum_sha256: string;
};

export async function listarJsons(dir: string): Promise<string[]> {
  const resultados: string[] = [];

  async function andar(pasta: string) {
    const itens = await fs.readdir(pasta, { withFileTypes: true });

    for (const item of itens) {
      const full = path.join(pasta, item.name);

      if (item.isDirectory()) await andar(full);

      if (item.isFile() && item.name.endsWith(".json")) {
        resultados.push(full);
      }
    }
  }

  await andar(dir);
  return resultados;
}

export function scoreLei(json: any) {
  const documento = pegarDocumento(json);
  const conteudo = pegarConteudo(json);

  return (
    arr(conteudo?.partes).length * 100 +
    arr(documento?.partes).length * 100 +
    arr(conteudo?.artigos).length * 20 +
    arr(conteudo?.preambulo?.considerandos).length * 10 +
    (documento?.convencao ? 50 : 0)
  );
}

export async function carregarLeiLocal(slug: string) {
  const basePath = path.join(process.cwd(), "public", "json");

  let arquivos: string[] = [];

  try {
    arquivos = await listarJsons(basePath);
  } catch {
    return null;
  }

  const candidatos: any[] = [];

  for (const arquivo of arquivos) {
    const nomeArquivo = path.basename(arquivo, ".json");
    const pastaPai = path.basename(path.dirname(arquivo));

    if (nomeArquivo !== slug && pastaPai !== slug) continue;

    try {
      const file = await fs.readFile(arquivo, "utf-8");
      const json = JSON.parse(file);

      candidatos.push({
        arquivo,
        json,
        score: scoreLei(json),
      });
    } catch {
      // ignora json inválido
    }
  }

  candidatos.sort((a, b) => b.score - a.score);

  return candidatos[0]?.json || null;
}

async function carregarIndiceDocumento(slug: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("legal_documents")
    .select(
      "slug,titulo,categoria,tipo,bucket,storage_path,version,size_bytes,artigos_count,checksum_sha256"
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return data as LegalDocumentIndex;
}

async function baixarJsonDocumento(indice: LegalDocumentIndex) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from(indice.bucket)
    .download(indice.storage_path);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  const checksum = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  if (checksum !== indice.checksum_sha256) return null;

  return JSON.parse(buffer.toString("utf8"));
}

export async function listarDocumentosLegais() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("legal_documents")
    .select(
      "slug,titulo,categoria,tipo,bucket,storage_path,version,size_bytes,artigos_count,checksum_sha256"
    )
    .eq("is_active", true)
    .order("categoria", { ascending: true })
    .order("titulo", { ascending: true });

  if (error || !data) return null;

  return data as LegalDocumentIndex[];
}

export async function carregarLei(slug: string) {
  const indice = await carregarIndiceDocumento(slug);

  if (indice) {
    const remoto = await baixarJsonDocumento(indice);
    if (remoto) return remoto;
  }

  return carregarLeiLocal(slug);
}
