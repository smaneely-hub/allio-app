import { supabase } from './supabase'

async function getAuthUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function getMyPublicProfile() {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('public_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function saveMyPublicProfile(profile) {
  const userId = await getAuthUserId()
  const payload = {
    user_id: userId,
    username: profile.username || null,
    display_name: profile.display_name || null,
    bio: profile.bio || null,
    avatar_url: profile.avatar_url || null,
    is_public: Boolean(profile.is_public),
    updated_at: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('public_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function listPublicFeed({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('public_posts')
    .select('*, public_profiles(username, display_name, avatar_url, is_public)')
    .eq('visibility', 'public')
    .order('published_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function listMyPublicPosts() {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('public_posts')
    .select('*')
    .eq('user_id', userId)
    .order('published_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPublicPost({ postType, title, caption, snapshot, visibility = 'public' }) {
  const userId = await getAuthUserId()
  const { data, error } = await supabase
    .from('public_posts')
    .insert({
      user_id: userId,
      post_type: postType,
      title: title || null,
      caption: caption || null,
      snapshot_json: snapshot,
      visibility,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}
