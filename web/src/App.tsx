import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layouts/Layout";
import Home from "./pages/Home";
import Showcase from "./pages/Main";
import Specimen from "./pages/Specimen";
import Generate from "./pages/Generate";

/**
 * Route map:
 *   /                   → Home (new landing page, what-this-is intro)
 *   /showcase           → existing showcase (formerly at /)
 *   /specimen/:family   → per-font specimen page
 *   /generate           → stepped font-generation flow
 *
 * `Showcase` is the same component the old `/` route used (pages/Main.tsx).
 * Aliased on import for readability; renaming the file isn't worth the
 * git churn.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="generate" element={<Generate />} />
          <Route path="specimen/:family" element={<Specimen />} />
          <Route path="showcase" element={<Showcase />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
