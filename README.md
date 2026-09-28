# GE Ledger

A React + Vite Old School RuneScape Grand Exchange market desk. It reads current prices and item metadata from the RuneScape Wiki Real-time Prices API, stores snapshots and forecast entries in browser local storage, and compares forecasts with prices after their selected horizon.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.

## Data notes

- This is a personal trading journal and market visualization; it does not place GE orders or connect to a game account.
- History and forecasts currently live in this browser's `localStorage`. Clearing browser site data removes them. Keep the app open periodically to build snapshots.
- The app requests the OSRS Wiki `mapping`, `latest`, and `5m` endpoints. The price API asks clients to identify themselves with a descriptive User-Agent. A browser app cannot set the forbidden `User-Agent` header, so a production deployment should proxy requests through a small server that adds an appropriate identifying header and can provide durable shared history.
