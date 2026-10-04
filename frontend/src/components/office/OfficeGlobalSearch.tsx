import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Briefcase, FileText, Gavel, Layers, Target, User, ArrowLeftRight } from "lucide-react";
import { Dialog } from "@/components/molecules/Dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/molecules/Command";
import { searchOffice, type OfficeSearchResult, type OfficeSearchResultType } from "../../lib/api";

const TYPE_LABEL: Record<OfficeSearchResultType, string> = {
  encargo: "Encargos",
  objective: "Objetivos",
  initiative: "Iniciativas",
  department: "Departamentos",
  decision: "Decisiones",
  handoff: "Handoffs",
  agent: "Agentes",
  document: "Documentos",
};

function iconFor(type: OfficeSearchResultType) {
  switch (type) {
    case "encargo":
      return Briefcase;
    case "objective":
      return Target;
    case "initiative":
      return Layers;
    case "department":
      return Building2;
    case "decision":
      return Gavel;
    case "handoff":
      return ArrowLeftRight;
    case "agent":
      return User;
    case "document":
      return FileText;
  }
}

/**
 * Fase J — búsqueda global ⌘K (Kreo Command).
 */
export function OfficeGlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OfficeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      setLoading(true);
      searchOffice(q)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(t);
  }, [query]);

  const onSelect = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate],
  );

  const grouped = results.reduce<Record<OfficeSearchResultType, OfficeSearchResult[]>>(
    (acc, row) => {
      acc[row.type].push(row);
      return acc;
    },
    {
      encargo: [],
      objective: [],
      initiative: [],
      department: [],
      decision: [],
      handoff: [],
      agent: [],
      document: [],
    },
  );

  return (
    <Dialog
      visible={open}
      onHide={() => setOpen(false)}
      title="Buscar en la oficina"
      description="Encargos, objetivos, iniciativas y departamentos"
      size="lg"
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Buscar…" value={query} onValueChange={setQuery} />
        <CommandList>
        {query.trim().length < 2 ? (
          <CommandEmpty>Escribe al menos 2 caracteres.</CommandEmpty>
        ) : loading ? (
          <CommandEmpty>Buscando…</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>Sin resultados.</CommandEmpty>
        ) : (
          (Object.keys(grouped) as OfficeSearchResultType[]).map((type) => {
            const items = grouped[type];
            if (!items.length) return null;
            const Icon = iconFor(type);
            return (
              <CommandGroup key={type} heading={TYPE_LABEL[type]}>
                {items.map((item) => (
                  <CommandItem key={`${type}-${item.id}`} value={`${item.title} ${item.id}`} onSelect={() => onSelect(item.href)}>
                    <Icon className="text-[var(--foreground-muted)]" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {item.subtitle ? (
                      <span className="truncate text-xs text-[var(--foreground-muted)]">{item.subtitle}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })
        )}
        </CommandList>
        <div className="border-t px-3 py-2 text-xs text-[var(--foreground-muted)]">
          <CommandShortcut>⌘K</CommandShortcut> para abrir
        </div>
      </Command>
    </Dialog>
  );
}
