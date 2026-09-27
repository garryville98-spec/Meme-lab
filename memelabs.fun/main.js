/* ══════════════════════════════
   TOKEN CONFIG
══════════════════════════════ */
const TOKENS = [
  { name: "ODAI",     sub: "ODEI AI",    img: "./assets/images/odai.webp",     chain: "base",   receiver: "0x9349...44e0", rcolor: "#f5a623" },
  { name: "NOELCLAW", sub: "Noel Claw",  img: "./assets/images/cash.webp",      chain: "base",   receiver: "0x179b...a02e", rcolor: "#fbbf24" },
  { name: "OSO",      sub: "Osobot",     img: "./assets/images/oso-_1_.webp",  chain: "base",   receiver: "0xa184...7F2B", rcolor: "#f59e0b" },
  { name: "TAKEOVER", sub: "Takeover",   img: "./assets/images/takeover.webp", chain: "base",   receiver: "0x93e7...4bdC", rcolor: "#d4891a" },
  { name: "FLNCHY",   sub: "Flinchy",    img: "./assets/images/up.webp",       chain: "base",   receiver: "0x2f41...8aEd", rcolor: "#3b82f6" },
  { name: "MLTL",     sub: "Multilabel", img: "./assets/images/odai.webp",     chain: "base",   receiver: "0x7c32...91fA", rcolor: "#8b5cf6" },
  { name: "DOGAI",    sub: "Dog AI",     img: "./assets/images/cash.webp",     chain: "base",   receiver: "0x4d9a...22bE", rcolor: "#f5a623" },
  { name: "ZXBT",     sub: "ZXBT",       img: "./assets/images/up.webp",       chain: "base",   receiver: "0x8e1f...33cD", rcolor: "#fbbf24" },
  {
    name:     "CVT",
    sub:      "CoinVault Token",
    img:      "./assets/images/download.jpeg",
    chain:    "solana",
    ca:       "5aYjJdXSobATG1rFbdBz8wd2jrJbHhNNbU1LbJKgYGV5",
    receiver: "5aYjJd...YGV5",
    rcolor:   "#f5a623",
    price:    0.001,
    mcap:     "$1,000,000",
    vol:      "--",
    change:   0,
    earned:   "--",
    isStatic: true,
  },
];

/* ══════════════════════════════
   LIVE DATA STORE
   static tokens keep their preset
   price/mcap and won't be overwritten
══════════════════════════════ */
let liveData = TOKENS.map(t => ({
  ...t,
  price:  t.price  || null,
  mcap:   t.mcap   || "--",
  vol:    t.vol    || "--",
  change: t.change || 0,
  earned: t.earned || "--",
}));

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
const ri     = arr => arr[Math.floor(Math.random() * arr.length)];
const rAddr  = ()  => "0x" + Math.random().toString(16).slice(2,8) + "..." + Math.random().toString(16).slice(2,6);

function fmtUSD(n) {
  if (!n || isNaN(n)) return "--";
  if (n >= 1_000_000_000) return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toFixed(6);
}

function parseUSD(str) {
  if (!str || str === "--") return 0;
  const n = parseFloat(str.replace(/[$BMK,]/g, ""));
  if (str.includes("B")) return n * 1_000_000_000;
  if (str.includes("M")) return n * 1_000_000;
  if (str.includes("K")) return n * 1_000;
  return n;
}

function bestPair(pairs, preferChain) {
  if (!pairs?.length) return null;
  const onChain = pairs.filter(p => p.chainId === preferChain);
  const pool = onChain.length ? onChain : pairs;
  return pool.sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0))[0];
}

function pairToData(pair) {
  if (!pair) return null;
  const vol24h = pair.volume?.h24 || 0;
  return {
    price:  parseFloat(pair.priceUsd) || 0,
    mcap:   fmtUSD(pair.fdv || pair.marketCap || 0),
    vol:    fmtUSD(vol24h),
    change: parseFloat(pair.priceChange?.h24) || 0,
    earned: fmtUSD(vol24h * 0.01),
    ca:     pair.baseToken?.address || "",
  };
}

/* ══════════════════════════════
   PRICE FETCHING
══════════════════════════════ */
async function fetchTokenPrice(token) {
  try {
    const res  = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(token.name)}`);
    const data = await res.json();
    const pairs = (data.pairs || []).filter(p =>
      p.baseToken?.symbol?.toUpperCase() === token.name.toUpperCase()
    );
    return pairToData(bestPair(pairs, token.chain));
  } catch(e) {
    console.warn(`[${token.name}]`, e.message);
    return null;
  }
}

async function fetchAllPrices() {
  const results = await Promise.all(TOKENS.map(fetchTokenPrice));
  results.forEach((r, i) => { if (r && !TOKENS[i].isStatic) liveData[i] = { ...liveData[i], ...r }; });
  renderTable(liveData);
  updateHeroStats(liveData);
  updateHeroCoins(liveData);
  updateVolBox(liveData);
}

/* ══════════════════════════════
   SEARCH — by name OR contract address
   Hits DexScreener live, shows dropdown
   results with price, mcap, chain info
══════════════════════════════ */
let searchTimeout = null;

function initSearch() {
  const input    = document.querySelector(".search-wrap input");
  const wrap     = document.querySelector(".search-wrap");
  if (!input || !wrap) return;

  // Create dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "search-dropdown";
  dropdown.style.display = "none";
  wrap.appendChild(dropdown);

  input.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim();

    if (q.length < 2) {
      closeDropdown(dropdown);
      return;
    }

    // Debounce 400ms so we don't spam the API
    searchTimeout = setTimeout(() => runSearch(q, dropdown), 400);
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) closeDropdown(dropdown);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDropdown(dropdown);
  });
}

async function runSearch(query, dropdown) {
  dropdown.innerHTML = `<div class="sd-loading">
    <span class="sd-spinner"></span> Searching...
  </div>`;
  dropdown.style.display = "block";

  const q = query.trim().toLowerCase();

  // Always check local tokens first (including static ones not on DexScreener)
  const localMatches = TOKENS.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.sub.toLowerCase().includes(q) ||
    (t.ca && t.ca.toLowerCase().includes(q))
  );

  // Build local result cards
  function localCard(t) {
    const live      = liveData.find(d => d.name === t.name) || t;
    const priceStr  = live.price ? "$" + (live.price < 0.01 ? live.price.toFixed(6) : live.price.toFixed(4)) : "--";
    const chgClass  = live.change >= 0 ? "sd-pos" : "sd-neg";
    const chgSign   = live.change >= 0 ? "↑" : "↓";
    const shortCA   = t.ca ? t.ca.slice(0,6) + "..." + t.ca.slice(-4) : "Local token";
    const mcapDisp  = live.mcap && live.mcap !== "--" ? live.mcap : (t.mcap || "--");
    return `
      <div class="sd-item sd-local" onclick="selectSearchResult('${t.name}','${t.ca||""}','${t.chain||""}','${live.price||0}','${t.img}')">
        <div class="sd-item-left">
          <img src="${t.img}" onerror="this.src='./assets/images/odai.webp'" class="sd-img" alt="${t.name}">
          <div class="sd-item-info">
            <div class="sd-item-name">
              <span class="sd-symbol">${t.name}</span>
              <span class="sd-fullname">${t.sub}</span>
              <span class="sd-chain-badge">${t.chain || "local"}</span>
              ${t.isStatic ? '<span class="sd-chain-badge" style="background:rgba(245,166,35,0.15);color:#f5a623;border-color:rgba(245,166,35,0.3);">Listed</span>' : ""}
            </div>
            <div class="sd-item-addr">${shortCA}</div>
          </div>
        </div>
        <div class="sd-item-right">
          <div class="sd-price">${priceStr}</div>
          <div class="${chgClass}">${live.change !== 0 ? chgSign + " " + Math.abs(live.change).toFixed(2) + "%" : "--"}</div>
          <div class="sd-meta">MCap ${mcapDisp}</div>
        </div>
      </div>`;
  }

  try {
    const res   = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);
    const data  = await res.json();
    const pairs = data.pairs || [];

    // Deduplicate by token address, keep highest liquidity pair per token
    const seen = new Map();
    for (const p of pairs) {
      const key = p.baseToken?.address?.toLowerCase();
      if (!key) continue;
      if (!seen.has(key) || (p.liquidity?.usd||0) > (seen.get(key).liquidity?.usd||0)) {
        seen.set(key, p);
      }
    }

    // Filter out any DexScreener results that match our local tokens (avoid duplicates)
    const localCAs = new Set(TOKENS.map(t => (t.ca || "").toLowerCase()));
    const top = [...seen.values()]
      .filter(p => !localCAs.has((p.baseToken?.address || "").toLowerCase()))
      .sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0))
      .slice(0, 6);

    // If no external results AND no local matches
    if (top.length === 0 && localMatches.length === 0) {
      dropdown.innerHTML = `<div class="sd-empty">No tokens found for "<strong>${query}</strong>"</div>`;
      return;
    }

    // Build external result cards
    const externalCards = top.map(p => {
      const symbol   = p.baseToken?.symbol  || "?";
      const name     = p.baseToken?.name    || symbol;
      const addr     = p.baseToken?.address || "";
      const chain    = p.chainId            || "";
      const price    = parseFloat(p.priceUsd) || 0;
      const change   = parseFloat(p.priceChange?.h24) || 0;
      const mcap     = fmtUSD(p.fdv || p.marketCap || 0);
      const chgClass = change >= 0 ? "sd-pos" : "sd-neg";
      const chgSign  = change >= 0 ? "↑" : "↓";
      const shortAddr = addr ? addr.slice(0,6) + "..." + addr.slice(-4) : "";
      const priceStr  = price < 0.000001 ? price.toExponential(2)
                      : price < 0.01     ? "$" + price.toFixed(6)
                      : price < 1        ? "$" + price.toFixed(4)
                      :                    "$" + price.toFixed(2);
      const imgSrc = `https://dd.dexscreener.com/ds-data/tokens/${chain}/${addr}.png`;

      return `
        <div class="sd-item" data-addr="${addr}" data-chain="${chain}" onclick="selectSearchResult('${symbol}','${addr}','${chain}','${p.priceUsd || 0}','${imgSrc}')">
          <div class="sd-item-left">
            <img src="${imgSrc}" onerror="this.src='./assets/images/odai.webp'" class="sd-img" alt="${symbol}">
            <div class="sd-item-info">
              <div class="sd-item-name">
                <span class="sd-symbol">${symbol}</span>
                <span class="sd-fullname">${name}</span>
                <span class="sd-chain-badge">${chain}</span>
              </div>
              <div class="sd-item-addr" title="${addr}">${shortAddr}</div>
            </div>
          </div>
          <div class="sd-item-right">
            <div class="sd-price">${priceStr}</div>
            <div class="${chgClass}">${chgSign} ${Math.abs(change).toFixed(2)}%</div>
            <div class="sd-meta">MCap ${mcap}</div>
          </div>
        </div>`;
    });

    // Divider between local and external
    const divider = (localMatches.length > 0 && top.length > 0)
      ? `<div style="padding:6px 14px;font-size:10px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid rgba(255,255,255,0.05);">External results</div>`
      : "";

    dropdown.innerHTML =
      localMatches.map(localCard).join("") +
      divider +
      externalCards.join("");

  } catch(e) {
    // If DexScreener fails, still show local matches
    if (localMatches.length > 0) {
      dropdown.innerHTML = localMatches.map(localCard).join("");
    } else {
      dropdown.innerHTML = `<div class="sd-empty">Search failed. Check your connection.</div>`;
    }
  }
}
function closeDropdown(dropdown) {
  if (dropdown) dropdown.style.display = "none";
}

// Called when user clicks a search result — ALWAYS stays on our site
window.selectSearchResult = async function(symbol, addr, chain, priceUsd, imgUrl) {
  const input    = document.querySelector(".search-wrap input");
  const dropdown = document.querySelector(".search-dropdown");
  if (input) input.value = "";
  closeDropdown(dropdown);

  // Check if it's already one of our tracked tokens
  const tracked = liveData.find(t => t.name.toUpperCase() === symbol.toUpperCase());

  if (tracked) {
    // Scroll to table row + open modal
    const row = [...document.querySelectorAll("#coinTableBody tr")].find(tr =>
      tr.querySelector(".coin-info-name")?.textContent.toUpperCase() === symbol.toUpperCase()
    );
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      row.classList.add("row-highlight");
      setTimeout(() => row.classList.remove("row-highlight"), 2000);
    }
    openTradeModal(symbol);
    return;
  }

  // Not in our list — build a temp token object from search result data
  // so we can open the trade modal directly without going anywhere
  const tempToken = {
    name:     symbol,
    sub:      symbol,
    img:      imgUrl || "./assets/images/odai.webp",
    chain:    chain,
    receiver: addr ? addr.slice(0,6) + "..." + addr.slice(-4) : "--",
    rcolor:   "#f5a623",
    ca:       addr,
    price:    parseFloat(priceUsd) || 0,
    mcap:     "--",
    vol:      "--",
    change:   0,
    earned:   "--",
  };

  // If we already have the price from the search result, use it
  // Otherwise fetch it quickly from DexScreener
  if (!tempToken.price && addr) {
    try {
      const res  = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
      const data = await res.json();
      const pair = bestPair(data.pairs || [], chain);
      if (pair) {
        tempToken.price  = parseFloat(pair.priceUsd) || 0;
        tempToken.mcap   = fmtUSD(pair.fdv || pair.marketCap || 0);
        tempToken.vol    = fmtUSD(pair.volume?.h24 || 0);
        tempToken.change = parseFloat(pair.priceChange?.h24) || 0;
      }
    } catch(e) {
      console.warn("Could not fetch price for", symbol);
    }
  }

  // Temporarily inject into liveData so openTradeModal can find it
  const existingIdx = liveData.findIndex(t => t.ca === addr);
  if (existingIdx >= 0) {
    liveData[existingIdx] = { ...liveData[existingIdx], ...tempToken };
  } else {
    liveData.push(tempToken);
  }

  openTradeModal(symbol);
};

/* ══════════════════════════════
   TICKER BAR
══════════════════════════════ */
const tickerActions = ["buy","sell","launch"];
let lastTA = null;

function getTA() {
  let a;
  do { a = ri(tickerActions); } while (a === lastTA);
  lastTA = a;
  return a;
}

function makeTickerCoin() {
  const token  = ri(TOKENS);
  const live   = liveData.find(d => d.name === token.name);
  const action = getTA();
  const price  = live?.price
    ? "$" + (live.price < 0.01 ? live.price.toFixed(6) : live.price.toFixed(4))
    : "$" + (Math.random()*1400+10).toFixed(2);
  const label = action==="buy" ? `Buy ${price}` : action==="sell" ? `Sell ${price}` : "Launched";
  return `<div class="ticker-coin">
    <img src="${token.img}" alt="${token.name}">
    <span class="tc-name">${token.name}</span>
    <span class="tc-addr">${rAddr()}</span>
    <span class="tc-action ${action}">${label}</span>
  </div>`;
}

function initTicker() {
  const track = document.getElementById("tickerTrack");
  let html = "";
  for (let i = 0; i < 20; i++) html += makeTickerCoin();
  track.innerHTML = html + html;
  setInterval(() => { track.innerHTML += makeTickerCoin(); }, 5000);
}

/* ══════════════════════════════
   HERO STATS
══════════════════════════════ */
function updateHeroStats(data) {
  const total = data.reduce((s,t) => s + parseUSD(t.vol), 0);
  const el = document.getElementById("heroVolume");
  if (el) el.textContent = total > 0 ? fmtUSD(total) : "--";
}

/* ══════════════════════════════
   HERO COINS GRID
══════════════════════════════ */
function initHeroCoins()        { updateHeroCoins(liveData); }
function updateHeroCoins(data)  {
  const grid = document.getElementById("heroCoinsGrid");
  if (!grid) return;
  [...data].sort((a,b) => parseUSD(b.mcap)-parseUSD(a.mcap)).slice(0,8)
    .forEach((c, i) => {
      const card = grid.children[i];
      if (!card) return;
      const mcapEl = card.querySelector(".hero-coin-mcap");
      if (mcapEl) {
        mcapEl.textContent = c.mcap;
        mcapEl.classList.toggle("loading", c.mcap === "--");
      }
    });

  if (!grid.children.length) {
    grid.innerHTML = [...data].sort((a,b) => parseUSD(b.mcap)-parseUSD(a.mcap)).slice(0,8).map(c=>`
      <div class="hero-coin-card" onclick="openSidePanel('${c.name}')" style="cursor:pointer;">
        <div class="hero-coin-img"><img src="${c.img}" alt="${c.name}"></div>
        <div class="hero-coin-name">${c.name}</div>
        <div class="hero-coin-mcap ${c.mcap==='--'?'loading':''}">${c.mcap}</div>
      </div>`).join("");
  }
}

/* ══════════════════════════════
   VOL BOX
══════════════════════════════ */
function updateVolBox(data) {
  const tbody = document.getElementById("volTableBody");
  if (!tbody) return;
  tbody.innerHTML = [...data].sort((a,b)=>parseUSD(b.vol)-parseUSD(a.vol)).slice(0,3).map(c=>`
    <tr onclick="openSidePanel('${c.name}')" style="cursor:pointer;">
      <td><div class="vol-coin-cell"><div class="vol-avatar"><img src="${c.img}" alt="${c.name}"></div>${c.name}</div></td>
      <td>
        <div>${c.mcap}</div>
        <span class="${c.change<0?'down-badge':'up-badge'}">${c.change<0?'↓':'↑'} ${Math.abs(c.change).toFixed(1)}%</span>
      </td>
      <td><span class="vol-num">${c.vol}</span></td>
    </tr>`).join("");
}

/* ══════════════════════════════
   SPARKLINE
══════════════════════════════ */
function makeSpark(down) {
  const pts = Array.from({length:8},(_,i)=>{
    const y = 13+(Math.random()*10)*(down?(i/7):(1-i/7));
    return `${i*(56/7)},${y}`;
  });
  return `<svg class="sparkline" viewBox="0 0 56 26">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${down?"#f87171":"#4ade80"}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ══════════════════════════════
   COIN TABLE
══════════════════════════════ */
function renderTable(data) {
  const tbody = document.getElementById("coinTableBody");
  if (!tbody) return;
  tbody.innerHTML = data.map(c=>`
    <tr>
      <td>
        <div class="coin-cell">
          <div class="coin-avatar"><img src="${c.img}" alt="${c.name}"></div>
          <div>
            <div class="coin-info-name">${c.name}</div>
            <div class="coin-info-sub">${c.sub}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-weight:500" class="${c.mcap==='--'?'loading':''}">${c.mcap}</div>
        <div class="${c.change<0?'change-neg':'change-pos'}">
          ${c.change!==0?(c.change<0?'↓':'↑')+' '+Math.abs(c.change).toFixed(1)+'%':'--'}
        </div>
      </td>
      <td>
        ${makeSpark(c.change<0)}
        <span style="color:rgba(255,255,255,0.6);font-size:12px" class="${c.vol==='--'?'loading':''}">${c.vol}</span>
      </td>
      <td>
        <div class="receiver-pill">
          <div class="receiver-dot" style="background:${c.rcolor}"></div>
          ${c.ca ? c.ca.slice(0,6)+"..."+c.ca.slice(-4) : c.receiver}
        </div>
      </td>
      <td><span class="earned-val ${c.earned==='--'?'loading':''}">${c.earned}</span></td>
      <td><button class="btn-trade" onclick="openTradeModal('${c.name}')">Trade</button></td>
    </tr>`).join("");
}

/* ══════════════════════════════
   TABS
══════════════════════════════ */
function initTabs() {
  document.querySelectorAll(".coin-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".coin-tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active");
      const label = tab.textContent.trim().toLowerCase();
      let sorted  = [...liveData];
      if      (label.includes("top"))      sorted.sort((a,b)=>parseUSD(b.mcap)-parseUSD(a.mcap));
      else if (label.includes("high"))     sorted.sort((a,b)=>parseUSD(b.vol)-parseUSD(a.vol));
      else if (label.includes("new"))      sorted.sort(()=>Math.random()-0.5);
      else                                 sorted.sort((a,b)=>Math.abs(b.change)-Math.abs(a.change));
      renderTable(sorted);
    });
  });
}

/* ══════════════════════════════
   THEME TOGGLE
══════════════════════════════ */
function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  const moon = toggle.querySelector(".moon");
  const sun  = toggle.querySelector(".sun");
  moon.classList.add("active");
  toggle.addEventListener("click", () => {
    const isDark = moon.classList.contains("active");
    moon.classList.toggle("active", !isDark);
    sun.classList.toggle("active", isDark);
  });
}

/* ══════════════════════════════
   INIT
══════════════════════════════ */
document.addEventListener("DOMContentLoaded", async () => {
  initTicker();
  initHeroCoins();
  renderTable(liveData);
  initTabs();
  initThemeToggle();
  initSearch();             // ← live search

  await fetchAllPrices();
  setInterval(fetchAllPrices, 30_000);
});

/* ══════════════════════════════
   TRADE MODAL
══════════════════════════════ */
let modalToken   = null;   // current token object
let modalMode    = "buy";  // "buy" | "sell"
let walletConnected = false;

// Open modal — called from Trade button or search result click
window.openTradeModal = function(tokenName) {
  const token = liveData.find(t => t.name.toUpperCase() === tokenName.toUpperCase());
  if (!token) return;
  modalToken = token;
  modalMode  = "buy";

  // Populate header
  document.getElementById("modalTokenImg").src   = token.img;
  document.getElementById("modalTokenImg").alt   = token.name;
  document.getElementById("modalTokenName").textContent  = "Trade " + token.name;
  document.getElementById("modalTokenPrice").textContent =
    token.price ? "$" + formatPrice(token.price) + " per token" : "Price loading...";

  // Reset tabs
  setModalTab("buy");

  // Reset input
  document.getElementById("modalAmountInput").value = "";
  document.querySelectorAll(".modal-quick-btn").forEach(b => b.classList.remove("active"));
  updateModalCalc();

  // Show modal
  document.getElementById("tradeModal").style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("modalAmountInput").focus(), 100);
};

window.closeTradeModal = function() {
  document.getElementById("tradeModal").style.display = "none";
  document.body.style.overflow = "";
};

window.handleModalOverlayClick = function(e) {
  if (e.target === document.getElementById("tradeModal")) closeTradeModal();
};

// Close on Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeTradeModal();
});

// Switch Buy / Sell
window.setModalTab = function(mode) {
  modalMode = mode;
  const buyTab  = document.getElementById("tabBuy");
  const sellTab = document.getElementById("tabSell");
  const actionBtn = document.getElementById("modalActionBtn");

  buyTab.className  = "modal-tab" + (mode === "buy"  ? " active-buy"  : "");
  sellTab.className = "modal-tab" + (mode === "sell" ? " active-sell" : "");

  updateModalCalc();

  if (!walletConnected) {
    actionBtn.textContent = "Connect wallet";
    actionBtn.className   = "modal-action-btn connect-btn";
  } else {
    actionBtn.textContent = mode === "buy" ? "Buy " + modalToken?.name : "Sell " + modalToken?.name;
    actionBtn.className   = "modal-action-btn " + (mode === "buy" ? "buy-btn" : "sell-btn");
  }
};

// Quick amount pills
window.setQuickAmount = function(amount) {
  document.getElementById("modalAmountInput").value = amount;
  document.querySelectorAll(".modal-quick-btn").forEach(b => {
    b.classList.toggle("active", b.textContent === "$" + amount);
  });
  updateModalCalc();
};

// Format price nicely
function formatPrice(p) {
  if (!p) return "--";
  if (p < 0.000001) return p.toExponential(4);
  if (p < 0.0001)   return p.toFixed(8);
  if (p < 0.01)     return p.toFixed(6);
  if (p < 1)        return p.toFixed(4);
  if (p < 1000)     return p.toFixed(2);
  return p.toLocaleString("en-US", {maximumFractionDigits: 2});
}

// Recalculate tokens when amount changes
window.updateModalCalc = function() {
  const input      = document.getElementById("modalAmountInput");
  const usdAmount  = parseFloat(input.value) || 0;
  const price      = modalToken?.price || 0;

  const youPayEl      = document.getElementById("modalYouPay");
  const youReceiveEl  = document.getElementById("modalYouReceive");
  const pricePerEl    = document.getElementById("modalPricePerToken");
  const actionBtn     = document.getElementById("modalActionBtn");

  // You pay
  youPayEl.textContent = usdAmount > 0
    ? "$" + usdAmount.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2})
    : "$0.00";

  // Tokens you receive (for buy) or USD you receive (for sell)
  if (price > 0 && usdAmount > 0) {
    if (modalMode === "buy") {
      const tokensOut = usdAmount / price;
      youReceiveEl.textContent = formatTokenAmount(tokensOut) + " " + (modalToken?.name || "");
    } else {
      // sell: input = number of tokens, output = USD
      const usdOut = usdAmount * price;
      youReceiveEl.textContent = "$" + usdOut.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
  } else {
    youReceiveEl.textContent = modalMode === "buy"
      ? "0 " + (modalToken?.name || "tokens")
      : "$0.00";
  }

  // Price per token
  pricePerEl.textContent = price > 0
    ? "$" + formatPrice(price)
    : "Loading...";

  // Update action button
  if (!walletConnected) {
    actionBtn.textContent = "Connect wallet";
    actionBtn.className   = "modal-action-btn connect-btn";
  } else if (usdAmount > 0) {
    actionBtn.textContent = modalMode === "buy"
      ? "Buy " + (modalToken?.name || "")
      : "Sell " + (modalToken?.name || "");
    actionBtn.className = "modal-action-btn " + (modalMode === "buy" ? "buy-btn" : "sell-btn");
  } else {
    actionBtn.textContent = "Enter an amount";
    actionBtn.className   = "modal-action-btn connect-btn";
  }

  // Reset quick pill active state if user typed manually
  const quickAmounts = [10, 50, 100, 500];
  document.querySelectorAll(".modal-quick-btn").forEach((b, i) => {
    b.classList.toggle("active", usdAmount === quickAmounts[i]);
  });
};

function formatTokenAmount(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)         return (n / 1_000).toFixed(2) + "K";
  if (n >= 1)             return n.toFixed(2);
  return n.toFixed(6);
}

// Handle the main action button
window.handleModalAction = function() {
  if (!walletConnected) {
    // Simulate wallet connect for now
    walletConnected = true;
    const actionBtn = document.getElementById("modalActionBtn");
    const usdAmount = parseFloat(document.getElementById("modalAmountInput").value) || 0;
    if (usdAmount > 0) {
      actionBtn.textContent = modalMode === "buy"
        ? "Buy " + modalToken?.name
        : "Sell " + modalToken?.name;
      actionBtn.className = "modal-action-btn " + (modalMode === "buy" ? "buy-btn" : "sell-btn");
    } else {
      actionBtn.textContent = "Enter an amount";
      actionBtn.className   = "modal-action-btn connect-btn";
    }
    return;
  }

  const usdAmount = parseFloat(document.getElementById("modalAmountInput").value) || 0;
  if (usdAmount <= 0) {
    document.getElementById("modalAmountInput").focus();
    return;
  }

  // TODO: hook into real wallet/DEX here
  alert(`${modalMode === "buy" ? "Buying" : "Selling"} $${usdAmount} of ${modalToken?.name}.\nIntegrate your DEX/wallet SDK here.`);
};

/* ══════════════════════════════
   TOKEN SIDE PANEL
══════════════════════════════ */
let spToken   = null;
let spMode    = "buy";
let spChart   = null;

window.openSidePanel = function(tokenName) {
  const token = liveData.find(t => t.name.toUpperCase() === tokenName.toUpperCase());
  if (!token) return;
  spToken = token;
  spMode  = "buy";

  // Header
  document.getElementById("spTokenImg").src          = token.img;
  document.getElementById("spTokenImg").alt          = token.name;
  document.getElementById("spTokenSymbol").textContent = token.name;
  document.getElementById("spTokenSub").textContent    = token.sub;

  // Price
  document.getElementById("spMcap").innerHTML =
    token.mcap !== "--"
      ? token.mcap.replace(/(\.\d+)/, '<span>$1</span>')
      : "--";

  const chgEl = document.getElementById("spChange");
  if (token.change !== 0) {
    chgEl.textContent  = (token.change > 0 ? "↑ " : "↓ ") + Math.abs(token.change).toFixed(1) + "%";
    chgEl.className    = token.change > 0 ? "sp-change-pos" : "sp-change-neg";
  } else {
    chgEl.textContent = "";
  }

  // Info tab
  document.getElementById("spInfoPrice").textContent    = token.price ? "$" + formatPrice(token.price) : "--";
  document.getElementById("spInfoChange").textContent   = token.change !== 0 ? (token.change > 0 ? "↑ " : "↓ ") + Math.abs(token.change).toFixed(1) + "%" : "--";
  document.getElementById("spInfoChange").style.color   = token.change >= 0 ? "#4ade80" : "#f87171";
  document.getElementById("spInfoVol").textContent      = token.vol   || "--";
  document.getElementById("spInfoMcap").textContent     = token.mcap  || "--";
  document.getElementById("spInfoCA").textContent       = token.ca    || "N/A";
  document.getElementById("spInfoChain").textContent    = token.chain || "--";

  // Stats tab
  document.getElementById("spStatsEarned").textContent   = token.earned   || "--";
  document.getElementById("spStatsVol").textContent      = token.vol      || "--";
  document.getElementById("spStatsFDV").textContent      = token.mcap     || "--";
  document.getElementById("spStatsReceiver").textContent = token.receiver || "--";

  // Reset trade inputs
  document.getElementById("spAmountInput").value = "";
  document.querySelectorAll(".sp-quick-btn").forEach(b => b.classList.remove("active"));
  setSPTradeMode("buy");
  updateSPCalc();

  // Reset to Trade tab
  setSPTab("trade", document.querySelector(".sp-tab"));

  // Draw chart
  drawSPChart(token);

  // Open panel
  document.getElementById("sidePanel").classList.add("open");
  document.getElementById("sidePanelOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
};

window.closeSidePanel = function() {
  document.getElementById("sidePanel").classList.remove("open");
  document.getElementById("sidePanelOverlay").classList.remove("open");
  document.body.style.overflow = "";
};

// Tab switching
window.setSPTab = function(tab, btn) {
  document.querySelectorAll(".sp-tab").forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("spTradeTab").style.display = tab === "trade" ? "block" : "none";
  document.getElementById("spInfoTab").style.display  = tab === "info"  ? "block" : "none";
  document.getElementById("spStatsTab").style.display = tab === "stats" ? "block" : "none";
};

// Timeframe buttons
window.setSPTf = function(btn, tf) {
  document.querySelectorAll(".sp-tf-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  if (spToken) drawSPChart(spToken, tf);
};

// Trade mode buy/sell
window.setSPTradeMode = function(mode) {
  spMode = mode;
  document.getElementById("spTabBuy").className  = "sp-trade-tab" + (mode === "buy"  ? " active-buy"  : "");
  document.getElementById("spTabSell").className = "sp-trade-tab" + (mode === "sell" ? " active-sell" : "");
  updateSPCalc();
};

// Quick amounts
window.setSPQuick = function(btn, amount) {
  document.getElementById("spAmountInput").value = amount;
  document.querySelectorAll(".sp-quick-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateSPCalc();
};

// Recalculate
window.updateSPCalc = function() {
  const usd   = parseFloat(document.getElementById("spAmountInput").value) || 0;
  const price = spToken?.price || 0;

  document.getElementById("spYouPay").textContent =
    usd > 0 ? "$" + usd.toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2}) : "$0.00";

  if (price > 0 && usd > 0) {
    if (spMode === "buy") {
      document.getElementById("spYouReceive").textContent = formatTokenAmount(usd / price) + " " + (spToken?.name || "");
    } else {
      document.getElementById("spYouReceive").textContent = "$" + (usd * price).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
    }
  } else {
    document.getElementById("spYouReceive").textContent = spMode === "buy" ? "0 " + (spToken?.name || "tokens") : "$0.00";
  }

  document.getElementById("spPricePerToken").textContent = price > 0 ? "$" + formatPrice(price) : "--";

  // Sync quick pills
  const quickAmounts = [10, 50, 100, 500];
  document.querySelectorAll(".sp-quick-btn").forEach((b, i) => {
    b.classList.toggle("active", usd === quickAmounts[i]);
  });
};

/* Candlestick-style chart using Canvas */
function drawSPChart(token, tf) {
  const canvas = document.getElementById("spChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Resize canvas to container
  const wrap = canvas.parentElement;
  canvas.width  = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;

  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Generate fake OHLC data based on current price + change
  const basePrice = token.price || 1;
  const change    = token.change || 0;
  const candles   = 30;
  const data      = [];

  let price = basePrice * (1 - change / 100);
  for (let i = 0; i < candles; i++) {
    const move = (Math.random() - 0.48) * price * 0.03;
    const open  = price;
    const close = price + move;
    const high  = Math.max(open, close) + Math.random() * price * 0.01;
    const low   = Math.min(open, close) - Math.random() * price * 0.01;
    data.push({ open, high, low, close });
    price = close;
  }

  // Scale
  const prices = data.flatMap(d => [d.high, d.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const padY  = H * 0.08;

  const scaleY = p => H - padY - ((p - minP) / range) * (H - padY * 2);

  const candleW  = (W / candles) * 0.6;
  const candleGap = W / candles;

  // Grid lines
  ctx.strokeStyle = "rgba(245,166,35,0.06)";
  ctx.lineWidth   = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padY + (i / 4) * (H - padY * 2);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Draw candles
  data.forEach((d, i) => {
    const x    = i * candleGap + candleGap / 2;
    const bull = d.close >= d.open;
    const col  = bull ? "#4ade80" : "#f87171";

    // Wick
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, scaleY(d.high));
    ctx.lineTo(x, scaleY(d.low));
    ctx.stroke();

    // Body
    ctx.fillStyle = bull ? "rgba(74,222,128,0.75)" : "rgba(248,113,113,0.75)";
    const bodyTop = scaleY(Math.max(d.open, d.close));
    const bodyH   = Math.max(1, Math.abs(scaleY(d.open) - scaleY(d.close)));
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
  });
}

// Close on Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeSidePanel();
});

/* ══════════════════════════════
   ONLINE COUNTER
   — Time-aware: more users during
     day, fewer at night
   — Random drift every few seconds
   — Smooth number transition
══════════════════════════════ */
function initOnlineCounter() {
  const countEl = document.getElementById("onlineCount");
  if (!countEl) return;

  // Base online count by hour of day (0–23)
  // Peaks around midday, lower at night
  const hourlyBase = [
    38, 29, 22, 18, 15, 20,   // 00–05 (night, low)
    35, 58, 88, 120, 148, 165, // 06–11 (morning ramp)
    180, 175, 168, 160, 155, 162, // 12–17 (afternoon peak)
    158, 145, 130, 110, 85, 60,   // 18–23 (evening wind down)
  ];

  function getBaseCount() {
    const hour = new Date().getHours();
    return hourlyBase[hour];
  }

  // Smooth number counter animation
  let displayed = getBaseCount();
  let target    = displayed;

  function animateTo(newTarget) {
    const step = newTarget > displayed ? 1 : -1;
    const interval = setInterval(() => {
      displayed += step;
      countEl.textContent = displayed;
      if (displayed === newTarget) clearInterval(interval);
    }, 120);
  }

  // Initial display
  countEl.textContent = displayed;

  // Drift: every 4–9 seconds pick a new target close to base
  function scheduleNextChange() {
    const delay = (20 + Math.random() * 20) * 1000; // 20–40 sec // 4–9 sec
    setTimeout(() => {
      const base    = getBaseCount();
      const spread  = Math.floor(base * 0.18); // ±18% of base
      const drift   = Math.floor((Math.random() * 2 - 1) * spread);
      target        = Math.max(8, base + drift);

      // Flash the count briefly then animate
      countEl.style.opacity = "0.4";
      setTimeout(() => {
        countEl.style.opacity = "1";
        animateTo(target);
      }, 150);

      scheduleNextChange();
    }, delay);
  }

  scheduleNextChange();
}

document.addEventListener("DOMContentLoaded", initOnlineCounter);