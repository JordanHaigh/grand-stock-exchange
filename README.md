# GE Ledger

A React + Vite Old School RuneScape Grand Exchange market desk. It reads current prices and item metadata from the RuneScape Wiki Real-time Prices API, stores snapshots and forecast entries in browser local storage, and compares forecasts with prices after their selected horizon. The interface uses a warm, worn timber and gold palette inspired by Old School RuneScape.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:4173`. On first launch, enter a descriptive User-Agent identifier in the connection dialog. To create and serve a production build, run `npm run build` then `npm start`.

## Data notes

- This is a personal trading journal and market visualization; it does not place GE orders or connect to a game account.
- History and forecasts currently live in this browser's `localStorage`. Clearing browser site data removes them. Keep the app open periodically to build snapshots.
- The app requests the OSRS Wiki `mapping`, `latest`, and `5m` endpoints through `server.mjs`, which forwards the browser-saved identifier as the request's `User-Agent` header. The Wiki price API asks for a descriptive User-Agent; it does not require an API key.
- The User-Agent identifier is stored in this browser's local storage and sent to the local app server for each market data request. Enter an app description and, if you want, a contact detail so the Wiki maintainers can identify the client.
- Run the Node server in production as well as during development; the server provides the same-origin API route that adds the User-Agent header.
