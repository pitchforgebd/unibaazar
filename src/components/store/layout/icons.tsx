import { cn } from "@/lib/utils/cn";

type IconProps = {
  className?: string;
  size?: number;
};

function iconClass(className?: string) {
  return cn("shrink-0", className);
}

export function MenuIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function CartIcon({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M6.5 7h13l-1.4 8.2a1.5 1.5 0 0 1-1.5 1.3H9.2a1.5 1.5 0 0 1-1.5-1.2L6 4.5H3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function HomeIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CategoriesIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function UserIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.2c1.4-2.8 3.8-4.2 7-4.2s5.6 1.4 7 4.2" strokeLinecap="round" />
    </svg>
  );
}

export function TruckIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M3 7h11v8H3V7Zm11 3h4l3 3v2h-7v-5Z" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.5" />
      <circle cx="17" cy="17.5" r="1.5" />
    </svg>
  );
}

export function PhoneIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M8 4.5h2.2l1.2 3-1.6 1a12 12 0 0 0 5.7 5.7l1-1.6 3 1.2V16a2 2 0 0 1-2.2 2A14.5 14.5 0 0 1 6 7.7 2 2 0 0 1 8 4.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MailIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" strokeLinejoin="round" />
    </svg>
  );
}

export function PinIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function FacebookIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M14.2 8.5V6.9c0-.6.4-.9 1-.9H17V3.5h-2.2C12.1 3.5 11 4.8 11 7v1.5H9v2.7h2V20.5h3v-9.3h2.3l.4-2.7h-2.5Z"
      />
    </svg>
  );
}

export function InstagramIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YouTubeIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M21 8.2a3 3 0 0 0-2.1-2.1C17.2 5.7 12 5.7 12 5.7s-5.2 0-6.9.4A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12 31 31 0 0 0 3 15.8a3 3 0 0 0 2.1 2.1c1.7.4 6.9.4 6.9.4s5.2 0 6.9-.4a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-3.8 31 31 0 0 0-.4-3.8ZM10.4 15.1V8.9L15.2 12l-4.8 3.1Z"
      />
    </svg>
  );
}

export function MessengerIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 2.2C6.4 2.2 2 6.3 2 11.5c0 2.9 1.4 5.5 3.6 7.2V22l3.3-1.8c.9.2 1.8.4 2.8.4 5.6 0 10-4.1 10-9.3C21.7 6.3 17.3 2.2 12 2.2Zm1 12.5-2.6-2.7-5 2.7 5.4-5.7 2.6 2.7 5-2.7-5.4 5.7Z"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={iconClass(className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12.1 3.5a8.4 8.4 0 0 0-7.2 12.6L4 20.5l4.6-.9A8.4 8.4 0 1 0 12.1 3.5Zm4.8 11.9c-.2.6-1.2 1.1-1.6 1.1-.4.1-.9.2-3-.8-2.5-1.1-4.1-3.6-4.2-3.8-.2-.2-1.2-1.6-1.2-3s.8-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5.2.6.8 2 .8 2.1.1.2 0 .3-.1.5l-.4.5c-.1.2-.3.3-.1.6.2.3.7 1.2 1.6 1.9 1.1.9 2 1.1 2.3 1.3.3.1.4.1.6-.1l.7-.8c.2-.2.3-.2.6-.1.2.1 1.6.8 1.9.9.3.2.4.2.5.3.1.3 0 .8-.2 1.3Z"
      />
    </svg>
  );
}
