import { ReactNode, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type PullContainerMetrics = Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight">;

const MOBILE_MAX_WIDTH = 1024;
const TOP_TOLERANCE_PX = 2;
const SCROLL_TOLERANCE_PX = 4;
const PULL_DAMPING = 0.55;

export const hasScrollableContent = (metrics: PullContainerMetrics | null) =>
  Boolean(metrics && metrics.scrollHeight - metrics.clientHeight > SCROLL_TOLERANCE_PX);

export const isScrolledToTop = (metrics: PullContainerMetrics | null) =>
  Boolean(metrics && metrics.scrollTop <= TOP_TOLERANCE_PX);

export const canArmPullToRefresh = (metrics: PullContainerMetrics | null) =>
  hasScrollableContent(metrics) && isScrolledToTop(metrics);

const getNestedScrollableParent = (target: EventTarget | null, boundary: HTMLElement) => {
  if (typeof window === "undefined" || !(target instanceof Element)) return null;

  let current: Element | null = target;
  while (current && current !== boundary) {
    if (current instanceof HTMLElement) {
      const overflowY = window.getComputedStyle(current).overflowY;
      if (/(auto|scroll|overlay)/.test(overflowY) && hasScrollableContent(current)) {
        return current;
      }
    }
    current = current.parentElement;
  }

  return null;
};

/**
 * Custom pull-to-refresh for mobile/tablet.
 *
 * Behaviour:
 *  - Only active on touch devices with viewport width <= 1024px.
 *  - Refresh ONLY triggers when the user pulls the screen down by at least
 *    95% of the viewport height, starting from the very top of the page
 *    (scrollTop === 0) on a page that actually has vertical scroll space.
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
  const activeNestedScroller = useRef<HTMLElement | null>(null);
  const pullPxRef = useRef(0);
  const refreshingRef = useRef(false);

  const setPullDistance = (value: number) => {
    pullPxRef.current = value;
    setPullPx(value);
  };

  const setRefreshingState = (value: boolean) => {
    refreshingRef.current = value;
    setRefreshing(value);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const isTouchTabletOrMobile = () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches &&
      window.innerWidth <= MOBILE_MAX_WIDTH;

    const threshold = () => Math.round(window.innerHeight * 0.95);

    const resetGesture = () => {
      armed.current = false;
      activeNestedScroller.current = null;
      startY.current = null;
      setPullDistance(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (!isTouchTabletOrMobile() || refreshingRef.current) return;

      activeNestedScroller.current = getNestedScrollableParent(e.target, el);
      startY.current = e.touches[0].clientY;
      setPullDistance(0);

      if (activeNestedScroller.current) {
        armed.current = false;
        return;
      }

      armed.current = canArmPullToRefresh(el);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouchTabletOrMobile() || startY.current === null || activeNestedScroller.current) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (armed.current) setPullDistance(0);
        return;
      }

      if (!isScrolledToTop(el)) {
        armed.current = false;
        setPullDistance(0);
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      if (!armed.current) {
        return;
      }

      // Apply rubber-band damping so visual pull feels natural
      const damped = Math.min(dy * 0.55, window.innerHeight);
      setPullDistance(damped);
    };

    const onTouchEnd = () => {
      if (startY.current === null) return;

      const wasArmed = armed.current;
      const actualDy = pullPxRef.current / PULL_DAMPING;

      armed.current = false;
      activeNestedScroller.current = null;
      startY.current = null;

      if (wasArmed && actualDy >= threshold() && canArmPullToRefresh(el)) {
        setRefreshingState(true);
        // Brief delay so the spinner is visible, then reload.
        setTimeout(() => window.location.reload(), 250);
      } else {
        resetGesture();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef]);

  const progress = Math.min(
    pullPx / ((typeof window === "undefined" ? 1 : window.innerHeight) * 0.95 * PULL_DAMPING),
    1
  );

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
