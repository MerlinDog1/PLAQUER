# PLAQUER (plaques.ai)

AI-powered plaque design studio built with React + Vite.

## What changed

- Restored missing source folders (`components/`, `services/`) so builds work again.
- Removed AI Studio-only runtime assumptions.
- Wired AI calls through secure Supabase proxy endpoint (no browser API key exposure).
- Added base stylesheet (`index.css`) and print/no-print helpers.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## AI backend

Frontend calls:

`https://wbtpizrlayiedgwrtpwl.functions.supabase.co/gemini-proxy`

- `task: "text"` for SVG layout generation
- `task: "image"` for realistic preview generation (with image mask support)

## Notes

- Keep secrets in Supabase Edge Function environment variables (`GEMINI_API_KEY` / `IMAGEN_API_KEY`).
- Do not place provider keys in frontend `.env` files.
