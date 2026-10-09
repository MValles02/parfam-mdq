import type { Metadata } from "next";
import {
  NOT_FOUND_TITLE,
  NotFoundContent,
} from "@/components/store/not-found-content";

// `absolute` skips the root title template.
export const metadata: Metadata = {
  title: { absolute: NOT_FOUND_TITLE },
};

/** Inside `(store)/layout.tsx`, which already provides the chrome. */
export default NotFoundContent;
