import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicFeed } from '../lib/publicSharing'

function FeedCard({ post }) {
  const profile = post.public_profiles || {}
  const recipes = Array.isArray(post.snapshot_json?.recipes) ? post.snapshot_json.recipes : []
  const firstRecipe = recipes[0]
  return (
    <article className="rounded-[28px] bg-surface-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">{profile.display_name || profile.username || 'Allio Cook'}</div>
          <div className="text-xs text-text-muted">{post.post_type.replace('_', ' ')}</div>
        </div>
        <div className="text-xs text-text-muted">{new Date(post.published_at).toLocaleDateString()}</div>
      </div>
      <h2 className="mt-3 font-display text-xl text-text-primary">{post.title || firstRecipe?.title || 'Shared from Allio'}</h2>
      {post.caption ? <p className="mt-2 text-sm text-text-secondary">{post.caption}</p> : null}
      {firstRecipe?.imageUrl ? (
        <img src={firstRecipe.imageUrl} alt={firstRecipe.title || 'Shared post'} className="mt-4 h-48 w-full rounded-2xl object-cover" loading="lazy" />
      ) : null}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-text-muted">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</div>
        <Link to={`/shared-post/${post.id}`} className="rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600">
          View
        </Link>
      </div>
    </article>
  )
}

export function FeedPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listPublicFeed()
      .then((data) => { if (active) setPosts(data) })
      .catch((err) => console.warn('[FeedPage]', err))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="min-h-screen bg-bg-soft px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-text-primary">Community Feed</h1>
          <p className="mt-1 text-sm text-text-secondary">Public recipes, favorites, and plan snapshots from Allio cooks.</p>
        </div>
        {loading ? <div className="text-sm text-text-muted">Loading feed…</div> : null}
        {!loading && posts.length === 0 ? <div className="rounded-3xl bg-surface-card p-6 text-sm text-text-muted shadow-sm">No public posts yet.</div> : null}
        <div className="space-y-4">
          {posts.map((post) => <FeedCard key={post.id} post={post} />)}
        </div>
      </div>
    </div>
  )
}
