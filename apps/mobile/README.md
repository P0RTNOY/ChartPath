# ChartPath mobile

Expo Router client for the ChartPath Hebrew-first learning beta. It provides the guest onboarding,
learning path, lessons, deterministic exercises, review, glossary, progress, and local settings
experience on iOS, Android, and web.

Run commands from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm mobile:web
pnpm --filter @chartpath/mobile test
pnpm --filter @chartpath/mobile export:web
```

No API key, account, analytics service, live-market feed, or network connection is required for the
core journey. Native progress uses SQLite; the web verification target uses local storage through
the same repository contract.
