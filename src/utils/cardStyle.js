// Card art for the Accounts tab's wallet-style view. Gradients are inspired
// by each brand's real color palette (from photos the household provided
// for BPI, Metrobank, Wise, Maya, BDO, and Maribank). `logo` is an actual
// brand logo file (transparent PNG, background knocked out from a real
// export) shown in the card's bottom zone in place of the plain type label
// when one is available — a deliberate, later change from the original
// "never actual logos" stance, made with the household's explicit sign-off
// since this repo and the deployed app are both public. Brands without a
// `logo` fall back to the plain type-label text.
import bdoLogo from '../assets/logos/bdo.png';
import bpiLogo from '../assets/logos/bpi.png';
import mayaLogo from '../assets/logos/maya.png';

const BRAND_STYLES = [
  {
    match: 'bpi',
    gradient: ['#2a0a0a', '#8b1a1a'],
    textColor: '#ffffff',
    accent: 'diagonal',
    logo: bpiLogo,
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
    logo: mayaLogo,
  },
  {
    match: 'bdo',
    gradient: ['#f2b705', '#e8940c'],
    textColor: '#1a2b4d',
    accent: 'stripe',
    logo: bdoLogo,
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
