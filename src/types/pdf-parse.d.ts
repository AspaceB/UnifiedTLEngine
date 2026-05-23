// The pdf-parse package ships type declarations only for its top-level entry.
// We import the internal module directly to bypass the debug harness that
// otherwise reads a sample PDF at module load.
declare module "pdf-parse/lib/pdf-parse.js" {
  import PdfParse = require("pdf-parse");
  export = PdfParse;
}
