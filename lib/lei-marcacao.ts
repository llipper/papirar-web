export type SegmentoTexto = {
  tipo: "texto" | "referencia" | "norma";
  texto: string;
};

const PADRAO_MARCACAO =
  /(art(?:s)?\.?\s*\d+(?:\.\d+)*(?:-[A-Za-z])?(?:,\s*(?:§{1,2}|inciso|incisos|caput)[^.;,]*)?|§{1,2}\s*\d+(?:-[A-Za-z])?|inciso\s+[IVXLCDM]+|incisos\s+[IVXLCDM]+(?:\s*e\s*[IVXLCDM]+)?|Lei\s+n[ºo]\s*[\d.]+(?:,\s*de\s*\d{1,2}\s+de\s+[a-zç]+\s+de\s+\d{4})?|Decreto-?Lei\s+n[ºo]\s*[\d.]+|Constitui[cç][aã]o\s+Federal|C[oó]digo\s+(?:Penal|Civil|de Processo Civil|de Processo Penal|de Tr[aâ]nsito Brasileiro))/gi;

function tipoDoTrecho(texto: string): SegmentoTexto["tipo"] {
  return /^(Lei|Decreto|Constitui|C[oó]digo)/i.test(texto) ? "norma" : "referencia";
}

export function marcarTexto(valor: string): SegmentoTexto[] {
  if (!valor) return [];

  const segmentos: SegmentoTexto[] = [];
  let ultimoIndice = 0;

  for (const match of valor.matchAll(PADRAO_MARCACAO)) {
    const texto = match[0];
    const indice = match.index ?? 0;

    if (indice > ultimoIndice) {
      segmentos.push({ tipo: "texto", texto: valor.slice(ultimoIndice, indice) });
    }

    segmentos.push({ tipo: tipoDoTrecho(texto), texto });
    ultimoIndice = indice + texto.length;
  }

  if (ultimoIndice < valor.length) {
    segmentos.push({ tipo: "texto", texto: valor.slice(ultimoIndice) });
  }

  return segmentos;
}
