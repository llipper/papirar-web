/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { arr, texto, pegarConteudo, pegarDocumento } from "@/lib/lei-core";
import {
  rotuloAlinea,
  rotuloArtigo,
  rotuloInciso,
  rotuloParagrafo,
  separarTituloHierarquico,
  textoPrincipal,
  tituloRubrica,
} from "@/lib/lei-format";
import { marcarTexto } from "@/lib/lei-marcacao";

function classeTituloHierarquico(nivel: string, fallback: "titulo" | "capitulo" | "secao") {
  if (nivel === "livro") return "text-base";
  if (nivel === "titulo") return "text-lg";
  if (nivel === "capitulo") return "text-base";
  if (nivel === "secao") return "text-sm";
  if (nivel === "subsecao") return "text-xs";

  if (fallback === "titulo") return "text-lg";
  if (fallback === "capitulo") return "text-base";
  return "text-sm";
}

function textoVetado(valor: string) {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[().]/g, "")
    .trim();

  return normalizado === "vetado";
}

function itemVetado(item: any) {
  const valor = textoPrincipal(item);
  return valor ? textoVetado(valor) : false;
}

function RenderTituloHierarquico({
  titulo,
  fallback,
}: {
  titulo?: string;
  fallback: "titulo" | "capitulo" | "secao";
}) {
  const partes = separarTituloHierarquico(titulo || "");
  if (!partes.length) return null;

  return (
    <div className="space-y-5">
      {partes.map((parte, index) => (
        <div key={`${parte.texto}-${index}`} className="text-center">
          <div
            className={`${classeTituloHierarquico(parte.nivel, fallback)} font-bold uppercase tracking-[0.18em] text-foreground`}
          >
            {parte.rotulo || parte.texto}
          </div>

          {parte.descricao && (
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
              {parte.descricao}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TextoMarcado({ valor }: { valor: string }) {
  return (
    <>
      {marcarTexto(valor).map((segmento, index) => {
        if (segmento.tipo === "texto") {
          return <React.Fragment key={index}>{segmento.texto}</React.Fragment>;
        }

        const className =
          segmento.tipo === "norma"
            ? "rounded bg-primary/10 px-1 py-0.5 font-medium text-primary"
            : "rounded bg-muted px-1 py-0.5 font-medium text-foreground";

        return (
          <mark key={index} className={className}>
            {segmento.texto}
          </mark>
        );
      })}
    </>
  );
}

export function RenderRubricaLinha({ rubrica }: { rubrica?: string }) {
  if (!texto(rubrica)) return null;

  return (
    <p className="mt-4 text-sm font-semibold leading-7 text-foreground">
      {rubrica}
    </p>
  );
}

export function RenderRubricaArtigo({ artigo }: { artigo: any }) {
  const valor = tituloRubrica(artigo);
  if (!valor) return null;

  return (
    <Badge variant="secondary" className="mt-3 w-fit">
      {valor}
    </Badge>
  );
}

export function RenderTexto({ item }: { item: any }) {
  const valor = textoPrincipal(item);
  if (!valor || textoVetado(valor)) return null;

  return (
    <p className="mt-4 text-base leading-8 text-muted-foreground">
      <TextoMarcado valor={valor} />
    </p>
  );
}

export function RenderAlinea({ alinea }: { alinea: any }) {
  const rotulo = rotuloAlinea(alinea);
  const valor = textoPrincipal(alinea);
  if (itemVetado(alinea)) return null;

  return (
    <div className="mt-3 border-l pl-5">
      <RenderRubricaLinha rubrica={alinea.rubrica || alinea.titulo} />

      {valor && (
        <p className="text-sm leading-7 text-muted-foreground">
          {rotulo && <strong className="text-foreground">{rotulo}</strong>}{" "}
          <TextoMarcado valor={valor} />
        </p>
      )}

      {arr(alinea.incisos).map((i: any, index: number) => (
        <RenderInciso key={`${i?.id ?? ""}-${index}`} inciso={i} />
      ))}

      {arr(alinea.alineas).map((a: any, index: number) => (
        <RenderAlinea key={`${a?.id ?? ""}-${index}`} alinea={a} />
      ))}
    </div>
  );
}

export function RenderInciso({ inciso }: { inciso: any }) {
  const rotulo = rotuloInciso(inciso);
  const valor = textoPrincipal(inciso);
  if (itemVetado(inciso)) return null;

  return (
    <div className="mt-4 border-l pl-5">
      <RenderRubricaLinha rubrica={inciso.rubrica || inciso.titulo} />

      {valor && (
        <p className="text-sm leading-7 text-muted-foreground">
          {rotulo && <strong className="text-foreground">{rotulo}</strong>}{" "}
          <TextoMarcado valor={valor} />
        </p>
      )}

      {arr(inciso.alineas).map((a: any, index: number) => (
        <RenderAlinea key={`${a?.id ?? ""}-${index}`} alinea={a} />
      ))}

      {arr(inciso.incisos).map((i: any, index: number) => (
        <RenderInciso key={`${i?.id ?? ""}-${index}`} inciso={i} />
      ))}
    </div>
  );
}

export function RenderParagrafo({ paragrafo }: { paragrafo: any }) {
  const valor = textoPrincipal(paragrafo);
  if (itemVetado(paragrafo)) return null;

  return (
    <div className="mt-5 border-l-2 pl-5">
      <RenderRubricaLinha rubrica={paragrafo.rubrica || paragrafo.titulo} />

      {valor && (
        <p className="text-sm leading-7 text-muted-foreground">
          <strong className="text-foreground">{rotuloParagrafo(paragrafo)}</strong>{" "}
          <TextoMarcado valor={valor} />
        </p>
      )}

      {arr(paragrafo.incisos).map((i: any, index: number) => (
        <RenderInciso key={`${i?.id ?? ""}-${index}`} inciso={i} />
      ))}

      {arr(paragrafo.alineas).map((a: any, index: number) => (
        <RenderAlinea key={`${a?.id ?? ""}-${index}`} alinea={a} />
      ))}
    </div>
  );
}

export function RenderArtigo({ artigo }: { artigo: any }) {
  if (itemVetado(artigo)) return null;

  return (
    <Card className="mt-6 bg-transparent shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-lg">{rotuloArtigo(artigo)}</CardTitle>
        <RenderRubricaArtigo artigo={artigo} />
      </CardHeader>

      <CardContent>
        <RenderTexto item={artigo} />

        {arr(artigo.incisos).map((i: any, index: number) => (
          <RenderInciso key={`${i?.id ?? ""}-${index}`} inciso={i} />
        ))}

        {arr(artigo.paragrafos).map((p: any, index: number) => (
          <RenderParagrafo key={`${p?.id ?? ""}-${index}`} paragrafo={p} />
        ))}

        {arr(artigo.alineas).map((a: any, index: number) => (
          <RenderAlinea key={`${a?.id ?? ""}-${index}`} alinea={a} />
        ))}
      </CardContent>
    </Card>
  );
}

export function RenderSecao({ secao }: { secao: any }) {
  return (
    <section className="mt-10">
      <RenderTituloHierarquico titulo={secao.titulo} fallback="secao" />

      {arr(secao.artigos).map((a: any, index: number) => (
        <RenderArtigo key={`${a?.id ?? ""}-${index}`} artigo={a} />
      ))}
    </section>
  );
}

export function RenderCapitulo({ capitulo }: { capitulo: any }) {
  return (
    <section className="mt-12">
      <RenderTituloHierarquico titulo={capitulo.titulo} fallback="capitulo" />

      {arr(capitulo.secoes).map((s: any, index: number) => (
        <RenderSecao key={`${s?.id ?? ""}-${index}`} secao={s} />
      ))}

      {arr(capitulo.artigos).map((a: any, index: number) => (
        <RenderArtigo key={`${a?.id ?? ""}-${index}`} artigo={a} />
      ))}
    </section>
  );
}

export function RenderTitulo({ titulo }: { titulo: any }) {
  return (
    <section className="mt-14">
      <RenderTituloHierarquico titulo={titulo.titulo} fallback="titulo" />

      {arr(titulo.capitulos).map((c: any, index: number) => (
        <RenderCapitulo key={`${c?.id ?? ""}-${index}`} capitulo={c} />
      ))}

      {arr(titulo.secoes).map((s: any, index: number) => (
        <RenderSecao key={`${s?.id ?? ""}-${index}`} secao={s} />
      ))}

      {arr(titulo.artigos).map((a: any, index: number) => (
        <RenderArtigo key={`${a?.id ?? ""}-${index}`} artigo={a} />
      ))}
    </section>
  );
}

export function RenderParte({ parte }: { parte: any }) {
  return (
    <section className="mt-16">
      {texto(parte.titulo) && (
        <h1 className="text-center text-2xl font-bold uppercase tracking-widest">
          {parte.titulo}
        </h1>
      )}

      {arr(parte.titulos).map((t: any, index: number) => (
        <RenderTitulo key={`${t?.id ?? ""}-${index}`} titulo={t} />
      ))}

      {arr(parte.capitulos).map((c: any, index: number) => (
        <RenderCapitulo key={`${c?.id ?? ""}-${index}`} capitulo={c} />
      ))}

      {arr(parte.secoes).map((s: any, index: number) => (
        <RenderSecao key={`${s?.id ?? ""}-${index}`} secao={s} />
      ))}

      {arr(parte.artigos).map((a: any, index: number) => (
        <RenderArtigo key={`${a?.id ?? ""}-${index}`} artigo={a} />
      ))}
    </section>
  );
}

export function RenderPreambulo({ preambulo }: { preambulo: any }) {
  if (!preambulo) return null;

  return (
    <Card className="mb-12 ring-0">
      <CardHeader>
        <CardTitle className="text-center text-lg uppercase tracking-widest">
          {preambulo.titulo || "Preambulo"}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {arr(preambulo.considerandos).map((c: any, index: number) => (
          <p key={`${c?.id ?? ""}-${index}`} className="mt-4 text-base leading-8 text-muted-foreground">
            {textoPrincipal(c)}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}

export default function RenderDocumento({ lei }: { lei: any }) {
  const documento = pegarDocumento(lei);
  const conteudo = pegarConteudo(lei);

  return (
    <>
      <header className="mb-12 text-center">
        <Badge variant="outline" className="mb-4">Papirar</Badge>

        {texto(documento.titulo) && (
          <h1 className="text-3xl font-bold tracking-tight">{documento.titulo}</h1>
        )}

        {documento.decreto?.numero && (
          <p className="mt-3 text-sm text-muted-foreground">
            Decreto n. {documento.decreto.numero}
            {documento.decreto.data ? ` - ${documento.decreto.data}` : ""}
          </p>
        )}

        {documento.lei?.numero && (
          <p className="mt-3 text-sm text-muted-foreground">
            Lei n. {documento.lei.numero}
            {documento.lei.data ? ` - ${documento.lei.data}` : ""}
          </p>
        )}

        {texto(conteudo.apelido) && (
          <p className="mt-2 text-sm text-muted-foreground">{conteudo.apelido}</p>
        )}
      </header>

      <Separator className="mb-10" />

      <RenderPreambulo preambulo={conteudo.preambulo || documento.preambulo} />

      {arr(conteudo.partes).map((p: any, index: number) => (
        <RenderParte key={`${p?.id ?? ""}-${index}`} parte={p} />
      ))}

      {conteudo !== documento &&
        arr(documento.partes).map((p: any, index: number) => (
          <RenderParte key={`${p?.id ?? ""}-${index}`} parte={p} />
        ))}

      {arr(conteudo.titulos).map((t: any, index: number) => (
        <RenderTitulo key={`${t?.id ?? ""}-${index}`} titulo={t} />
      ))}

      {arr(conteudo.capitulos).map((c: any, index: number) => (
        <RenderCapitulo key={`${c?.id ?? ""}-${index}`} capitulo={c} />
      ))}

      {arr(conteudo.secoes).map((s: any, index: number) => (
        <RenderSecao key={`${s?.id ?? ""}-${index}`} secao={s} />
      ))}

      {arr(conteudo.artigos).map((a: any, index: number) => (
        <RenderArtigo key={`${a?.id ?? ""}-${index}`} artigo={a} />
      ))}
    </>
  );
}
