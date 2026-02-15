import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 型定義
export type Event = {
  id: string
  name: string
  artist_name: string
  event_date: string
  venue?: string
  image_url?: string
  is_active: boolean
}

export type GoodsMaster = {
  id: string
  event_id: string
  name: string
  category: string
  description?: string
  image_url?: string
  is_official: boolean
  status: string
}

export type UserGoods = {
  id: string
  user_id: string
  goods_id: string
  type: 'have' | 'want'
  quantity: number
}

export type Match = {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted' | 'completed' | 'cancelled'
  color_code: string | null
  matched_at: string
  completed_at: string | null
}
