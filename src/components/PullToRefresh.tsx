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
  ({ children, className, onRefresh, threshold = 70, maxPull = 120 }, ref) => {
    const innerRef = useRef<HTMLElement>(null);
    const scrollRef = (ref as React.MutableRefObject<HTMLElement>) || innerRef;
    const startY = useRef<number | null>(null);
    const pulling = useRef(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;


      const handleTouchStart = (e: TouchEvent) => {
        if (refreshing) return;
        if (el.scrollTop > 0) {
          startY.current = null;
          return;
        }
        startY.current = e.touches[0].clientY;
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
        // Resistance curve
        const resisted = Math.min(maxPull, delta * 0.5);
        setPullDistance(resisted);
        if (e.cancelable) e.preventDefault();
      };

      const handleTouchEnd = async () => {
        if (!pulling.current) {
          setPullDistance(0);
          startY.current = null;
          return;
        }
        const shouldRefresh = pullDistance >= threshold;
        startY.current = null;
        pulling.current = false;

        if (shouldRefresh) {
          setRefreshing(true);
          setPullDistance(threshold);
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

      el.addEventListener("touchstart", handleTouchStart, { passive: true });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
      el.addEventListener("touchend", handleTouchEnd, { passive: true });
      el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

      return () => {
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
        el.removeEventListener("touchend", handleTouchEnd);
        el.removeEventListener("touchcancel", handleTouchEnd);
      };
    }, [onRefresh, refreshing, threshold, maxPull, pullDistance, scrollRef]);

    const progress = Math.min(1, pullDistance / threshold);
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
