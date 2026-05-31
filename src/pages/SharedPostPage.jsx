import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function SharedRecipeCard({ recipe }) {
  return (
    <div className="rounded-[28px] bg-surface-card p-5 shadow-sm">
      <h2 className="font-display text-2xl text-text-primary">{recipe.title}</h2>
      {recipe.description ? <p className="mt-2 text-sm text-text-secondary">{recipe.description}</p> : null}
      {recipe.imageUrl ? <img src={recipe.imageUrl} alt={recipe.title} className="mt-4 h-56 w-full rounded-2xl object-cover" /> : null}
    </div>
  )
}

export function SharedPostPage() {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const { data, error } = await supabase
        .from('public_posts')
        .select('*, public_profiles(username, display_name, avatar_url, is_public)')
        .eq('id', postId)
        .maybeSingle()
      if (!active) return
      if (error) console.warn('[SharedPostPage]', error)
      setPost(data || null)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [postId])

  if (loading) return <div className="min-h-screen bg-bg-soft px-4 py-8 text-sm text-text-muted">Loading…</div>
  if (!post) return <div className="min-h-screen bg-bg-soft px-4 py-8 text-sm text-text-muted">Post not found.</div>

  const recipes = Array.isArray(post.snapshot_json?.recipes) ? post.snapshot_json.recipes : []
  const profile = post.public_profiles || {}

  return (
    <div className="min-h-screen bg-bg-soft px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/feed" className="text-sm text-text-secondary">← Back to feed</Link>
        <div className="mt-4 rounded-[28px] bg-surface-card p-5 shadow-sm">
          <div className="text-sm font-semibold text-text-primary">{profile.display_name || profile.username || 'Allio Cook'}</div>
          <h1 className="mt-2 font-display text-3xl text-text-primary">{post.title || 'Shared from Allio'}</h1>
          {post.caption ? <p className="mt-2 text-sm text-text-secondary">{post.caption}</p> : null}
        </div>
        <div className="mt-4 space-y-4">
          {recipes.map((recipe, index) => <SharedRecipeCard key={`${recipe.title || 'recipe'}-${index}`} recipe={recipe} />)}
        </div>
      </div>
    </div>
  )
}
