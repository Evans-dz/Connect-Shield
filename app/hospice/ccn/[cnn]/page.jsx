import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

export default async function Page({ params }) {
  const ccn = decodeURIComponent(params.cnn || '').trim()
  if (!ccn) redirect('/hospice')

  const { data } = await db
    .from('ssvi_public')
    .select('slug, fy2025_total_ssvi')
    .ilike('ccn', ccn)
    .limit(1)

  const row = data && data[0]
  if (!row || row.fy2025_total_ssvi === null) redirect('/hospice')

  redirect(`/hospice/${row.slug}`)
}
