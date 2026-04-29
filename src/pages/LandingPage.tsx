import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ArrowRight, Boxes, LineChart, Users, Wallet, ShieldCheck, Smartphone } from "lucide-react";
import icon from "@/assets/malimali-icon.png";
import hero from "@/assets/landing-hero.jpg";

const PUBLISHED_URL = "https://malimali.lovable.app";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !(window as unknown as { MSStream?: unknown }).MSStream;

const LandingPage = () => {
  const [installEvent, setInstallEvent] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BIPEvent);
    };
    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    // SEO basics
    document.title = "Install Malimali — Scrap Firm Manager";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(
      "description",
      "Install Malimali — manage your scrap firm finance, inventory, workers, and data entry from any device."
    );
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      return;
    }
    if (isIOS()) {
      setShowIOSHint(true);
      return;
    }
    // Fallback: take user to the app where their browser may surface install
    window.location.href = PUBLISHED_URL;
  };

  const features = [
    { icon: Boxes, title: "Inventory", desc: "Track scrap stock with weighted-average buying prices in real time." },
    { icon: LineChart, title: "Financial Reports", desc: "Gross & net profit, expenses, debts — all on one dashboard." },
    { icon: Users, title: "Workforce", desc: "Attendance, salaries, advances and roles — managed in one place." },
    { icon: Wallet, title: "Debts & Savings", desc: "Customer credits, creditor balances, and savings tracking." },
    { icon: ShieldCheck, title: "Audit Log", desc: "Every sensitive change is logged. Built-in multi-tenant security." },
    { icon: Smartphone, title: "Works Offline-Ready", desc: "Installs to your phone or desktop like a real app." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img src={icon} alt="Malimali logo" width={36} height={36} className="rounded-md ring-1 ring-border" />
            <span className="font-bold text-lg tracking-tight">Malimali</span>
          </div>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            Open app →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${hero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-glow)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" aria-hidden />

        <div className="relative container mx-auto px-4 py-20 md:py-28 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Now installable on phone & desktop
            </div>

            <h1 className="text-4xl xs:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
              Run your scrap firm <br />
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
                like a machine.
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
              Malimali brings finance, inventory, workers, and data entry into one industrial-grade workspace.
              Install it once — and your whole firm runs from your pocket.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={handleInstall}
                disabled={installed}
                className="h-14 px-8 text-base font-semibold shadow-[var(--shadow-amber)]"
              >
                <Download className="mr-1" />
                {installed ? "Installed" : "Download App"}
              </Button>

              <Button
                size="lg"
                variant="outline"
                asChild
                className="h-14 px-8 text-base font-semibold border-border hover:border-primary/50"
              >
                <a href={PUBLISHED_URL} target="_blank" rel="noreferrer">
                  Open in browser
                  <ArrowRight />
                </a>
              </Button>
            </div>

            {showIOSHint && (
              <div className="mt-6 max-w-xl rounded-xl border border-primary/30 bg-card p-4 text-sm text-foreground/90">
                <strong className="text-primary">On iPhone / iPad:</strong> tap the{" "}
                <span className="font-mono">Share</span> button in Safari, then choose{" "}
                <span className="font-mono">Add to Home Screen</span> to install Malimali.
              </div>
            )}

            {!installEvent && !showIOSHint && !installed && (
              <p className="mt-4 text-xs text-muted-foreground">
                Tip: on Android Chrome, tap <span className="font-semibold">Download App</span>. On iPhone, open this
                page in Safari to install.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="container mx-auto px-4 py-20 md:py-28">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built for the workshop floor.</h2>
          <p className="mt-3 text-muted-foreground">
            Every feature is designed for speed, accuracy, and the way scrap firms actually operate.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:-translate-y-0.5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-primary"
                style={{ background: "var(--gradient-amber-soft)" }}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="container mx-auto px-4 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-primary/30 p-10 md:p-16 text-center"
          style={{ background: "var(--gradient-surface)" }}
        >
          <div className="absolute inset-0 opacity-60" style={{ background: "var(--gradient-glow)" }} aria-hidden />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to install Malimali?</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              One tap. No app store. Lives on your home screen and works offline-ready.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleInstall}
                disabled={installed}
                className="h-14 px-8 text-base font-semibold shadow-[var(--shadow-amber)]"
              >
                <Download />
                {installed ? "Installed" : "Download App"}
              </Button>
              <Button size="lg" variant="ghost" asChild className="h-14 px-8 text-base">
                <a href={PUBLISHED_URL} target="_blank" rel="noreferrer">
                  Visit web version
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={icon} alt="" width={20} height={20} className="rounded" />
            <span>© {new Date().getFullYear()} Malimali</span>
          </div>
          <Link to="/" className="hover:text-primary transition-colors">
            Sign in to your account
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
