# Relic Item Browser

A searchable field guide for the item datasets under `data/sources/`. Each source has its own JSON file, and `data/manifest.json` lists the source codes and item counts.

The home page is a neutral system chooser. The D&D 5e browser is available at `/dnd.html`; the Pathfinder 2e browser is at `/pf2e.html`. The PF2E page loads the public item index and source data from the [Pf2eTools repository](https://github.com/Pf2eToolsOrg/Pf2eTools) when opened, and expands item variants for browsing. An internet connection is required for that page.

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
