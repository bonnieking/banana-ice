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

async function fetchJsonWithFallback(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (directErr) {
    const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
}

async function fetchTextWithFallback(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (directErr) {
    const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }
}

async function fetchBananaPrice() {
  const csv = await fetchTextWithFallback(BANANA_CSV_URL);
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
  const data = await fetchJsonWithFallback(DIAMOND_INDEX_URL);

  const raw =
    (typeof data?.dcx === "number" ? data.dcx : null) ??
    data?.dcx?.price_usd ??
    data?.price_usd ??
    data?.price;
  const price = Number(raw);
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

function renderError(el, msg) {
  el.textContent = `Unavailable (${msg})`;
}

async function loadPrices() {
  bananaPriceEl.textContent = "Loading...";
  bananaMetaEl.textContent = "";
  diamondPriceEl.textContent = "Loading...";
  diamondMetaEl.textContent = "";
  compareTextEl.textContent = "Loading...";

  const [bananaRes, diamondRes] = await Promise.allSettled([fetchBananaPrice(), fetchDiamondPrice()]);

  let banana = null;
  let diamond = null;

  if (bananaRes.status === "fulfilled") {
    banana = bananaRes.value;
    bananaPriceEl.textContent = usd(banana.value);
    bananaMetaEl.textContent = `Latest banana datum: ${banana.date}`;
  } else {
    renderError(bananaPriceEl, bananaRes.reason?.message || "fetch failed");
  }

  if (diamondRes.status === "fulfilled") {
    diamond = diamondRes.value;
    diamondPriceEl.textContent = usd(diamond.value);
    diamondMetaEl.textContent = diamond.date ? `Latest diamond datum: ${diamond.date}` : "Latest diamond datum: recent";
  } else {
    renderError(diamondPriceEl, diamondRes.reason?.message || "fetch failed");
  }

  if (banana && diamond) {
    renderCompare(banana, diamond);
  } else {
    compareTextEl.textContent = "Comparison unavailable until both live prices load.";
  }
}

refreshBtn.addEventListener("click", loadPrices);
loadPrices();
