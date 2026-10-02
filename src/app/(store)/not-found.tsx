import type { Metadata } from "next";
import { NotFoundContent } from "@/components/store/not-found-content";

// `absolute` skips the root title template.
export const metadata: Metadata = {
  title: { absolute: "Página no encontrada" },
};

/** Inside `(store)/layout.tsx`, which already provides the chrome. */
export default NotFoundContent;
