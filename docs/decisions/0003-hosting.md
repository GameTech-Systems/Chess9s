# 0003: Hosting

**Status:** Provisional (confirm terms at signup)

## Decision
Host the static app on Cloudflare's free tier at chess9s.com. The story site at chessnines.com is a separate project.

## Reasons
Third-party comparisons report unmetered static bandwidth and commercial use allowed on the free tier, which suits a project with merchandise and media plans. Vercel's free Hobby tier is restricted to non-commercial use. Cloudflare steers new projects toward Workers with Static Assets while Pages remains supported, so follow Cloudflare's current documentation for a static Vite app.

## Fallbacks
Netlify or GitHub Pages.
