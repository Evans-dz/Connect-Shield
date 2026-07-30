import { redirect, notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400
export const dynamicParams = true

export default async function Page({ params }) {
  const ccn = decodeURIComponent(params.ccn || '').trim()
  if (!ccn) notFound()

  const { data } = await db
    .from('ssvi_public')
    .select('slug, fy2025_total_ssvi')
    .ilike('ccn', ccn)
    .maybeSingle()

  if (!data || data.fy2025_total_ssvi === null) notFound()
  redirect(`/hospice/${data.slug}`)
}
