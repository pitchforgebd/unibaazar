import Link from "next/link";

type SocialLoginButtonsProps = {
  google: boolean;
  facebook: boolean;
};

export function SocialLoginButtons({ google, facebook }: SocialLoginButtonsProps) {
  if (!google && !facebook) {
    return null;
  }
  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-xs text-muted">Or continue with</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {google ? (
          <Link
            href="/api/v1/auth/oauth/google"
            className="rounded-md border border-black/10 px-3 py-2 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            Google
          </Link>
        ) : null}
        {facebook ? (
          <Link
            href="/api/v1/auth/oauth/facebook"
            className="rounded-md border border-black/10 px-3 py-2 text-center text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            Facebook
          </Link>
        ) : null}
      </div>
    </div>
  );
}
