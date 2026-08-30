/** Marketing copy adapted from CryptXTB (https://cryptxtb.com/) for Onyx Capital. */

export const CHOOSE_REASONS = [
  {
    title: "Secured",
    desc: "We prioritize your data with advanced encryption, regular audits, and robust firewalls — so sensitive information stays confidential.",
  },
  {
    title: "Leverage",
    desc: "Amplify positions with seamless leverage management. Use it responsibly to unlock larger market opportunities.",
  },
  {
    title: "Crypto Payments",
    desc: "Deposit and transact with the cryptocurrencies you already use — fast processing and stronger privacy.",
  },
  {
    title: "Mine or Stake Crypto",
    desc: "Grow assets through mining contracts or staking plans. Earn while you stay in the market.",
  },
  {
    title: "Verified Traders",
    desc: "Copy top-performing professionals with transparent track records. Mirror strategies and stay in control of allocation.",
  },
  {
    title: "Reliable Support",
    desc: "From your first deposit to live trading, our team provides guidance and answers around the clock.",
  },
  {
    title: "Fast Trades",
    desc: "Orders process in real time with minimal delay, so you can act on opportunities without hesitation.",
  },
] as const;

export const FRAMEWORK_STEPS = [
  {
    step: "01",
    title: "Recognize market movements",
    desc: "Achieve better returns through clearer market reading. We show you how to find precise entry and exit points so you can trade with a plan in any condition.",
  },
  {
    step: "02",
    title: "Understand Bitcoin & blockchain",
    desc: "Learn how blockchain works, how it is reshaping financial markets, and how to position for the next major crypto trends.",
  },
  {
    step: "03",
    title: "Systematize proven strategies",
    desc: "Turn discretion into a repeatable system. Protect capital, stay consistent, and build wealth with rules you can follow for years.",
  },
] as const;

export const PLATFORM_FAQS = [
  {
    q: "Is my money safe? What are the risks?",
    a: "Trading digital assets and leveraged products carries inherent risk — prices can move quickly and you can lose capital. Onyx Capital reduces operational risk with encryption, verification, real-time monitoring, and withdrawal controls, but we do not guarantee returns. Only trade with capital you can afford to put at risk.",
  },
  {
    q: "How does Onyx Capital make money?",
    a: "We charge transparent trading and service fees. Spot fees start at 0.10%. There is no subscription required to open an account, and crypto deposits are free. Plan and signal details are shown before you commit funds.",
  },
  {
    q: "How does copy trading work?",
    a: "Select the expert traders you want to follow. Once you are signed up, our software copies their trades automatically — no codes to run and no signals to enter by hand. When an expert opens or exits a position, your account mirrors it at your chosen allocation. Keep enough available balance to cover the exchange minimum order size (about $10 per trade is a safe buffer).",
  },
  {
    q: "Who are the trading experts?",
    a: "We review expert applicants and their performance over time. We look for consistent results and, where possible, an existing following as social proof. You can read each expert’s profile before you copy them.",
  },
  {
    q: "Do I need to install trading software?",
    a: "No. Trade in the web platform right after you create an account. There is nothing extra to install.",
  },
  {
    q: "What is the recommended amount to start with?",
    a: "A balance around $3,000–$5,000 in BTC value helps you meet exchange minimums and copy experts without missed fills. You can start smaller — many strategies accept from a few hundred dollars — and scale as you get comfortable.",
  },
  {
    q: "What's the minimum I can invest?",
    a: "Minimums vary by product. Spot trades start at about $10. Copy trading and staking plans typically start between $250 and $1,000. Each card shows its minimum before you commit.",
  },
  {
    q: "How does Bitcoin mining work on Onyx Capital?",
    a: "After payment, your mining contract is added to your profile and hashing starts. First output is typically released after 48 hours, then daily. Depending on the algorithm you can mine a native coin or allocate hashpower across coins (for example 60% LTC, 20% BTC, 20% DOGE).",
  },
  {
    q: "What is the mining maintenance fee?",
    a: "Some mining products include a maintenance fee that covers electricity, cooling, hosting, and upkeep. The fee is fixed in USD and deducted daily from mining rewards in the natively mined coin.",
  },
  {
    q: "Can I stop copy trading anytime?",
    a: "Yes. You stay in control — pause copying, change allocation, or follow different experts whenever you want.",
  },
] as const;

export const COMMUNITY_REVIEWS = [
  {
    quote:
      "Highly recommended for beginners and advanced users who want to save time. My returns have been very satisfying.",
    name: "Buddy Schmeler",
    role: "Onyx Capital user",
  },
  {
    quote:
      "This platform gave me confidence in trading. It’s a safe way to participate in the markets without being an expert.",
    name: "Jayne Stamm",
    role: "Onyx Capital user",
  },
  {
    quote:
      "I like that I stay in control. I can stop copying anytime, adjust investments, or explore new traders.",
    name: "Kole Haley",
    role: "Copy trader",
  },
  {
    quote:
      "Customer support is outstanding. They answered all my questions quickly and guided me step by step.",
    name: "Teagan Homenick",
    role: "Onyx Capital user",
  },
  {
    quote:
      "The best part is diversification — I can copy multiple traders at once and balance my portfolio easily.",
    name: "Eriberto Bogan",
    role: "Copy trader",
  },
  {
    quote:
      "I started with little knowledge of trading, but copy trading made it so simple. I’m seeing steady results already.",
    name: "Emmet Jacobs",
    role: "Onyx Capital user",
  },
] as const;

export const TRADING_ACCOUNT_TIERS = [
  {
    name: "Bronze",
    leverage: "Up to 1:10",
    spread: "Spreads from 0.01 pips",
    extras: ["Core spot & FX access"],
  },
  {
    name: "Silver",
    leverage: "Up to 1:30",
    spread: "Spreads from 0.10 pips",
    extras: ["Priority market data"],
  },
  {
    name: "Gold",
    leverage: "Up to 1:50",
    spread: "Spreads from 1.00 pips",
    extras: ["No swap fees"],
  },
  {
    name: "Platinum",
    leverage: "Up to 1:100",
    spread: "Spreads from 10.00 pips",
    extras: ["No swap fees"],
  },
  {
    name: "Diamond",
    leverage: "Up to 1:500",
    spread: "Spreads from 10.00 pips",
    extras: ["No swap fees", "Desk priority"],
    highlighted: true,
  },
] as const;

export const SIGNAL_STRENGTH_TIERS = [
  { name: "Bronze", strength: "+50% signal strength", detail: "Core FX and crypto setups" },
  { name: "Silver", strength: "+70% signal strength", detail: "Expanded coverage and faster alerts" },
  { name: "Gold", strength: "+100% signal strength", detail: "Full desk feed with highest priority", highlighted: true },
] as const;

export const MINING_PLANS = [
  {
    name: "Bronze",
    hashrate: "100 TH/s",
    hardware: "~ 1 Antminer S19",
    duration: "One month",
    extras: ["No downtime", "No electricity costs"],
  },
  {
    name: "Silver",
    hashrate: "250 TH/s",
    hardware: "~ 2.5 Antminer S19",
    duration: "One month",
    extras: ["No downtime", "No electricity costs"],
  },
  {
    name: "Gold",
    hashrate: "1000 TH/s",
    hardware: "~ 10 Antminer S19",
    duration: "One month",
    extras: ["No downtime", "No electricity costs"],
    highlighted: true,
  },
] as const;

export const STAKING_PLANS = [
  { days: 30, returnPct: 5 },
  { days: 60, returnPct: 10 },
  { days: 90, returnPct: 15 },
  { days: 180, returnPct: 20 },
  { days: 360, returnPct: 25 },
] as const;
