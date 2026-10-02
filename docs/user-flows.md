# User flows

The detailed flows are organized by user intent.

## Store customer

1. [View the catalog](flows/view-catalog.md)
2. [Add items to the cart](flows/add-to-cart.md)
3. [Create a WhatsApp order](flows/create-order.md)
4. Read product, presentation, contact, and purchase guidance pages

## Administrator

1. [Sign in](flows/login.md)
2. [Publish a product](flows/publish-product.md)
3. [Upload a product image](flows/upload-image.md)
4. [Manage an order](flows/manage-order.md)
5. Update brands and edit site settings

## Operator

1. Import the reference catalog through `pnpm db:import-references`, after
   checking translation coverage with `pnpm db:check-translations`
2. Seed the local environment through `pnpm db:seed`
3. Build and deploy through the workflow described in
   [deployment.md](deployment.md)

Customer labels, messages, and examples in the detailed flows remain Spanish
because they are product copy for Argentine users.
