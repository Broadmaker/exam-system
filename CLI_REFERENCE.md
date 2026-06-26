# CLI Reference

## Development
```bash
pnpm dev        # Start Vite dev server
pnpm build      # Build frontend (output: dist/)
pnpm preview    # Preview production build
```

## Deploy
```bash
pnpm run deploy:worker   # Deploy Worker (backend) to Cloudflare Workers
pnpm run deploy:pages    # Build frontend + deploy to Cloudflare Pages
```

Pushing to `main` on GitHub triggers Pages auto-deploy (frontend only). Worker changes always need `pnpm run deploy:worker`.
