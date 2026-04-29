import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets scroll position to the top whenever the route changes.
 * Prevents the "collapsed / blank" feel when navigating to a new page
 * while still scrolled mid-way down the previous one.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use instant scroll — smooth scroll feels laggy on route changes.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // Also reset the main scroll container if the layout uses one.
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
