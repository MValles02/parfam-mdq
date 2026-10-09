/**
 * Panel routes for products, shared by pages, client components, and the
 * Server Actions that revalidate them. The Spanish segments are public URLs.
 */
export const ADMIN_PRODUCTS_PATH = "/admin/productos";

export const NEW_ADMIN_PRODUCT_PATH = `${ADMIN_PRODUCTS_PATH}/nuevo`;

export function getAdminProductPath(id: string) {
  return `${ADMIN_PRODUCTS_PATH}/${id}`;
}
