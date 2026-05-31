import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import toast from 'react-hot-toast'
import {
  canNativeShare,
  copyToClipboard,
  createFavoritesShare,
  createRecipeShare,
  getShareUrl,
  nativeShare,
} from '../lib/sharing'

function LinkIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

/**
 * Share modal — pass exactly one of `recipe` or `favorites`.
 *
 * Props:
 *   recipe    — single normalized/raw recipe object (for recipe shares)
 *   favorites — array of recipe objects (for favorites shares)
 *   onClose   — function called to close the modal
 */
export function ShareModal({ recipe, favorites, onClose }) {
  const [status, setStatus] = useState('creating') // creating | ready | error
  const [shareUrl, setShareUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [publishPublicly, setPublishPublicly] = useState(false)
  const [caption, setCaption] = useState('')

  const isRecipe = Boolean(recipe)
  const title = isRecipe
    ? (recipe.title || 'Recipe')
    : `My Favorites (${favorites?.length ?? 0} recipe${(favorites?.length ?? 0) === 1 ? '' : 's'})`

  useEffect(() => {
    let cancelled = false
    async function create() {
      try {
        const token = isRecipe
          ? await createRecipeShare(recipe, { publish: publishPublicly, caption })
          : await createFavoritesShare(favorites, { publish: publishPublicly, caption })
        if (!cancelled) {
          setShareUrl(getShareUrl(token))
          setStatus('ready')
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ShareModal] create failed', err)
          setStatus('error')
        }
      }
    }
    create()
    return () => { cancelled = true }
  }, [])

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await copyToClipboard(shareUrl)
      setCopied(true)
      toast.success('Link copied')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  async function handleNativeShare() {
    if (!shareUrl) return
    try {
      await nativeShare(shareUrl, title)
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not open share sheet')
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-t-[28px] bg-surface-card px-6 pb-8 pt-6 shadow-xl sm:rounded-[28px]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              {isRecipe ? 'Share Recipe' : 'Share Favorites'}
            </div>
            <h2 className="mt-1 font-display text-xl text-text-primary">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-text-muted hover:text-text-primary" aria-label="Close">
            <XIcon />
          </button>
        </div>

        {status === 'creating' && (
          <div className="py-6 text-center text-sm text-text-muted">Creating share link…</div>
        )}

        {status === 'error' && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-red-600">Could not create share link. Please try again.</p>
            <button
              type="button"
              onClick={() => {
                setStatus('creating')
                // Re-trigger useEffect by forcing remount isn't possible here;
                // just retry inline
                ;(async () => {
                  try {
                    const token = isRecipe
                      ? await createRecipeShare(recipe)
                      : await createFavoritesShare(favorites)
                    setShareUrl(getShareUrl(token))
                    setStatus('ready')
                  } catch {
                    setStatus('error')
                  }
                })()
              }}
              className="w-full rounded-full bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
            >
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && shareUrl && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-hidden rounded-2xl border border-divider bg-bg-soft px-4 py-3">
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-text-secondary">
                {shareUrl}
              </span>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-text-secondary">
                <input type="checkbox" checked={publishPublicly} onChange={(e) => setPublishPublicly(e.target.checked)} />
                Also publish to public feed
              </label>
              {publishPublicly ? (
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a short caption"
                  className="w-full rounded-2xl border border-divider bg-bg-soft px-4 py-3 text-sm text-text-primary"
                  rows={3}
                />
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-divider bg-surface-card px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-warm-100"
              >
                <LinkIcon />
                {copied ? 'Copied!' : 'Copy link'}
              </button>
              {canNativeShare() ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
                >
                  <ShareIcon />
                  Share
                </button>
              ) : null}
            </div>
            <p className="text-center text-xs text-text-muted">
              Anyone with this link can view {isRecipe ? 'this recipe' : 'these recipes'}. No login required.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
