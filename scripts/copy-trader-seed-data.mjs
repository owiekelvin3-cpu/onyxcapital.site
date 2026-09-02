/** Seed catalog used only to generate 079_copy_traders_catalog.sql */
export const SECTIONS = [
  ["featured", "AlphaTrader", "@alpha.fx", "Momentum scalper · BTC & ETH focus", 142.5, 2840, 78, 4.9, "illustrated", "alpha-trader", "#3b82f6", true, "Pro"],
  ["featured", "CryptoKing", "@cryptoking", "Altcoin swing setups · high conviction", 98.3, 5620, 72, 4.8, "anime", "crypto-king", "#f97316", true, null],
  ["featured", "YukiTrade", "@yuki.trades", "Tokyo session · JPY pairs & SOL", 118.2, 3910, 74, 4.9, "anime", "yuki-trade", "#ec4899", true, "VIP"],
  ["featured", "QuantMaster", "@quant.master", "Systematic models · risk-first", 67.1, 1890, 81, 4.7, "illustrated", "quant-master", "#6366f1", false, null],
  ["featured", "SwingPro", "@swingpro", "Multi-day holds · FX majors", 54.8, 3210, 69, 4.6, "gradient", "swing-pro", "#14b8a6", false, null],
  ["featured", "DeFiWhale", "@defi.whale", "On-chain flows · L2 narratives", 203.2, 8900, 65, 4.9, "pixel", "defi-whale", "#8b5cf6", true, "Whale"],
  ["featured", "SteadyGains", "@steady.gains", "Low drawdown · compounding daily", 38.4, 1450, 85, 4.5, "gradient", "steady-gains", "#22c55e", false, null],
  ["featured", "NovaPulse", "@nova.pulse", "Breakout hunter · indices & gold", 89.6, 4720, 71, 4.8, "emoji", "nova-pulse", "#eab308", false, null],
  ["featured", "MoonRunner", "@moon.runner", "Anime chart reader · meme + majors", 156.8, 6240, 68, 4.8, "anime", "moon-runner", "#a855f7", true, null],
  ["featured", "ZenScalp", "@zen.scalp", "1m–5m precision · tight stops", 76.3, 2580, 79, 4.7, "illustrated", "zen-scalp", "#06b6d4", false, null],
  ["featured", "GridLord", "@grid.lord", "Range bots · sideways markets", 44.2, 1120, 83, 4.4, "pixel", "grid-lord", "#64748b", false, null],
  ["featured", "WolfStreet", "@wolf.street", "US open volatility · SPX & NAS", 91.4, 5100, 70, 4.7, "gradient", "wolf-street", "#ef4444", false, "Hot"],
  ["crypto", "ChainHawk", "@chain.hawk", "Layer-1 rotations · on-chain alpha", 167.4, 7120, 66, 4.8, "anime", "chain-hawk", "#f59e0b", true, "Hot"],
  ["crypto", "SolStorm", "@sol.storm", "SOL ecosystem · meme + DeFi pairs", 134.9, 5890, 70, 4.7, "pixel", "sol-storm", "#14b8a6", true, null],
  ["crypto", "LayerKing", "@layer.king", "L2 narratives · rollup plays", 112.3, 4210, 73, 4.8, "illustrated", "layer-king", "#6366f1", false, null],
  ["crypto", "MemeLord", "@meme.lord", "High vol memes · strict risk caps", 221.6, 9340, 58, 4.6, "emoji", "meme-lord", "#a855f7", false, "Wild"],
  ["crypto", "ETHOracle", "@eth.oracle", "ETH/BTC ratio · macro cycles", 88.7, 3650, 76, 4.9, "gradient", "eth-oracle", "#3b82f6", true, null],
  ["crypto", "BaseRider", "@base.rider", "Base chain gems · early entries", 145.2, 2780, 64, 4.7, "anime", "base-rider", "#2563eb", false, null],
  ["forex", "PipHunter", "@pip.hunter", "EUR/USD specialist · London open", 62.4, 3340, 77, 4.8, "illustrated", "pip-hunter", "#0ea5e9", true, null],
  ["forex", "EuroFlow", "@euro.flow", "Euro crosses · ECB week focus", 51.8, 2890, 74, 4.6, "gradient", "euro-flow", "#0284c7", false, null],
  ["forex", "GBPulse", "@gb.pulse", "Cable · BOE volatility setups", 73.1, 4120, 71, 4.7, "anime", "gb-pulse", "#dc2626", true, null],
  ["forex", "YenSamurai", "@yen.samurai", "USD/JPY · Tokyo + NY overlap", 84.5, 3560, 69, 4.8, "pixel", "yen-samurai", "#ef4444", false, "Pro"],
  ["forex", "FrancTrader", "@franc.trader", "CHF safe-haven · risk-off plays", 39.6, 1980, 82, 4.5, "gradient", "franc-trader", "#64748b", false, null],
  ["forex", "CableKing", "@cable.king", "GBP majors · news-driven entries", 96.2, 4670, 68, 4.7, "illustrated", "cable-king", "#b91c1c", true, null],
  ["indices", "GoldRush", "@gold.rush", "XAU/USD · inflation hedges", 58.3, 5230, 75, 4.8, "gradient", "gold-rush", "#eab308", true, "Pro"],
  ["indices", "OilBaron", "@oil.baron", "WTI & Brent · supply shocks", 71.9, 3890, 67, 4.6, "pixel", "oil-baron", "#78350f", false, null],
  ["indices", "SPXPilot", "@spx.pilot", "S&P 500 · trend following", 45.7, 6120, 78, 4.7, "illustrated", "spx-pilot", "#16a34a", true, null],
  ["indices", "NasdaqNinja", "@nasdaq.ninja", "Tech-heavy · earnings season", 93.4, 4450, 66, 4.8, "anime", "nasdaq-ninja", "#7c3aed", false, "Hot"],
  ["indices", "DAXPro", "@dax.pro", "German index · EU session", 52.1, 2340, 73, 4.5, "emoji", "dax-pro", "#1d4ed8", false, null],
  ["indices", "SilverFox", "@silver.fox", "Silver & metals · ratio trades", 64.8, 1870, 71, 4.6, "gradient", "silver-fox", "#94a3b8", false, null],
  ["scalping", "FlashTrade", "@flash.trade", "Sub-minute entries · tight RR", 82.6, 2980, 81, 4.7, "pixel", "flash-trade", "#06b6d4", true, null],
  ["scalping", "MicroEdge", "@micro.edge", "Tick charts · liquidity grabs", 69.3, 2140, 84, 4.6, "anime", "micro-edge", "#0891b2", false, null],
  ["scalping", "TickMaster", "@tick.master", "DOM reading · futures scalps", 77.5, 3670, 79, 4.8, "illustrated", "tick-master", "#0d9488", true, "Pro"],
  ["scalping", "FastFinger", "@fast.finger", "US open only · 15–30 pip targets", 91.2, 4890, 76, 4.7, "emoji", "fast-finger", "#f97316", false, null],
  ["scalping", "BlitzScalp", "@blitz.scalp", "BTC perp · 1m structure", 108.4, 5520, 72, 4.8, "gradient", "blitz-scalp", "#ea580c", false, "Hot"],
  ["scalping", "RapidFire", "@rapid.fire", "Multi-pair scalper · Asian session", 63.7, 1760, 80, 4.5, "pixel", "rapid-fire", "#14b8a6", false, null],
  ["rising", "NeonTrader", "@neon.trader", "New verified · altcoin breakouts", 178.9, 1240, 62, 4.9, "anime", "neon-trader", "#d946ef", true, "New"],
  ["rising", "PixelProfit", "@pixel.profit", "Rising ROI · gaming token plays", 192.3, 980, 59, 4.7, "pixel", "pixel-profit", "#8b5cf6", false, "New"],
  ["rising", "ApexRise", "@apex.rise", "Fast follower growth · swing crypto", 124.6, 1560, 71, 4.8, "illustrated", "apex-rise", "#6366f1", true, "Rising"],
  ["rising", "VoltTrade", "@volt.trade", "High energy setups · volatile hours", 156.1, 890, 64, 4.6, "emoji", "volt-trade", "#eab308", false, "New"],
  ["rising", "StarPath", "@star.path", "Consistent monthly gains · low DD", 87.4, 2100, 77, 4.9, "gradient", "star-path", "#22c55e", true, "Rising"],
  ["rising", "ByteGain", "@byte.gain", "AI token baskets · thematic trades", 143.8, 1340, 68, 4.7, "anime", "byte-gain", "#3b82f6", false, "New"],
];

export function priceFromRoi(roi) {
  if (roi >= 200) return 399;
  if (roi >= 150) return 299;
  if (roi >= 100) return 199;
  if (roi >= 75) return 149;
  if (roi >= 50) return 99;
  return 49;
}

export function seedRows() {
  const counts = {};
  return SECTIONS.map((row) => {
    const [section_id, name, handle, bio, roi, followers, win_rate, rating, avatar_kind, avatar_seed, ring_color, verified, badge] = row;
    counts[section_id] = (counts[section_id] ?? 0) + 1;
    return {
      name,
      handle,
      bio,
      roi,
      followers,
      win_rate,
      rating,
      avatar_kind,
      avatar_seed,
      ring_color,
      verified,
      badge,
      section_id,
      sort_order: counts[section_id] * 10,
      price: priceFromRoi(roi),
      is_active: true,
    };
  });
}
