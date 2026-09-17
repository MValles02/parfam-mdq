"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Wrapper fino de next-themes para la tienda. No hay toggle: el diseño
 * aprobado es crema/negro y el modo oscuro es el derivado que ya esta en
 * globals.css, asi que el sitio solo respeta la preferencia del sistema
 * operativo (ver AGENTS.md de esta tarea).
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
