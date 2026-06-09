import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/layouts/Layout";
import Main from "./pages/Main";
import Specimen from "./pages/Specimen";
import Generate from "./pages/Generate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* /generate is matched first so it doesn't collide with the
              catch-all :path? route used by Main. */}
          <Route path="generate" element={<Generate />} />
          <Route path="specimen/:family" element={<Specimen />} />
          <Route path=":path?" element={<Main />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
