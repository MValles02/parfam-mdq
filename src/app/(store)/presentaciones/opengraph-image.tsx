// Next's `opengraph-image` convention does not inherit into nested segments;
// it applies only to the segment containing the file. This re-export gives
// this route the site image so every shared link consistently shows the logo.
export { default, alt, size, contentType } from "../opengraph-image";
