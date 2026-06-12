/* eslint-disable @typescript-eslint/no-explicit-any */

import { texto } from "@/lib/lei-core";

export function rotuloArtigo(artigo: any) {
  if (texto(artigo?.rotulo)) return artigo.rotulo;
  if (artigo?.numero) return `Art. ${artigo.numero}`;
  return "Artigo";
}

export function rotuloParagrafo(paragrafo: any) {
  if (texto(paragrafo?.rotulo)) return paragrafo.rotulo;
  if (paragrafo?.tipo === "unico") return "Parágrafo único";
  if (paragrafo?.numero) return `§ ${paragrafo.numero}`;
  return "§";
}

export function rotuloInciso(inciso: any) {
  if (texto(inciso?.rotulo)) return inciso.rotulo;
  if (inciso?.numero) return `${inciso.numero} -`;
  return "";
}

export function rotuloAlinea(alinea: any) {
  if (texto(alinea?.rotulo)) return alinea.rotulo;
  const marcador = texto(alinea?.letra ?? alinea?.numero);
  if (marcador) return marcador.endsWith(")") ? marcador : `${marcador})`;
  return "";
}

export function textoPrincipal(item: any) {
  return texto(item?.texto || item?.caput);
}

export function tituloRubrica(item: any) {
  return texto(item?.rubrica || item?.titulo);
}

export type TituloHierarquico = {
  nivel: "livro" | "titulo" | "capitulo" | "secao" | "subsecao" | "outro";
  rotulo: string;
  descricao: string;
  texto: string;
};

function nivelDoTitulo(valor: string): TituloHierarquico["nivel"] {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalizado.startsWith("livro ")) return "livro";
  if (normalizado.startsWith("titulo ")) return "titulo";
  if (normalizado.startsWith("capitulo ")) return "capitulo";
  if (normalizado.startsWith("secao ")) return "secao";
  if (normalizado.startsWith("subsecao ")) return "subsecao";
  return "outro";
}

export function separarTituloHierarquico(valor: string): TituloHierarquico[] {
  return texto(valor)
    .split("/")
    .map((parte: string) => parte.trim())
    .filter(Boolean)
    .map((parte: string) => {
      const [rotulo, ...descricao] = parte.split(" - ");

      return {
        nivel: nivelDoTitulo(parte),
        rotulo: rotulo.trim(),
        descricao: descricao.join(" - ").trim(),
        texto: parte,
      };
    });
}
