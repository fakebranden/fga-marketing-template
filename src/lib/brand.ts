// Depth-independent brand-config accessor. Pages live at varying depths
// (src/app/page.tsx, src/app/about/page.tsx, …) so a relative
// `../../brand-config.json` import resolves differently per page and breaks
// nested routes. Always import the brand kit via `@/lib/brand` instead.
import brand from "../../brand-config.json";

export default brand;
