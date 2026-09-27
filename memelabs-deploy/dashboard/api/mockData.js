/**
 * Mock Data for Dashboard - Replaces PHP backend endpoints
 * Provides realistic portfolio, token, and leaderboard data
 */

// Mock portfolio holdings data
const MOCK_HOLDINGS = [
    {
        token_name: "ODAI",
        sub: "ODEI AI",
        img: "../assets/images/odai.webp",
        tokens: "47000",
        balance: "14230",
        chainID: "solana",
        pairAddress: "odai_pair_address",
        priceUsd: 0.000302,
        mcap: 14230000
    },
    {
        token_name: "TAKEOVER",
        sub: "Takeover",
        img: "../assets/images/takeover.webp",
        tokens: "8900",
        balance: "3820",
        chainID: "solana",
        pairAddress: "takeover_pair_address",
        priceUsd: 0.000429,
        mcap: 3820000
    },
    {
        token_name: "OSO",
        sub: "Osobot",
        img: "../assets/images/oso-_1_.webp",
        tokens: "7500",
        balance: "5610",
        chainID: "solana",
        pairAddress: "oso_pair_address",
        priceUsd: 0.000748,
        mcap: 5610000
    },
    {
        token_name: "NOELCLAW",
        sub: "Noel Claw",
        img: "../assets/images/noelclaw.webp",
        tokens: "52000",
        balance: "1230",
        chainID: "solana",
        pairAddress: "noelclaw_pair_address",
        priceUsd: 0.000023,
        mcap: 1230000
    },
    {
        token_name: "MLTL",
        sub: "Multilabel",
        img: "../assets/images/mltl.webp",
        tokens: "22500",
        balance: "4470",
        chainID: "solana",
        pairAddress: "mltl_pair_address",
        priceUsd: 0.000198,
        mcap: 4470000
    }
];

// Mock custom tokens (not on DexScreener)
const MOCK_CUSTOM_TOKENS = [
    {
        name: "CVT",
        symbol: "CVT",
        img: "../assets/images/download.jpeg",
        priceUsd: 0.001,
        mcap: 1000000,
        chain: "solana",
        ca: "5aYjJdXSobATG1rFbdBz8wd2jrJbHhNNbU1LbJKgYGV5"
    }
];

// Mock leaderboard data
const MOCK_LEADERBOARD = {
    whales: [
        { rank: 1, name: "WhaleMaster", img: "../assets/images/odai.webp", earned: "$127,450", is_user: false },
        { rank: 2, name: "CryptoKing", img: "../assets/images/takeover.webp", earned: "$98,320", is_user: false },
        { rank: 3, name: "MoonTrader", img: "../assets/images/oso-_1_.webp", earned: "$67,890", is_user: false },
        { rank: 4, name: "DegenLord", img: "../assets/images/noelclaw.webp", earned: "$45,210", is_user: false },
        { rank: 5, name: "TokenHunter", img: "../assets/images/mltl.webp", earned: "$32,100", is_user: false }
    ],
    user: {
        name: "memelord42",
        img: "../assets/images/odai.webp",
        earned: "$12,450",
        is_user: true
    }
};

// Mock portfolio summary data
const MOCK_PORTFOLIO_SUMMARY = {
    holdings: MOCK_HOLDINGS,
    total_trades: 142,
    lb_rank: 247,
    total_value_usd: 29360,
    total_value_sol: 185.42
};

// Mock SOL price
let MOCK_SOL_PRICE = 158.42;

// Simulate price fluctuations
function simulatePriceFluctuation(basePrice, volatility = 0.02) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    return basePrice * (1 + change);
}

// Update SOL price periodically
setInterval(() => {
    MOCK_SOL_PRICE = simulatePriceFluctuation(MOCK_SOL_PRICE, 0.01);
}, 30000);

// Mock API functions
window.MockAPI = {
    // Fetch portfolio data (replaces ./server/fetch_portfolio.php)
    async fetchPortfolio() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Add some randomization to make it feel live
        const holdings = MOCK_HOLDINGS.map(h => ({
            ...h,
            balance: (parseFloat(h.balance) * (0.98 + Math.random() * 0.04)).toFixed(2),
            tokens: h.tokens
        }));
        
        return {
            holdings,
            total_trades: MOCK_PORTFOLIO_SUMMARY.total_trades + Math.floor(Math.random() * 3),
            lb_rank: MOCK_PORTFOLIO_SUMMARY.lb_rank,
            total_value_usd: MOCK_PORTFOLIO_SUMMARY.total_value_usd,
            total_value_sol: MOCK_PORTFOLIO_SUMMARY.total_value_sol
        };
    },

    // Fetch custom tokens (replaces ./server/tokens.php)
    async fetchCustomTokens() {
        await new Promise(resolve => setTimeout(resolve, 100));
        return MOCK_CUSTOM_TOKENS;
    },

    // Fetch leaderboard data (replaces ./server/leaderboard_data.php)
    async fetchLeaderboard() {
        await new Promise(resolve => setTimeout(resolve, 200));
        return MOCK_LEADERBOARD;
    },

    // Get live price for a token (replaces DexScreener API calls for mock tokens)
    async getLivePrice(chainId, pairAddress) {
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Find matching holding
        const holding = MOCK_HOLDINGS.find(h => h.pairAddress === pairAddress);
        if (holding) {
            const price = simulatePriceFluctuation(parseFloat(holding.priceUsd), 0.05);
            const change = (Math.random() - 0.5) * 10; // -5% to +5%
            return {
                price,
                change,
                url: `https://dexscreener.com/${chainId}/${pairAddress}`
            };
        }
        
        // Fallback for unknown tokens
        return {
            price: 0.001,
            change: (Math.random() - 0.5) * 10,
            url: '#'
        };
    },

    // Get SOL price
    getSolPrice() {
        return MOCK_SOL_PRICE;
    },

    // Update profile (replaces ./server/update_profile.php)
    async updateProfile(data) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true, ...data };
    }
};

// Export for use in dashboard pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.MockAPI;
}