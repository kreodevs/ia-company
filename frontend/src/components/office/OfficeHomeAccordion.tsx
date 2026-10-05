import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";

const MOBILE_MQ = "(max-width: 767px)";
const STORAGE_PREFIX = "ac.office-home-section-";

function defaultOpenForViewport(sectionId: string): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_PREFIX + sectionId);
  if (stored !== null) return stored === "1";
  return !window.matchMedia(MOBILE_MQ).matches;
}

export interface OfficeHomeAccordionProps {
  sectionId: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Home sections below the chat — collapsed on small screens by default, open on desktop.
 */
export default function OfficeHomeAccordion({
  sectionId,
  title,
  description,
  children,
  className,
}: OfficeHomeAccordionProps) {
  const panelId = useId();
  const [open, setOpen] = useState(() => defaultOpenForViewport(sectionId));

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === `#office-home-${sectionId}`) {
      setOpen(true);
    }
  }, [sectionId]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => {
      if (localStorage.getItem(STORAGE_PREFIX + sectionId) !== null) return;
      setOpen(!mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [sectionId]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_PREFIX + sectionId, next ? "1" : "0");
      return next;
    });
  };

  return (
    <section
      id={`office-home-${sectionId}`}
      className={cn("office-home-accordion", open && "office-home-accordion--open", className)}
    >
      <button
        type="button"
        className="office-home-accordion-trigger interactive"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="office-home-accordion-heading">
          <span className="office-home-section-title">{title}</span>
          {description ? (
            <span className="office-home-section-desc office-home-accordion-desc">{description}</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("office-home-accordion-chevron", !open && "-rotate-90")}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="office-home-accordion-panel">
          {children}
        </div>
      ) : null}
    </section>
  );
}
