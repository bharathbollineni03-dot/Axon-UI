import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Two stacked chevrons; the one for the active direction is drawn solid by CSS. */
export function SortIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path className="axon-sort-icon__up" d="M4.5 6.5 8 3l3.5 3.5" />
      <path className="axon-sort-icon__down" d="M4.5 9.5 8 13l3.5-3.5" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 3.5 4.5 4.5L6 12.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </Icon>
  );
}

export function ChevronDoubleLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8.5 3.5 4 8l4.5 4.5M12.5 3.5 8 8l4.5 4.5" />
    </Icon>
  );
}

export function ChevronDoubleRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5 8 8l-4.5 4.5M7.5 3.5 12 8l-4.5 4.5" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <circle cx="3.5" cy="8" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="12.5" cy="8" r="1.25" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 3.25 3.25" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 3.5h11L9.25 8.75v3.5L6.75 13.5V8.75z" />
    </Icon>
  );
}

export function ColumnsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <path d="M6.2 3v10M9.8 3v10" />
    </Icon>
  );
}

export function DensityIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </Icon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M3 13h10" />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 2.5 4 4-2 .5-2.25 2.25.25 2.25-1 1L5.5 9.75 2.75 12.5l-.25-.25L5.25 9.5 2.5 6.75l1-1 2.25.25L8 3.75z" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </Icon>
  );
}

export function GroupIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.75" width="11" height="3.5" rx="1" />
      <path d="M5 9.5h8.5M5 12.5h8.5" />
    </Icon>
  );
}

export function GripIcon(props: IconProps) {
  return (
    <Icon {...props} fill="currentColor" stroke="none">
      <circle cx="6" cy="4" r="1" />
      <circle cx="10" cy="4" r="1" />
      <circle cx="6" cy="8" r="1" />
      <circle cx="10" cy="8" r="1" />
      <circle cx="6" cy="12" r="1" />
      <circle cx="10" cy="12" r="1" />
    </Icon>
  );
}
