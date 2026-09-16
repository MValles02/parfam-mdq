# design

Archivos fuente del canvas de diseño (Fase 0.75 del PLAN.md).

Cada `.dc.html` es un artboard del canvas; `canvas.json` define la grilla, las dos páginas
(Tienda y Panel) y las notas. `parfam-mdq-tienda.html` es el canvas ya armado que se publica
como Artifact — **no se edita a mano**: se regenera desde los `.dc.html`.

| Archivo                      | Pantalla                           |
| ---------------------------- | ---------------------------------- |
| `Main.dc.html`               | Home: hero + catálogo con filtros  |
| `Producto.dc.html`           | Ficha de producto                  |
| `Carrito.dc.html`            | Drawer del carrito                 |
| `Checkout.dc.html`           | Checkout por WhatsApp              |
| `HomeMobile.dc.html`         | Home a 390px con drawer de filtros |
| `AdminProductos.dc.html`     | Panel: lista de productos          |
| `AdminProductoNuevo.dc.html` | Panel: alta de producto            |

La paleta y la tipografía salen de `src/app/globals.css`: crema `#F2EEE9`, tinta negra,
borde `#DCD5CA`, radio 4px, Outfit. Los frascos son siluetas SVG placeholder — van fotos
propias servidas desde R2.
