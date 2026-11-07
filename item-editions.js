export const EDITION_CUTOFF = "2024-09-17";

// Publication dates are from the 5etools book index; AU/AUD and WoW/ICC
// include their paired adventure or map-pack source codes.
export const sourcePublishedDates = {
  AU: "2026-09-15",
  AUD: "2026-09-15",
  EFA: "2025-12-09",
  FRHoF: "2025-11-11",
  HotB: "2025-10-02",
  ICC: "2026-11-17",
  LFL: "2025-11-18",
  NF: "2025-11-11",
  RHW: "2026-06-16",
  WoW: "2026-11-17",
  XDMG: "2024-11-12",
  XMM: "2025-02-18",
  XPHB: "2024-09-17",
};

export const edition2024Sources = new Set(
  Object.entries(sourcePublishedDates)
    .filter(([, published]) => published >= EDITION_CUTOFF)
    .map(([source]) => source),
);

function getLinkedSources(item) {
  const sources = [item?.source];
  for (const source of item?.otherSources ?? []) sources.push(source?.source);
  for (const reprint of item?.reprintedAs ?? []) {
    const uid = typeof reprint === "string" ? reprint : reprint?.uid;
    const source = String(uid ?? "").split("|")[1];
    if (source) sources.push(source);
  }
  return sources.filter(Boolean);
}

export function getItemEditions(item) {
  const editions = new Set();
  for (const source of getLinkedSources(item)) {
    editions.add(edition2024Sources.has(source) ? "2024" : "2014");
  }
  return editions;
}

export function belongsToEdition(item, edition) {
  return getItemEditions(item).has(String(edition));
}
