import { Box, Container, SxProps } from "@mui/material";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { Theme } from "@emotion/react";

/**
 * Sticky-footer layout. Header and Footer take their natural height;
 * the Outlet wrapper expands (`flex: 1`) so the footer is pinned to
 * the bottom of the viewport when content is short and pages scroll
 * the document naturally when content is long.
 *
 * Pages should NOT set `position: fixed`, `height: 100%`, or
 * `overflow: scroll` on their outer containers — those tricks were
 * needed when #root was `position: fixed`, but that hack is gone now.
 */
const Layout = () => {
  return (
    <Container fixed maxWidth="xl" sx={rootSx}>
      <Header />
      <Box sx={outletSx}>
        <Outlet />
      </Box>
      <Footer />
    </Container>
  );
};

export default Layout;

const rootSx: SxProps<Theme> = {
  flex: 1,
  minHeight: "100dvh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  // Responsive horizontal padding so wide screens get more breathing
  // room without compressing phones.
  px: { xs: 2, md: 3, lg: 4 },
};

const outletSx: SxProps<Theme> = {
  // Grow to fill the gap between Header and Footer so the footer is
  // pinned to the viewport bottom when the page's natural content is
  // short. Pages can use flex layout inside this box if they need it.
  flex: 1,
  width: "100%",
  display: "flex",
  flexDirection: "column",
};
