# Relic Item Browser

A searchable field guide for the item datasets under `data/sources/`. Each source has its own JSON file, and `data/manifest.json` lists the source codes and item counts.

## Run locally

Requires Node.js 18 or later. Start the local server with:

```sh
node server.js
```

Then open <http://127.0.0.1:4174>.

## Tests

Run the item filtering and summary unit tests with:

```sh
node --test
```
