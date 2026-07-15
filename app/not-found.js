import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="hero-navy" style={{ minHeight: "70vh" }}>
      <div className="max-w-content mx-auto px-5 md:px-8 py-32 text-center">
        <div className="font-mono text-sm" style={{ color: "#B8863F", letterSpacing: "0.2em" }}>404</div>
        <h1 className="font-display text-white mt-4" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
          We couldn't find that page.
        </h1>
        <p className="mt-4" style={{ color: "#AEBAD0" }}>The page may have moved. Head back and start from the top.</p>
        <Link href="/" className="inline-block mt-7 rounded-xl px-5 py-3 text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
