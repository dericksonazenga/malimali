import { ReactNode, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Custom pull-to-refresh for mobile/tablet.
 *
 * Behaviour:
 *  - Only active on touch devices with viewport width <= 1024px.
 *  - Refresh ONLY triggers when the user pulls the screen down by at least
 *    95% of the viewport height, starting from the very top of the page
 *    (scrollTop === 0).
 *  - Any pull less than 95% is cancelled silently — the page does NOT refresh.
 *  - Native browser pull-to-refresh stays disabled (overscroll-behavior-y:none
 *    on <html>) so this is the only path that can refresh the system.
 */
const PullToRefresh = ({
  scrollRef,
  children,
}: {
  scrollRef: React.RefObject<HTMLElement>;
  children: ReactNode;
}) => {
  const [pullPx, setPullPx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isTouchTabletOrMobile = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches &&
      window.innerWidth <= 1024;

    const threshold = () => Math.round(window.innerHeight * 0.95);

    const onTouchStart = (e: TouchEvent) => {
      if (!isTouchTabletOrMobile()) return;
      if (el.scrollTop > 0) {
        armed.current = false;
        return;
      }
      armed.current = true;
      startY.current = e.touches[0].clientY;
      setPullPx(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current === null) return;
      if (el.scrollTop > 0) {
        armed.current = false;
        startY.current = null;
        setPullPx(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPullPx(0);
        return;
      }
      // Apply rubber-band damping so visual pull feels natural
      const damped = Math.min(dy * 0.55, window.innerHeight);
      setPullPx(damped);
    };

    const onTouchEnd = () => {
      if (!armed.current) return;
      armed.current = false;
      startY.current = null;

      // Compute the actual finger displacement (undo damping) to compare
      // against 95% viewport height threshold.
      const actualDy = pullPx / 0.55;
      if (actualDy >= threshold()) {
        setRefreshing(true);
        // Brief delay so the spinner is visible, then reload.
        setTimeout(() => window.location.reload(), 250);
      } else {
        setPullPx(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef, pullPx]);

  const progress = Math.min(pullPx / (window.innerHeight * 0.95 * 0.55), 1);

  return (
    <>
      {(pullPx > 0 || refreshing) && (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-[60] flex justify-center"
          style={{ transform: `translateY(${Math.min(pullPx, 80)}px)` }}
        >
          <div
            className={cn(
              "mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border shadow-card-soft",
              refreshing && "animate-spin"
            )}
            style={{ opacity: refreshing ? 1 : progress }}
          >
            <RefreshCw
              className="h-5 w-5 text-primary"
              style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)` }}
            />
          </div>
        </div>
      )}
      {children}
    </>
  );
};

export default PullToRefresh;
