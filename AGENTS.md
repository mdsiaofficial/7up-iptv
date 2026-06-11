<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notes for local development:
- Use a root .env file for configuration (IPTV_URL). Do not rely on .env.local in CI or production.
- Preferred runtime: Bun. Use `bun dev` to run the dev server.
- For one-off package binaries, use `bunx` instead of `npx` (e.g., `bunx create-next-app`).

<!-- END:nextjs-agent-rules -->
