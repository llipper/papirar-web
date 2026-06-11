import LeiReaderClient from "./reader-client"

export default async function LeiPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  return <LeiReaderClient slug={slug} />
}
