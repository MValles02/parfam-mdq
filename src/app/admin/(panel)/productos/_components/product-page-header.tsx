import Link from "next/link";
import { ADMIN_PRODUCTS_PATH } from "../paths";

/** Breadcrumb and title shared by the new-product and edit-product pages. */
export function ProductPageHeader({
  breadcrumb,
  title,
  subtitle,
}: {
  /** Text after "Productos ·" in the breadcrumb. */
  breadcrumb: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b px-8 py-7">
      <p className="text-xs text-muted-foreground">
        <Link href={ADMIN_PRODUCTS_PATH} className="hover:text-foreground">
          Productos
        </Link>
        {` · ${breadcrumb}`}
      </p>
      <h1 className="mt-1.5 text-3xl leading-none font-extrabold tracking-tight">
        {title}
      </h1>
      {subtitle !== undefined ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
