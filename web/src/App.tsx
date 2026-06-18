import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layouts/Layout";
import About from "./pages/About";
import Acknowledgements from "./pages/Acknowledgements";
import Home from "./pages/Home";
import Notes from "./pages/Notes";
import Showcase from "./pages/Main";
import Privacy from "./pages/Privacy";
import Specimen from "./pages/Specimen";
import Terms from "./pages/Terms";
import Generate from "./pages/Generate";

/**
 * Route map:
 *   /                   → Home (landing page, what-this-is intro)
 *   /about              → About (long-form intro; formerly the IntroDialog modal)
 *   /credits            → Acknowledgements (open-source data + font credits)
 *   /showcase           → existing showcase (formerly at /)
 *   /specimen/:family   → per-font specimen page
 *   /generate           → stepped font-generation flow
 *   /terms              → Terms & Conditions
 *   /privacy            → Privacy Policy
 *
 * `Showcase` is the same component the old `/` route used (pages/Main.tsx).
 * Aliased on import for readability; renaming the file isn't worth the
 * git churn.
 */
function App() {
  // ── Build-time prerender signal ────────────────────────────────────
  // scripts/pre-rendering.mjs loads each route in headless Chrome and
  // snapshots the DOM to a static .html file (so crawlers and social
  // unfurlers see real per-route markup + meta instead of the empty SPA
  // shell). It waits for `window.__PRERENDER_READY__` before snapshotting.
  //
  // This effect is the signal. It runs in App, the tree's root component,
  // so React's bottom-up passive-effect ordering guarantees it fires
  // AFTER the matched route's `useDocumentMeta` effect has already set
  // document.title + the og/twitter/canonical tags. By the time the flag
  // flips true, the head reflects the current route and the DOM is safe
  // to capture. No-op in normal browsers (nothing reads the flag).
  useEffect(() => {
    (
      window as unknown as { __PRERENDER_READY__?: boolean }
    ).__PRERENDER_READY__ = true;
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="credits" element={<Acknowledgements />} />
          <Route path="generate" element={<Generate />} />
          <Route path="notes" element={<Notes />} />
          <Route path="specimen/:family" element={<Specimen />} />
          <Route path="showcase" element={<Showcase />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
