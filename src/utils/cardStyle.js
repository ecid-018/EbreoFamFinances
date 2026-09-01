// Card art for the Accounts tab's wallet-style view. Inspired by each
// brand's real color palette (from photos the household provided for BPI,
// Metrobank, Wise, Maya, BDO, and Maribank) — never their actual logos,
// wordmarks, or card-network marks (Mastercard/Visa), which are trademarked
// and aren't needed anyway since the account name already renders as text.
const BRAND_STYLES = [
  {
    match: 'bpi',
    gradient: ['#2a0a0a', '#8b1a1a'],
    textColor: '#ffffff',
    accent: 'diagonal',
  },
  {
    match: 'metrobank',
    gradient: ['#1b3a6b', '#3d6fa5'],
    textColor: '#ffffff',
    accent: 'dots',
  },
  {
    match: 'wise',
    gradient: ['#9fe440', '#85d633'],
    textColor: '#163300',
    accent: 'none',
  },
  {
    match: 'maya',
    gradient: ['#0a0a0a', '#1c1c1c'],
    textColor: '#ffffff',
    accent: 'none',
    tagColor: '#00d9a3',
  },
  {
    match: 'bdo',
    gradient: ['#f2b705', '#e8940c'],
    textColor: '#1a2b4d',
    accent: 'stripe',
  },
  {
    match: 'gcash',
    gradient: ['#0072ce', '#00a8ff'],
    textColor: '#ffffff',
    accent: 'none',
  },
  {
    match: 'maribank',
    gradient: ['#f2701e', '#ff8c3d'],
    textColor: '#ffffff',
    accent: 'diagonal',
  },
];

const CASH_STYLE = {
  gradient: ['#1c6b3f', '#2e9e5b'],
  textColor: '#ffffff',
  accent: 'none',
};

const GENERIC_BANK_STYLE = {
  gradient: ['#3a3a3c', '#5a5a5e'],
  textColor: '#ffffff',
  accent: 'none',
};

const GENERIC_EWALLET_STYLE = {
  gradient: ['#e2472b', '#ff7a5c'],
  textColor: '#ffffff',
  accent: 'none',
};

export function getCardStyle(account) {
  if (account.type === 'cash') return CASH_STYLE;

  const lowerName = account.name.toLowerCase();
  const brand = BRAND_STYLES.find(({ match }) => lowerName.includes(match));
  if (brand) return brand;

  return account.type === 'ewallet' ? GENERIC_EWALLET_STYLE : GENERIC_BANK_STYLE;
}
