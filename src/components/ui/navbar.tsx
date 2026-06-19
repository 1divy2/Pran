import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/hooks/use-dark-mode";

const globalItems = [
  { to: "/", label: "Library", glyph: "◍" },
  { to: "/search", label: "Search", glyph: "⌕" },
  { to: "/compare", label: "Compare", glyph: "⟷" },
];

const topicItems = [
  { path: "canvas", label: "Canvas", glyph: "▦" },
  { path: "guidelines", label: "Guidelines", glyph: "❘❘❘❘" },
  { path: "conflicts", label: "Conflicts", glyph: "⟷" },
  { path: "safety", label: "Safety", glyph: "⚑" },
  { path: "timeline", label: "Timeline", glyph: "—" },
  { path: "pyramid", label: "Pyramid", glyph: "△" },
  { path: "courtroom", label: "Courtroom", glyph: "§" },
  { path: "graph", label: "Graph", glyph: "✦" },
] as const;

export default function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useDarkMode();

  // Extract topicId from pathname if we are under /topic/...
  const match = pathname.match(/^\/topic\/([^/]+)/);
  const topicId = match ? match[1] : null;

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 top-0 z-40 flex items-center justify-center px-4 py-2",
        "backdrop-blur-xl border-b hairline-strong",
        "shadow-sm",
      )}
      style={{
        background: "color-mix(in oklab, var(--card) 80%, transparent)",
      }}
    >
      {globalItems.map((item) => {
        const isActive = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium mr-2 transition-colors duration-200",
              isActive ? "bg-card text-ink hairline-strong" : "text-ink-2 hover:bg-card/60",
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">
              {item.glyph}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}

      {topicId && (
        <div
          className="flex items-center gap-1 border-l border-rule pl-4"
          role="group"
          aria-label="Topic views"
        >
          <Link
            to="/topic/$topicId"
            params={{ topicId }}
            aria-current={
              pathname === `/topic/${topicId}` || pathname === `/topic/${topicId}/`
                ? "page"
                : undefined
            }
            className={cn(
              "flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              pathname === `/topic/${topicId}` || pathname === `/topic/${topicId}/`
                ? "bg-card text-ink hairline-strong"
                : "text-ink-2 hover:bg-card/60",
            )}
          >
            <span aria-hidden="true" className="text-base leading-none">
              ○
            </span>
            <span>Overview</span>
          </Link>

          {topicItems.map((item) => {
            const fullPath = `/topic/${topicId}/${item.path}`;
            const active = pathname.startsWith(fullPath);
            return (
              <Link
                key={item.path}
                to={`/topic/$topicId/${item.path}`}
                params={{ topicId }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-200",
                  active ? "bg-card text-ink hairline-strong" : "text-ink-2 hover:bg-card/60",
                )}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {item.glyph}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dark mode toggle + Admin — pushed to the right */}
      <div className="ml-auto flex items-center gap-1">
        <Link
          to="/admin/settings"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium transition-colors duration-200",
            pathname.startsWith("/admin")
              ? "bg-card text-ink hairline-strong"
              : "text-ink-3 hover:bg-card/60",
          )}
        >
          <span aria-hidden="true" className="text-base leading-none">
            ⚙
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] hidden sm:inline">
            Admin
          </span>
        </Link>
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-sm font-medium text-ink-3 hover:bg-card/60 transition-colors duration-200"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] hidden sm:inline">
            {theme === "dark" ? "Light" : "Dark"}
          </span>
        </button>
      </div>
    </nav>
  );
}
