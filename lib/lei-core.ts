/* eslint-disable @typescript-eslint/no-explicit-any */

export function arr(v: any) {
  return Array.isArray(v) ? v : [];
}

export function texto(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

export function pegarDocumento(json: any) {
  return json?.documento || json;
}

export function pegarConteudo(json: any) {
  const documento = pegarDocumento(json);
  return documento?.convencao || documento;
}
