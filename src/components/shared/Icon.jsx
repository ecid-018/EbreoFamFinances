const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ children, size = 24, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...common} {...props}>
      {children}
    </svg>
  );
}

export function HomeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </Svg>
  );
}

export function BudgetIcon(props) {
  return (
    <Svg {...props}>
      <path d="M5 19V10" />
      <path d="M12 19V5" />
      <path d="M19 19v-6" />
    </Svg>
  );
}

export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function ActivityIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function MoreIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function BankIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 5l8 5.5" />
      <path d="M5 10.5h14V19H5z" />
      <path d="M9 13.5v3M12 13.5v3M15 13.5v3" />
    </Svg>
  );
}

export function WalletIcon(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="7" width="16" height="11" rx="2.5" />
      <path d="M4 10.5h16" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function CashIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M6 9v0M18 15v0" />
    </Svg>
  );
}

export function ChevronLeftIcon(props) {
  return (
    <Svg {...props}>
      <path d="M14.5 6 9 12l5.5 6" />
    </Svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </Svg>
  );
}

export function WarningIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 4.5 21 19H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 9.5 12 15l6-5.5" />
    </Svg>
  );
}

export function IncomeIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Svg>
  );
}

export function ExpenseIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </Svg>
  );
}

export function SettingsIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.5 1.5M7.8 16.2l-1.5 1.5M17.7 17.7l-1.5-1.5M7.8 7.8 6.3 6.3" />
    </Svg>
  );
}

export function LockIcon(props) {
  return (
    <Svg {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  );
}

export function BackspaceIcon(props) {
  return (
    <Svg {...props}>
      <path d="M9 6h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-6-6z" />
      <path d="M13 10l5 4M18 10l-5 4" />
    </Svg>
  );
}

// Generic card-chip glyph — universal card iconography, not tied to any
// specific bank or network.
export function ChipIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="10" height="8" rx="1.8" />
      <path d="M3 9h10M7 5v8M6 7h1.6M6 11h1.6" />
    </Svg>
  );
}

// Generic contactless-payment wave glyph.
export function ContactlessIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 5.5C9 8 9 16 6 18.5" />
      <path d="M9.5 3.5C13.5 7 13.5 17 9.5 20.5" />
      <path d="M13 2C18 6.5 18 17.5 13 22" />
    </Svg>
  );
}

export function TransferIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 8h13M13 4l4 4-4 4" />
      <path d="M20 16H7M11 12l-4 4 4 4" />
    </Svg>
  );
}

export function PencilIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19 4 20z" />
      <path d="M13.5 6.5 17.5 10.5" />
    </Svg>
  );
}

export function SortIcon(props) {
  return (
    <Svg {...props}>
      <path d="M7 4v16M7 20l-3-3M7 20l3-3" />
      <path d="M17 20V4M17 4l-3 3M17 4l3 3" />
    </Svg>
  );
}
