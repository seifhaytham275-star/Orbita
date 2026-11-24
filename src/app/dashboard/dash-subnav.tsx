"use client";
import { useEffect, useState } from "react";

const items = [
  { id: "overview", label: "نظرة عامة" },
  { id: "operations", label: "العمليات" },
  { id: "astro", label: "Astro والوكلاء" },
  { id: "approvals", label: "الموافقات" }
];

export default function DashSubnav() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const targets = items.map(i => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 }
    );
    targets.forEach(t => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="dash-subnav" aria-label="أقسام لوحة التحكم">
      {items.map(item => (
        <a key={item.id} href={`#${item.id}`} className={active === item.id ? "active" : undefined}>{item.label}</a>
      ))}
    </nav>
  );
}
