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
