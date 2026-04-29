import { ReactNode, useEffect, useRef, useState, forwardRef } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  className?: string;
  onRefresh?: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
}

/**
 * Custom pull-to-refresh for mobile/tablet.
 * Works inside a scroll container (browser native PTR is disabled globally).
 * Default behavior reloads the page if onRefresh isn't provided.
 */
function isInsideInnerScroller(target: HTMLElement, container: HTMLElement): boolean {
  let node: HTMLElement | null = target;
  while (node && node !== container) {
    if (node.hasAttribute("data-no-ptr")) return true;
    const style = window.getComputedStyle(node);
    const oy = style.overflowY;
    const ox = style.overflowX;
    const scrollableY = (oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 1;
    const scrollableX = (ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 1;
    if (scrollableY || scrollableX) return true;
    node = node.parentElement;
  }
  return false;
}

const PullToRefresh = forwardRef<HTMLElement, PullToRefreshProps>(
  ({ children, className, onRefresh, threshold, maxPull = 180 }, ref) => {
    const innerRef = useRef<HTMLElement>(null);
    const scrollRef = (ref as React.MutableRefObject<HTMLElement>) || innerRef;

    // All gesture state lives in refs — re-rendering during a pull would
    // re-attach handlers and drop the gesture. We only setState for visuals.
    const startY = useRef<number | null>(null);
    const pulling = useRef(false);
    const pullDistanceRef = useRef(0);
    const refreshingRef = useRef(false);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const effectiveThreshold = threshold ?? 90;
    const TOP_EDGE_ZONE = 80;

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;

      const setDistance = (d: number) => {
        pullDistanceRef.current = d;
        setPullDistance(d);
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (refreshingRef.current) return;
        if (el.scrollTop > 0) {
          startY.current = null;
          return;
        }
        const touch = e.touches[0];
        if (touch.clientY > TOP_EDGE_ZONE) {
          startY.current = null;
          return;
        }
        const target = e.target as HTMLElement | null;
        if (target && isInsideInnerScroller(target, el)) {
          startY.current = null;
          return;
        }
        startY.current = touch.clientY;
        pulling.current = false;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (refreshingRef.current || startY.current === null) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta <= 0) {
          setDistance(0);
          pulling.current = false;
          return;
        }
        if (el.scrollTop > 0) {
          setDistance(0);
          pulling.current = false;
          startY.current = null;
          return;
        }
        pulling.current = true;
        const resisted = Math.min(maxPull, delta * 0.55);
        setDistance(resisted);
        if (e.cancelable) e.preventDefault();
      };

      const finishGesture = async () => {
        if (!pulling.current) {
          setDistance(0);
          startY.current = null;
          return;
        }
        const shouldRefresh = pullDistanceRef.current >= effectiveThreshold;
        startY.current = null;
        pulling.current = false;

        if (shouldRefresh) {
          refreshingRef.current = true;
          setRefreshing(true);
          setDistance(effectiveThreshold);
          try {
            if (onRefreshRef.current) {
              await onRefreshRef.current();
            } else {
              window.location.reload();
              return;
            }
          } finally {
            refreshingRef.current = false;
            setRefreshing(false);
            setDistance(0);
          }
        } else {
          setDistance(0);
        }
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (refreshingRef.current || el.scrollTop > 0) return;
        if (e.clientY > TOP_EDGE_ZONE) return;
        const target = e.target as HTMLElement | null;
        if (target && isInsideInnerScroller(target, el)) return;
        startY.current = e.clientY;
        pulling.current = false;
      };
      const handleMouseMove = (e: MouseEvent) => {
        if (refreshingRef.current || startY.current === null) return;
        if ((e.buttons & 1) === 0) {
          startY.current = null;
          setDistance(0);
          return;
        }
        const delta = e.clientY - startY.current;
        if (delta <= 0 || el.scrollTop > 0) {
          setDistance(0);
          pulling.current = false;
          return;
        }
        pulling.current = true;
        setDistance(Math.min(maxPull, delta * 0.35));
      };
      const handleMouseUp = () => { finishGesture(); };

      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", finishGesture, { passive: true });
      el.addEventListener("touchcancel", finishGesture, { passive: true });
      el.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", finishGesture);
        el.removeEventListener("touchcancel", finishGesture);
        el.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
      // Intentionally stable: handlers read latest props/state via refs so we
      // attach listeners ONCE per mount. Re-attaching on every pull update
      // dropped touchmove events and broke mobile pull-to-refresh.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveThreshold, maxPull]);

    const progress = Math.min(1, pullDistance / effectiveThreshold);
    const showIndicator = pullDistance > 0 || refreshing;

    return (
      <main
        ref={scrollRef as any}
        className={cn("relative", className)}
      >
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex justify-center"
          style={{
            transform: `translateY(${refreshing ? 12 : Math.max(-40, pullDistance - 40)}px)`,
            opacity: showIndicator ? 1 : 0,
            transition: refreshing || pullDistance === 0 ? "transform 0.25s ease, opacity 0.25s ease" : "none",
          }}
        >
          <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card shadow-card-soft">
            <RefreshCw
              className={cn(
                "h-4 w-4 text-primary",
                refreshing && "animate-spin"
              )}
              style={{
                transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
                transition: refreshing ? undefined : "transform 0.05s linear",
              }}
            />
          </div>
        </div>

        <div
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: pulling.current ? "none" : "transform 0.25s ease",
          }}
        >
          {children}
        </div>
      </main>
    );
  }
);

PullToRefresh.displayName = "PullToRefresh";

export default PullToRefresh;
