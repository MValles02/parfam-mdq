# brand

Identidad visual de Parfam MDQ, exportada del Canva.

## Qué subir

- `logo.*` — logo principal, preferentemente **SVG** o PNG con fondo transparente.
- `logo-dark.*` — variante para fondo oscuro, si existe.
- `hero.*` — imagen grande para el encabezado de la home (lo más ancha posible, JPG/PNG).
- `isotipo.*` / favicon — la versión chica de la marca, si la hay.
- Cualquier captura o referencia de paleta y tipografías (`referencias/`).

## Cómo subirlo

```bash
scp -r ./canva-exports/* mateo@<IP-DE-LA-VPS>:/home/mateo/projects/parfam-mdq/brand/
```

De acá saco los tokens de color y la tipografía del tema (Fase 4 del PLAN.md).
Estos archivos sí se versionan: son livianos y son la fuente de verdad de la marca.
