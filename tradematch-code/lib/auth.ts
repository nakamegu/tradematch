import { supabase } from './supabase'

/**
 * セッション確認 → なければ signInAnonymously() → user.id を返す
 * アプリ起動時（page.tsx の handleStart）で1回呼ぶ
 */
export async function ensureAuth(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    return session.user.id
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    throw new Error(`Anonymous sign-in failed: ${error?.message}`)
  }

  return data.user.id
}

/**
 * 既存セッションから user.id を返す（セッション作成しない）
 * matching/page.tsx 等で userId が必要な場所で使う
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}
