import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string
    documentSlug?: string
    contextText?: string
  }

  const text = body.text?.trim()

  if (!text) {
    return NextResponse.json(
      { error: "Selecione um trecho para explicar." },
      { status: 400 }
    )
  }

  const apiKey = process.env.GPT_OSS_API_KEY || process.env.HF_TOKEN
  const baseUrl =
    process.env.GPT_OSS_BASE_URL || "https://router.huggingface.co/v1"
  const model = process.env.GPT_OSS_MODEL || "openai/gpt-oss-120b:fastest"

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Explicacao nao configurada. Configure GPT_OSS_API_KEY no .env.local com um token da Hugging Face para usar o gpt-oss-120b.",
      },
      { status: 503 }
    )
  }

  const explanationSchema = {
    resumo: {
      titulo: "Em resumo",
      texto: "Uma frase simples dizendo a ideia central do trecho.",
    },
    explicacao: {
      titulo: "O que significa?",
      texto:
        "Explique em 4 a 7 frases simples. Mostre o sentido do trecho, a funcao dele na lei e o que o aluno deve entender.",
    },
    termosImportantes: [
      {
        termo: "Termo juridico ou expressao importante do trecho.",
        significado: "Explicacao simples do termo.",
      },
    ],
    passoAPasso: [
      "Primeiro ponto que o aluno deve entender.",
      "Segundo ponto que o aluno deve entender.",
      "Terceiro ponto que o aluno deve entender.",
    ],
    exemploPratico: {
      titulo: "Exemplo pratico",
      situacao: "Crie uma situacao concreta e simples.",
      conclusao: "Explique a conclusao juridica do exemplo.",
    },
    exemploConcurso: {
      titulo: "Como pode cair em prova",
      situacao: "Crie uma afirmacao ou situacao curta no estilo de concurso.",
      resposta: "Diga se esta certo ou errado, ou qual seria a conclusao.",
      explicacao: "Explique o motivo em linguagem simples.",
    },
    pegadinha: {
      titulo: "Pegadinha comum",
      afirmacao: "Escreva uma confusao comum sobre o trecho.",
      gabarito: "Certo ou Errado, quando fizer sentido.",
      explicacao:
        "Explique por que a afirmacao esta correta ou errada. Se nao houver pegadinha real, escreva: Nao ha pegadinha relevante neste trecho.",
    },
    memorize: {
      titulo: "Para memorizar",
      frase: "Uma frase curta para o aluno lembrar.",
    },
  }

  const systemPrompt = [
    "Voce e um professor de Direito para alunos iniciantes em concursos publicos.",
    "Explique exclusivamente o trecho de lei brasileira selecionado pelo usuario.",
    "Use portugues simples, direto e didatico, como se estivesse explicando para quem esta vendo o assunto pela primeira vez.",
    "Nao invente artigo, excecao, jurisprudencia, doutrina ou contexto que nao esteja no trecho ou no contexto enviado.",
    "Use o contexto apenas para evitar interpretacao errada do trecho selecionado.",
    "Se o trecho depender de outra parte da lei que nao foi enviada, informe isso claramente.",
    "Evite respostas vagas como 'garante direitos' ou 'estabelece regras'. Explique exatamente o que o trecho faz.",
    "Quando houver termo juridico importante, explique o termo com palavras simples.",
    "Use exemplos concretos, de preferencia com nomes ficticios e situacoes faceis.",
    "Retorne SOMENTE JSON valido.",
    "Nao use Markdown.",
    "Nao use bloco de codigo.",
    "Nao use texto fora do JSON.",
    "",
    "Formato obrigatorio:",
    JSON.stringify(explanationSchema, null, 2),
  ].join("\n")

  const userPrompt = [
    `Documento: ${body.documentSlug || "lei"}`,
    "",
    "Contexto proximo, se houver:",
    body.contextText || "Nao enviado.",
    "",
    "Trecho selecionado:",
    text,
    "",
    "Explique apenas o trecho selecionado.",
    "Use o contexto somente para evitar erro de interpretacao.",
    "A explicacao deve ser didatica para aluno iniciante.",
    "Retorne apenas JSON valido.",
  ].join("\n")

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")

    return NextResponse.json(
      {
        error:
          details ||
          `Nao foi possivel gerar a explicacao com ${model} agora.`,
      },
      { status: response.status }
    )
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const explanation = data.choices?.[0]?.message?.content?.trim()

  return NextResponse.json({
    explanation: explanation || "Nao foi possivel gerar a explicacao agora.",
  })
}
