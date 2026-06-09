import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layouts/Layout";
import About from "./pages/About";
import Home from "./pages/Home";
import Showcase from "./pages/Main";
import Specimen from "./pages/Specimen";
import Generate from "./pages/Generate";

/**
 * Route map:
 *   /                   → Home (landing page, what-this-is intro)
 *   /about              → About (long-form intro; formerly the IntroDialog modal)
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
          <Route path="about" element={<About />} />
          <Route path="generate" element={<Generate />} />
          <Route path="specimen/:family" element={<Specimen />} />
          <Route path="showcase" element={<Showcase />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
