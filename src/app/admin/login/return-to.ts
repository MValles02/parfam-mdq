import {
  ADMIN_HOME_PATH,
  LEGACY_RETURN_TO_PARAM,
  RETURN_TO_PARAM,
} from "@/lib/auth.config";

/**
 * Reads the page to reopen after signing in from the login URL, preferring
 * `returnTo` over the legacy `volverA` of older bookmarks.
 */
export function readReturnToParam(
  searchParams: Record<string, string | string[] | undefined>,
): string | undefined {
  const returnTo = searchParams[RETURN_TO_PARAM];
  if (typeof returnTo === "string") return returnTo;
  const legacyReturnTo = searchParams[LEGACY_RETURN_TO_PARAM];
  return typeof legacyReturnTo === "string" ? legacyReturnTo : undefined;
}

/**
 * Resolves the post-login redirect from the submitted login form. Only panel
 * paths are accepted, so the field cannot redirect elsewhere; anything else
 * opens the panel home. The legacy field name is still read from forms
 * rendered before the rename.
 */
export function resolveReturnTo(formData: FormData): string {
  const returnTo =
    formData.get(RETURN_TO_PARAM) ?? formData.get(LEGACY_RETURN_TO_PARAM);
  return typeof returnTo === "string" && returnTo.startsWith(ADMIN_HOME_PATH)
    ? returnTo
    : ADMIN_HOME_PATH;
}
