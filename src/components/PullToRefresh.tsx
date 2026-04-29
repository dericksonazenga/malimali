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
const PullToRefresh = forwardRef<HTMLElement, PullToRefreshProps>(
  ({ children, className, onRefresh, threshold, maxPull = 260 }, ref) => {
    const innerRef = useRef<HTMLElement>(null);
    const scrollRef = (ref as React.MutableRefObject<HTMLElement>) || innerRef;
    const startY = useRef<number | null>(null);
    const pulling = useRef(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    // Effective threshold: require swipe from top to ~bottom of viewport
    const effectiveThreshold = threshold ?? Math.max(220, Math.round(window.innerHeight * 0.6));
    // Only initiate pull-to-refresh when the touch begins very close to the top edge of the screen
    const TOP_EDGE_ZONE = 60;

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;


      const handleTouchStart = (e: TouchEvent) => {
        if (refreshing) return;
        if (el.scrollTop > 0) {
          startY.current = null;
          return;
        }
        const touch = e.touches[0];
        // Only start tracking if the finger is touching near the top of the screen
        if (touch.clientY > TOP_EDGE_ZONE) {
          startY.current = null;
          return;
        }
        // Ignore touches that begin inside an inner scrollable element (so users can
        // freely scroll within tickets/cards/dialogs without triggering refresh)
        const target = e.target as HTMLElement | null;
        if (target && isInsideInnerScroller(target, el)) {
          startY.current = null;
          return;
        }
        startY.current = touch.clientY;
        pulling.current = false;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (refreshing || startY.current === null) return;
        const delta = e.touches[0].clientY - startY.current;
        if (delta <= 0) {
          setPullDistance(0);
          pulling.current = false;
          return;
        }
        if (el.scrollTop > 0) {
          setPullDistance(0);
          pulling.current = false;
          startY.current = null;
          return;
        }
        pulling.current = true;
        // Stronger resistance so the user has to pull a long way
        const resisted = Math.min(maxPull, delta * 0.35);
        setPullDistance(resisted);
        if (e.cancelable) e.preventDefault();
      };

      const handleTouchEnd = async () => {
        if (!pulling.current) {
          setPullDistance(0);
          startY.current = null;
          return;
        }
        const shouldRefresh = pullDistance >= effectiveThreshold;
        startY.current = null;
        pulling.current = false;

        if (shouldRefresh) {
          setRefreshing(true);
          setPullDistance(effectiveThreshold);
          try {
            if (onRefresh) {
              await onRefresh();
            } else {
              // Default: reload current view
              window.location.reload();
              return;
            }
          } finally {
            setRefreshing(false);
            setPullDistance(0);
          }
        } else {
          setPullDistance(0);
        }
      };

      // Mouse drag (desktop browsers)
      const handleMouseDown = (e: MouseEvent) => {
        if (refreshing || el.scrollTop > 0) return;
        if (e.clientY > TOP_EDGE_ZONE) return;
        const target = e.target as HTMLElement | null;
        if (target && isInsideInnerScroller(target, el)) return;
        startY.current = e.clientY;
        pulling.current = false;
      };
      const handleMouseMove = (e: MouseEvent) => {
        if (refreshing || startY.current === null) return;
        if ((e.buttons & 1) === 0) {
          startY.current = null;
          setPullDistance(0);
          return;
        }
        const delta = e.clientY - startY.current;
        if (delta <= 0 || el.scrollTop > 0) {
          setPullDistance(0);
          pulling.current = false;
          return;
        }
        pulling.current = true;
        setPullDistance(Math.min(maxPull, delta * 0.35));
      };
      const handleMouseUp = () => { handleTouchEnd(); };

      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", handleTouchEnd, { passive: true });
      el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
      el.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      return () => {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", handleTouchEnd);
        el.removeEventListener("touchcancel", handleTouchEnd);
        el.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [onRefresh, refreshing, effectiveThreshold, maxPull, pullDistance, scrollRef]);

    const progress = Math.min(1, pullDistance / effectiveThreshold);
    const showIndicator = pullDistance > 0 || refreshing;

    return (
      <main
        ref={scrollRef as any}
        className={cn("relative", className)}
      >
        {/* Pull indicator */}
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
