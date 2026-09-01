// Card art for the Accounts tab's wallet-style view. Gradients are inspired
// by each brand's real color palette (from photos the household provided
// for BPI, Metrobank, Wise, Maya, BDO, and Maribank). `logo` is an actual
// brand logo file (transparent PNG), shown top-left like a real card's
// issuer mark — a deliberate, later change from the original "never actual
// logos" stance, made with the household's explicit sign-off since this
// repo and the deployed app are both public. Brands without a `logo` fall
// back to the plain type-label text in the bottom zone.
//
// A few different logo sources are in play, which is why the gradients
// don't all follow one rule. BDO keeps its real saturated gold/yellow —
// matching the actual debit card's own color, by household preference —
// even though the logo's own gold "O" outline has less contrast against it
// than the blue "BD" does. Maya's mint mark reads fine on its dark card as
// exported. BPI uses Brandfetch's single-tone "dark theme" symbol (solid
// gold), made specifically to sit on a dark background, hence BPI's own
// dark red gradient rather than a light one. Metrobank's mark is a single
// solid blue, so its card moved to a light neutral — its original navy
// gradient was too close to the mark's own blue to read at all.
import bdoLogo from '../assets/logos/bdo.png';
import bpiLogo from '../assets/logos/bpi.png';
import mayaLogo from '../assets/logos/maya.png';
import metrobankLogo from '../assets/logos/metrobank.png';
import pafcpicLogo from '../assets/logos/pafcpic.png';
import gcashLogo from '../assets/logos/gcash.png';

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
    gradient: ['#eef4fb', '#d7e6f7'],
    textColor: '#122447',
    accent: 'none',
    logo: metrobankLogo,
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
    // This asset's "G" and "GCash" wordmark are white — made to sit on
    // GCash's own brand blue (confirmed by compositing it: unreadable on
    // light/white, crisp on this exact blue), so this stays on the
    // original saturated gradient rather than moving to a light neutral.
    match: 'gcash',
    gradient: ['#0072ce', '#00a8ff'],
    textColor: '#ffffff',
    accent: 'none',
    logo: gcashLogo,
  },
  {
    match: 'maribank',
    gradient: ['#f2701e', '#ff8c3d'],
    textColor: '#ffffff',
    accent: 'diagonal',
  },
  {
    // PAFCPIC's mark uses white as an active design color (seal background,
    // letter fills), not just a removed backdrop — needs a dark card so
    // those white parts (plus its yellow accents) actually show up.
    match: 'pafc',
    gradient: ['#0a0a0a', '#1c1c1c'],
    textColor: '#ffffff',
    accent: 'none',
    logo: pafcpicLogo,
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
