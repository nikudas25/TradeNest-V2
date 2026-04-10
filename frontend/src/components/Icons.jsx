function IconBase({ children, className = "", size = 20 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}


export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}


export function HeartIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 21s-7-4.6-9-9.3C1.3 7.7 3.6 4 7.4 4A5.2 5.2 0 0 1 12 6.5 5.2 5.2 0 0 1 16.6 4C20.4 4 22.7 7.7 21 11.7 19 16.4 12 21 12 21Z" />
    </IconBase>
  );
}


export function CartIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
      <path d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.7L21 7H7" />
    </IconBase>
  );
}


export function UserIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </IconBase>
  );
}


export function ArrowRightIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </IconBase>
  );
}


export function StarIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.4 9.3l6-.9L12 3Z" />
    </IconBase>
  );
}


export function ShieldIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v5c0 4.3 2.8 8.1 7 10 4.2-1.9 7-5.7 7-10V6l-7-3Z" />
      <path d="m9.5 12 1.7 1.8 3.8-4.2" />
    </IconBase>
  );
}


export function TruckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M2 7h12v8H2Z" />
      <path d="M14 10h4l3 3v2h-7Z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="18" cy="18" r="1.5" />
    </IconBase>
  );
}


export function SparkIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.2 4.8L18 9l-4.8 1.2L12 15l-1.2-4.8L6 9l4.8-1.2L12 3Z" />
      <path d="m19 16 .5 2 .5-2 2-.5-2-.5-.5-2-.5 2-2 .5 2 .5Z" />
      <path d="m5 16 .8 3 .8-3 3-.8-3-.8-.8-3-.8 3-3 .8 3 .8Z" />
    </IconBase>
  );
}

