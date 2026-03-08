const bananaPriceEl = document.getElementById("banana-price");
const bananaMetaEl = document.getElementById("banana-meta");
const diamondPriceEl = document.getElementById("diamond-price");
const diamondMetaEl = document.getElementById("diamond-meta");
const compareTextEl = document.getElementById("compare-text");
const refreshBtn = document.getElementById("refresh");

const BANANA_CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=PBANSOPUSDM";
const DIAMOND_INDEX_URL = "https://data.openfacet.net/index.json";
const CORS_PROXY = "https://api.allorigins.win/raw?url=";

function usd(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
}

async function tryFetchJson(url) {
  const direct = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  const proxied = fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  return Promise.any([direct, proxied]);
}

async function tryFetchText(url) {
  const direct = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });

  const proxied = fetch(`${CORS_PROXY}${encodeURIComponent(url)}`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  });

  return Promise.any([direct, proxied]);
}

async function fetchBananaPrice() {
  const csv = await tryFetchText(BANANA_CSV_URL);
  const lines = csv.trim().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => line.split(","));
  const valid = rows.filter((r) => r.length >= 2 && r[1] !== ".");

  if (valid.length === 0) throw new Error("No banana data");

  const [date, value] = valid[valid.length - 1];
  return {
    date,
    value: Number(value),
  };
}

async function fetchDiamondPrice() {
  const data = await tryFetchJson(DIAMOND_INDEX_URL);

  const price = Number(data?.dcx?.price_usd ?? data?.price_usd ?? data?.price);
  const updated = data?.dcx?.updated_at ?? data?.updated_at ?? "";

  if (!Number.isFinite(price)) throw new Error("No diamond data");

  return {
    date: updated,
    value: price,
  };
}

function renderCompare(banana, diamond) {
  const ratio = diamond.value / banana.value;
  compareTextEl.textContent = `${usd(diamond.value)} is about ${ratio.toFixed(0)}x one banana benchmark unit (${usd(banana.value)}).`;
}

async function loadPrices() {
  bananaPriceEl.textContent = "Loading...";
  diamondPriceEl.textContent = "Loading...";
  compareTextEl.textContent = "Loading...";

  try {
    const [banana, diamond] = await Promise.all([fetchBananaPrice(), fetchDiamondPrice()]);

    bananaPriceEl.textContent = usd(banana.value);
    bananaMetaEl.textContent = `Latest banana datum: ${banana.date}`;

    diamondPriceEl.textContent = usd(diamond.value);
    diamondMetaEl.textContent = diamond.date ? `Latest diamond datum: ${diamond.date}` : "Latest diamond datum: recent";

    renderCompare(banana, diamond);
  } catch (err) {
    bananaPriceEl.textContent = "Unavailable";
    diamondPriceEl.textContent = "Unavailable";
    compareTextEl.textContent = `Could not fetch live prices. ${err.message}`;
  }
}

refreshBtn.addEventListener("click", loadPrices);
loadPrices();
