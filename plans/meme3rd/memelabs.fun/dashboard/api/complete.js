// ─────────────────────────────────────────────────────────────────────────────
// State — shared across functions
// ─────────────────────────────────────────────────────────────────────────────
const SOL_CHAIN_IDS = ['solana', 'sol', '101', '102', '103', 'mainnet-beta', 'devnet', 'testnet'];

const state = {
    solAmount:    0,        // raw amount from URL, always in SOL
    ethPerSol:    null,     // live rate: how many ETH = 1 SOL
    activeChain: 'sol',     // 'sol' | 'eth'  — current user selection
    wallets:     {},        // { sol_address, eth_address }
};

function isSolanaChain(chainID) {
    return SOL_CHAIN_IDS.includes(String(chainID).toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const p = new URLSearchParams(window.location.search);

    /* Guard the amount: parseFloat('abc') is NaN, and 0/negatives are also
       accepted, all of which would otherwise reach the payment request. */
    const requestedAmount = parseFloat(p.get('amount') || '0.01');
    state.solAmount  = (Number.isFinite(requestedAmount) && requestedAmount > 0)
        ? requestedAmount
        : 0.01;
    state.activeChain = isSolanaChain(p.get('chainID') || 'eth') ? 'sol' : 'eth';

    // hidden inputs for verifyPayment()
    document.getElementById('token-input').value   = p.get('tokenNameBuy') || '';
    document.getElementById('tokens').value        = p.get('tokens')       || '';
    document.getElementById('pairAddress').value   = p.get('pairAddress')  || '';
    document.getElementById('chainID').value       = p.get('chainID')      || '';

    // kick off both fetches in parallel
    await Promise.all([
        fetchWallets(),
        fetchRate(),
    ]);

    renderChain(state.activeChain);
    attachToggle();
});

// ─────────────────────────────────────────────────────────────────────────────
// Fetch wallet addresses from PHP
// ─────────────────────────────────────────────────────────────────────────────
async function fetchWallets() {
    try {
        const res  = await fetch('server/get_payment_config.php');
        if (!res.ok) throw new Error('Server responded ' + res.status);
        const data = await res.json();
        state.wallets = {
            sol: data.sol_address || data.wallet_address || '',
            eth: data.eth_address || data.wallet_address || '',
        };
    } catch {
        state.wallets = { sol: 'Error loading address', eth: 'Error loading address' };
    }
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
        if (!res.ok) throw new Error('Server responded ' + res.status);
        const data = await res.json();

        const solUsd = data?.solana?.usd;
        const ethUsd = data?.ethereum?.usd;

        if (solUsd && ethUsd) {
            // 1 SOL = (solUsd / ethUsd) ETH
            state.ethPerSol = solUsd / ethUsd;
            if (rateEl) rateEl.textContent =
                `1 SOL ≈ ${state.ethPerSol.toFixed(6)} ETH  (live rate)`;
        } else {
            throw new Error('Bad data');
        }
    } catch {
        state.ethPerSol = null;
        if (rateEl) rateEl.textContent = 'Live rate unavailable — showing SOL amount only';
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
    if (isSol) {
        displayAmount  = state.solAmount.toFixed(4);
        displaySymbol  = 'SOL';
    } else {
        if (state.ethPerSol !== null) {
            displayAmount  = (state.solAmount * state.ethPerSol).toFixed(6);
            displaySymbol  = 'ETH';
        } else {
            document.getElementById('pay-amount').textContent = 'Exchange rate unavailable';
            document.getElementById('pay-amount-input').value = '';
            document.getElementById('toggle-eth').classList.remove('toggle-active');
            document.getElementById('network-label').textContent =
                'Ethereum unavailable — switch back to Solana to pay';
            const addrEl = document.getElementById('wallet-addr');
            if (addrEl) { addrEl.textContent = ''; addrEl.style.color = '#f87171'; }
            const qrEl = document.getElementById('qr-code');
            if (qrEl) qrEl.remove();
            document.getElementById('btn-done').disabled = true;
            return;
        }
    }
    document.getElementById('pay-amount').textContent  = `${displayAmount} ${displaySymbol}`;
    // keep hidden input updated so verifyPayment() sends the right amount
    document.getElementById('pay-amount-input').value  = displayAmount;
    document.getElementById('btn-done').disabled = false;

    /* ── Chain badge ── */
    const badge = document.getElementById('chain-badge');
    if (badge) {
        badge.textContent        = isSol ? '◎  Solana Network' : 'Ξ  Ethereum Network';
        badge.style.background   = isSol ? 'rgba(153,69,255,0.15)' : 'rgba(98,126,234,0.15)';
        badge.style.color        = isSol ? '#9945ff' : '#627eea';
    }

    /* ── Network label inside wallet box ── */
    const netLabel = document.getElementById('network-label');
    if (netLabel) netLabel.textContent = isSol ? 'Solana (SOL) Wallet' : 'Ethereum (ETH) Wallet';

    /* ── Wallet address ── */
    const addrEl = document.getElementById('wallet-addr');
    if (addrEl) {
        const addr = isSol ? state.wallets.sol : state.wallets.eth;
        addrEl.textContent = addr || 'Address unavailable';
        addrEl.style.color = addr ? '#fff' : '#f87171';
    }

    /* ── QR code ── */
    /* There is no qr-sol.png in the prototype. When the image is missing the
       address below stays the source of truth and the QR is hidden rather than
       left as a broken box. */
    const qr = document.getElementById('qr-code');
    if (qr) {
        qr.onerror = function () { this.style.display = 'none'; };
        qr.src = `${isSol ? 'qr-sol' : 'qr-eth'}.png`;
        qr.alt = `${displaySymbol} QR Code`;
    }

    /* ── Modal chain icon ── */
    const modalIcon = document.getElementById('chain-icon-modal');
    if (modalIcon) {
        modalIcon.src = isSol
            ? '../assets/images/solana-sol-logo.png'
            : '../assets/images/ethereum-eth-logo.png';
        modalIcon.alt = isSol ? 'Solana' : 'Ethereum';
    }

    /* ── Toggle pill highlight ── */
    document.getElementById('toggle-sol').classList.toggle('toggle-active', isSol);
    document.getElementById('toggle-eth').classList.toggle('toggle-active', !isSol);
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle click handler
// ─────────────────────────────────────────────────────────────────────────────
function attachToggle() {
    document.getElementById('toggle-sol').addEventListener('click', () => renderChain('sol'));
    document.getElementById('toggle-eth').addEventListener('click', () => {
        if (state.ethPerSol === null) {
            // rate didn't load — try again before switching
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
    const addr = document.getElementById('wallet-addr').innerText;
    if (!addr || addr.startsWith('Error') || addr === 'Loading...' || addr === 'Address unavailable') return;

    const flash = (ok) => {
        const btn = document.querySelector('.btn-copy');
        btn.innerText        = ok ? '✓ Copied!' : 'Copy Address';
        btn.style.background = ok ? '#4ade80'   : '#f5a623';
        if (ok) setTimeout(() => flash(false), 2000);
    };

    if (navigator.clipboard) {
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