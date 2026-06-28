import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Upload,
  Download,
  Trash2,
  Check,
  XCircle,
  ChevronRight,
  CheckCircle2,
  Mail,
  Clock,
  UserPlus,
  Pencil,
  Save,
} from "lucide-react";
import {
  playerInvitationsApi,
  type Player,
  type PlayerInvitation,
  type CreateInvitationData,
  type CreatePlayerData,
  type Division,
  type PlayerImportRow,
  type PlayerUpdateFields,
} from "@/integrations/api/endpoints/playerInvitations";
import { matchesDivisionFilter, SUBDIVISION_FILTER_PREFIX, formatDivision } from "@/lib/dixieDivisions";
import { normalizeLocation, flagSrc } from "@/lib/locations";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIVISION_LABELS: Record<string, string> = {
  mens: "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

type TabValue = "requested" | "invited" | "registered";

// CSV import field mapping options
const FIELD_OPTIONS = [
  { value: "__skip__", label: "— Skip this column —" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "division", label: "Division" },
  { value: "club", label: "Club" },
  { value: "handicap_index", label: "Handicap Index" },
  { value: "birth_year", label: "Birth Year" },
  { value: "birth_month", label: "Birth Month" },
  { value: "birth_day", label: "Birth Day" },
  { value: "shirt_size", label: "Shirt Size" },
  { value: "wagr", label: "WAGR Ranking" },
  { value: "street_address", label: "Street Address" },
  { value: "city", label: "City" },
  { value: "state", label: "State / Province" },
  { value: "country", label: "Country" },
  { value: "zip", label: "ZIP / Postal" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// Self-hosted country flag (3x2 SVG under /public/flags). Renders nothing when
// the country is unknown so rows simply show no flag.
function Flag({ code, name, size = 20 }: { code: string | null; name?: string | null; size?: number }) {
  const src = flagSrc(code);
  if (!src) return null;
  return (
    <img
      src={src}
      alt={name ?? ""}
      title={name ?? undefined}
      width={size}
      height={Math.round((size * 2) / 3)}
      loading="lazy"
      style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,.12)", objectFit: "cover", flex: "0 0 auto" }}
    />
  );
}

// Flag + normalized location string for a player table row.
function LocationCell({ p }: { p: Player }) {
  const n = normalizeLocation(p.city, p.state, p.country);
  if (!n.location && !n.countryCode) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Flag code={n.countryCode} name={n.country} />
      <span>{n.location || "—"}</span>
    </span>
  );
}

// Normalized "Location" row (flag + composed string) for the player drawer.
function LocationSummaryField({ player }: { player: Player }) {
  const n = normalizeLocation(player.city, player.state, player.country);
  if (!n.location && !n.countryCode) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Location</span>
      <span className="text-sm font-medium inline-flex items-center gap-2">
        <Flag code={n.countryCode} name={n.country} />
        {n.location || "—"}
      </span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

// Labelled input used inside the player edit form. Mirrors DetailField's
// label styling so switching between view/edit feels seamless.
function EditField({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/30 last:border-0">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input
        className="h-8 text-sm"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...(type === "number" ? { step: label === "Handicap Index" ? "0.1" : "1" } : {})}
      />
    </div>
  );
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Simple CSV parser (handles quoted fields)
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        result.push(current); current = "";
      } else current += c;
    }
    result.push(current);
    return result.map((s) => s.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
  return { headers, rows };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlayersHubPage() {
  const queryClient = useQueryClient();

  // Tab + search state
  const [activeTab, setActiveTab] = useState<TabValue>("requested");
  const [search, setSearch] = useState("");
  // Division tab values: "all" | "mens" | "womens" | "sub:mid-master" | "sub:senior" | "sub:super-senior"
  const [divisionTab, setDivisionTab] = useState<string>("all");
  // Tournament year filter — defaults to current calendar year. "all" shows every year.
  const [selectedYear, setSelectedYear] = useState<number | "all">(
    new Date().getFullYear()
  );
  // Sort field — applied after search/division/year filters
  type SortValue = "name_asc" | "name_desc" | "date_desc" | "date_asc" | "division" | "club_asc";
  const [sortBy, setSortBy] = useState<SortValue>("name_asc");

  // Detail drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    | { kind: "invitation"; data: PlayerInvitation }
    | { kind: "player"; data: Player }
    | null
  >(null);

  // Dialog state
  const [newInviteOpen, setNewInviteOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // New invitation form
  const [newInvite, setNewInvite] = useState<CreateInvitationData>({
    first_name: "", last_name: "", email: "", division: "mens" as Division,
  });

  // Manual add-player form (goes straight to registered + visible on site)
  const emptyNewPlayer = (): CreatePlayerData => ({
    first_name: "", last_name: "", email: "", division: "mens" as Division,
    birth_year: undefined as unknown as number,
    birth_month: undefined as unknown as number,
    birth_day: undefined as unknown as number,
    phone: "", club: "", handicap_index: undefined,
    city: "", state: "", country: "",
  });
  const [newPlayer, setNewPlayer] = useState<CreatePlayerData>(emptyNewPlayer());

  // CSV import state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ["player-invitations"],
    queryFn: () => playerInvitationsApi.listInvitations(),
  });
  const { data: playersData, isLoading: playersLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => playerInvitationsApi.listPlayers(),
  });

  // The invitations list endpoint returns a slim payload (no phone, address,
  // club, handicap, etc.). Refetch the full record when an invitation is
  // opened in the drawer so every field the player submitted is visible.
  const selectedInvitationId =
    selectedItem?.kind === "invitation" ? selectedItem.data.id : null;
  const { data: invitationDetail } = useQuery({
    queryKey: ["player-invitation", selectedInvitationId],
    queryFn: () => playerInvitationsApi.getInvitation(selectedInvitationId!),
    enabled: !!selectedInvitationId && drawerOpen,
  });

  // For players (Invited / Registered tabs), the players table doesn't have
  // wagr_url / golf_resume / resume_file_url / agree_policy. Those live on
  // the source invitation (when source === "invitation"). Fetch that record
  // so the player drawer can display those extra fields too.
  const selectedPlayerInvitationId =
    selectedItem?.kind === "player" ? selectedItem.data.invitation_id : null;
  const { data: playerSourceInvitation } = useQuery({
    queryKey: ["player-source-invitation", selectedPlayerInvitationId],
    queryFn: () => playerInvitationsApi.getInvitation(selectedPlayerInvitationId!),
    enabled: !!selectedPlayerInvitationId && drawerOpen,
  });

  const invitations: PlayerInvitation[] = invData?.invitations ?? [];
  const players: Player[] = playersData?.players ?? [];

  // ─── Mutations ───────────────────────────────────────────────────────────
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["player-invitations"] });
    queryClient.invalidateQueries({ queryKey: ["players"] });
  };

  const acceptMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.acceptInvitation(id),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(
        `Invitation accepted. Access code: ${res.access_code}` +
        (res.email_sent ? " — Email sent." : " — Email send failed.")
      );
      closeDrawer();
    },
    onError: (e: Error) => toast.error(`Accept failed: ${e.message}`),
  });

  const declineMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.declineInvitation(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Invitation declined.");
      closeDrawer();
    },
    onError: (e: Error) => toast.error(`Decline failed: ${e.message}`),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateInvitationData) => playerInvitationsApi.createInvitation(d),
    onSuccess: () => {
      invalidateAll();
      toast.success("Invitation created.");
      setNewInviteOpen(false);
      setNewInvite({ first_name: "", last_name: "", email: "", division: "mens" as Division });
    },
    onError: (e: Error) => toast.error(`Create failed: ${e.message}`),
  });

  const addPlayerMutation = useMutation({
    mutationFn: (d: CreatePlayerData) => playerInvitationsApi.createPlayer(d),
    onSuccess: () => {
      invalidateAll();
      toast.success("Player added — now visible on dixieamateur.com.");
      setAddPlayerOpen(false);
      setNewPlayer(emptyNewPlayer());
    },
    onError: (e: Error) => toast.error(`Add player failed: ${e.message}`),
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.deleteInvitation(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Invitation deleted.");
      setDeleteConfirmOpen(false);
      closeDrawer();
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.deletePlayer(id),
    onSuccess: () => {
      invalidateAll();
      toast.success("Player removed.");
      setDeleteConfirmOpen(false);
      closeDrawer();
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PlayerUpdateFields }) =>
      playerInvitationsApi.updatePlayer(id, updates),
    onSuccess: (updated) => {
      invalidateAll();
      // Keep the open drawer in sync with the saved record so it shows the
      // new values immediately (and the next edit starts from fresh data).
      setSelectedItem({ kind: "player", data: updated });
      toast.success(
        updated.registration_status === "registered" && updated.show_on_site
          ? "Player updated — changes are now live on dixieamateur.com."
          : "Player updated."
      );
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const importMutation = useMutation({
    mutationFn: (rows: PlayerImportRow[]) => playerInvitationsApi.importPlayers(rows),
    onSuccess: (res) => {
      invalidateAll();
      toast.success(`${res.imported} player(s) imported.`);
      resetCsv();
    },
    onError: (e: Error) => toast.error(`Import failed: ${e.message}`),
  });

  // ─── Derived data ─────────────────────────────────────────────────────────

  // Year dropdown options come from every loaded record. Always include the
  // current calendar year so the dropdown isn't empty on a fresh tournament.
  // Missing/null tournament_year is treated as the current year (defensive —
  // covers any legacy rows that pre-date the migration or any API endpoint
  // that forgets to return the field).
  const currentYear = new Date().getFullYear();
  const yearOf = (x: { tournament_year?: number | null }): number =>
    x.tournament_year ?? currentYear;

  const availableYears = useMemo(() => {
    const set = new Set<number>([currentYear]);
    invitations.forEach((i) => set.add(yearOf(i)));
    players.forEach((p) => set.add(yearOf(p)));
    return Array.from(set).sort((a, b) => b - a);
  }, [invitations, players, currentYear]);

  // Apply the year filter BEFORE deriving lifecycle buckets so the tab badges
  // and division sub-tab counts reflect the selected year.
  const yearFilteredInvitations = useMemo(
    () => selectedYear === "all"
      ? invitations
      : invitations.filter((i) => yearOf(i) === selectedYear),
    [invitations, selectedYear, currentYear]
  );
  const yearFilteredPlayers = useMemo(
    () => selectedYear === "all"
      ? players
      : players.filter((p) => yearOf(p) === selectedYear),
    [players, selectedYear, currentYear]
  );

  const requested = useMemo(
    () => yearFilteredInvitations.filter((i) => i.status === "pending"),
    [yearFilteredInvitations]
  );
  const invited = useMemo(
    () => yearFilteredPlayers.filter((p) => p.registration_status === "invited"),
    [yearFilteredPlayers]
  );
  const registered = useMemo(
    () => yearFilteredPlayers.filter((p) => p.registration_status === "registered"),
    [yearFilteredPlayers]
  );

  type WithDob = {
    first_name: string;
    last_name: string;
    email?: string | null;
    club?: string | null;
    division?: string | null;
    birth_year?: number | null;
    birth_month?: number | null;
    birth_day?: number | null;
  };

  function bySearch<T extends WithDob>(items: T[]): T[] {
    if (!search.trim()) return items;
    const s = search.trim().toLowerCase();
    return items.filter(
      (p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
        (p.email ?? "").toLowerCase().includes(s) ||
        (p.club ?? "").toLowerCase().includes(s)
    );
  }

  function byDivisionTab<T extends WithDob>(items: T[], divValue: string): T[] {
    return items.filter((p) =>
      matchesDivisionFilter(divValue, p.division, p.birth_year, p.birth_month, p.birth_day)
    );
  }

  function sortItems<T extends WithDob & { created_at: string }>(items: T[]): T[] {
    const sorted = [...items];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
        case "name_desc":
          return `${b.last_name} ${b.first_name}`.localeCompare(`${a.last_name} ${a.first_name}`);
        case "date_desc":
          return b.created_at.localeCompare(a.created_at);
        case "date_asc":
          return a.created_at.localeCompare(b.created_at);
        case "division":
          return (a.division ?? "").localeCompare(b.division ?? "");
        case "club_asc":
          return (a.club ?? "").localeCompare(b.club ?? "");
        default:
          return 0;
      }
    });
    return sorted;
  }

  function applyFilters<T extends WithDob & { created_at: string }>(items: T[]): T[] {
    return sortItems(bySearch(byDivisionTab(items, divisionTab)));
  }

  // Per-division counts for sub-tab badges (search-aware so badges match what's visible)
  function countByDivision<T extends WithDob>(items: T[], divValue: string): number {
    return bySearch(byDivisionTab(items, divValue)).length;
  }

  const filteredRequested = useMemo(() => applyFilters(requested), [requested, search, divisionTab, sortBy]);
  const filteredInvited = useMemo(() => applyFilters(invited), [invited, search, divisionTab, sortBy]);
  const filteredRegistered = useMemo(() => applyFilters(registered), [registered, search, divisionTab, sortBy]);

  // Current main tab's full data (before division filter) — used for sub-tab counts.
  // Typed as WithDob[] (the common shape) since the helpers only read those fields.
  const currentTabAll: WithDob[] =
    activeTab === "requested" ? requested :
    activeTab === "invited"   ? invited   :
                                registered;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  function openInvitation(inv: PlayerInvitation) {
    setSelectedItem({ kind: "invitation", data: inv });
    setDrawerOpen(true);
  }

  function openPlayer(p: Player) {
    setSelectedItem({ kind: "player", data: p });
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setTimeout(() => setSelectedItem(null), 200);
  }

  function handleSubmitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!newInvite.first_name.trim() || !newInvite.last_name.trim() || !newInvite.email.trim()) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    if (!newInvite.birth_year || !newInvite.birth_month || !newInvite.birth_day) {
      toast.error("Date of birth is required.");
      return;
    }
    createMutation.mutate(newInvite);
  }

  function handleSubmitAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlayer.first_name.trim() || !newPlayer.last_name.trim() || !newPlayer.email.trim()) {
      toast.error("First name, last name, and email are required.");
      return;
    }
    if (!newPlayer.birth_year || !newPlayer.birth_month || !newPlayer.birth_day) {
      toast.error("Date of birth is required.");
      return;
    }
    // Strip empty optional strings so they go to the API as undefined rather
    // than blank strings — keeps DB rows clean.
    const cleaned: CreatePlayerData = { ...newPlayer };
    (["phone", "club", "shirt_size", "wagr", "street_address", "city", "state", "country", "zip"] as const)
      .forEach((k) => { if (cleaned[k] === "") cleaned[k] = undefined; });
    addPlayerMutation.mutate(cleaned);
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) ?? "";
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        toast.error("CSV is empty or invalid.");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-guess field mapping by header name
      const guesses: Record<string, string> = {};
      headers.forEach((h) => {
        const normalized = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        const match = FIELD_OPTIONS.find((opt) =>
          opt.value !== "__skip__" &&
          opt.label.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized
        );
        guesses[h] = match ? match.value : "__skip__";
      });
      setFieldMapping(guesses);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetCsv() {
    setCsvImportOpen(false);
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
  }

  function submitCsvImport() {
    const mapped = Object.entries(fieldMapping).filter(([, v]) => v !== "__skip__");
    if (mapped.length === 0) {
      toast.error("Map at least one column.");
      return;
    }
    const requiredFields = ["first_name", "last_name", "birth_year", "birth_month", "birth_day"];
    const mappedFieldValues = mapped.map(([, v]) => v);
    const missing = requiredFields.filter((f) => !mappedFieldValues.includes(f));
    if (missing.length > 0) {
      toast.error(`Map required columns: ${missing.join(", ")}`);
      return;
    }

    const importRows: PlayerImportRow[] = csvRows
      .map((row) => {
        const out: Record<string, unknown> = {};
        for (const [csvCol, field] of mapped) {
          const val = row[csvCol];
          if (val === undefined || val === "") continue;
          if (["handicap_index", "birth_year", "birth_month", "birth_day"].includes(field)) {
            const n = parseFloat(val);
            if (!isNaN(n)) out[field] = n;
          } else {
            out[field] = val;
          }
        }
        return out as unknown as PlayerImportRow;
      })
      .filter((r) => r.first_name && r.last_name && r.birth_year && r.birth_month && r.birth_day);

    if (importRows.length === 0) {
      toast.error("No valid rows to import — every row needs first name, last name, and date of birth.");
      return;
    }
    if (importRows.length !== csvRows.length) {
      toast.error(`${csvRows.length - importRows.length} row(s) skipped — missing required fields (name + DOB).`);
    }
    importMutation.mutate(importRows);
  }

  function exportCurrentTab() {
    if (activeTab === "requested") {
      const rows = filteredRequested.map((i) => [
        i.first_name, i.last_name, i.email, i.phone ?? "",
        DIVISION_LABELS[i.division] ?? i.division, i.status, formatDate(i.created_at),
      ]);
      downloadCsv(
        `dixie-requested-${new Date().toISOString().slice(0, 10)}.csv`,
        ["First Name", "Last Name", "Email", "Phone", "Division", "Status", "Date"],
        rows
      );
    } else {
      const list = activeTab === "invited" ? filteredInvited : filteredRegistered;
      const rows = list.map((p) => [
        p.first_name, p.last_name, p.email ?? "", p.phone ?? "",
        p.division ? DIVISION_LABELS[p.division] ?? p.division : "",
        p.club ?? "",
        p.handicap_index != null ? String(p.handicap_index) : "",
        p.access_code ?? "",
        formatDate(p.created_at),
      ]);
      downloadCsv(
        `dixie-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`,
        ["First Name", "Last Name", "Email", "Phone", "Division", "Club", "Handicap", "Access Code", "Date"],
        rows
      );
    }
  }

  const currentCount =
    activeTab === "requested" ? filteredRequested.length :
    activeTab === "invited"   ? filteredInvited.length :
                                filteredRegistered.length;
  const totalForDivision = byDivisionTab(currentTabAll, divisionTab).length;
  const isLoading = invLoading || playersLoading;
  const hasActiveSearch = !!search.trim();

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="-m-8 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b shrink-0 bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Players</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage tournament registrations across every stage of the player lifecycle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(v === "all" ? "all" : parseInt(v, 10))}
            >
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year === new Date().getFullYear() ? `Current (${year})` : String(year)}
                  </SelectItem>
                ))}
                <SelectItem value="all">All Years</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCsvImportOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddPlayerOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Add Player
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setNewInviteOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Invitation
            </Button>
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="requested" className="gap-2">
              <Clock className="h-3.5 w-3.5" />
              Requested
              <span className="ml-1 text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">{requested.length}</span>
            </TabsTrigger>
            <TabsTrigger value="invited" className="gap-2">
              <Mail className="h-3.5 w-3.5" />
              Invited
              <span className="ml-1 text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">{invited.length}</span>
            </TabsTrigger>
            <TabsTrigger value="registered" className="gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Registered
              <span className="ml-1 text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">{registered.length}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Division sub-tabs ─────────────────────────────────────────── */}
      <div className="px-6 pt-3 pb-2 border-b shrink-0 bg-background">
        <Tabs value={divisionTab} onValueChange={setDivisionTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
              All
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, "all")}
              </span>
            </TabsTrigger>
            <TabsTrigger value="mens" className="gap-1.5 text-xs sm:text-sm">
              Men's
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, "mens")}
              </span>
            </TabsTrigger>
            <TabsTrigger value="womens" className="gap-1.5 text-xs sm:text-sm">
              Women's
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, "womens")}
              </span>
            </TabsTrigger>
            <TabsTrigger value={`${SUBDIVISION_FILTER_PREFIX}mid-master`} className="gap-1.5 text-xs sm:text-sm">
              <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
                <span>Mid-Master</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">40–54</span>
              </span>
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, `${SUBDIVISION_FILTER_PREFIX}mid-master`)}
              </span>
            </TabsTrigger>
            <TabsTrigger value={`${SUBDIVISION_FILTER_PREFIX}senior`} className="gap-1.5 text-xs sm:text-sm">
              <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
                <span>Senior</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">55–64</span>
              </span>
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, `${SUBDIVISION_FILTER_PREFIX}senior`)}
              </span>
            </TabsTrigger>
            <TabsTrigger value={`${SUBDIVISION_FILTER_PREFIX}super-senior`} className="gap-1.5 text-xs sm:text-sm">
              <span className="flex flex-col items-center leading-tight sm:flex-row sm:gap-1.5">
                <span>Super Senior</span>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">65+</span>
              </span>
              <span className="text-xs bg-muted-foreground/15 px-1.5 py-0.5 rounded">
                {countByDivision(currentTabAll, `${SUBDIVISION_FILTER_PREFIX}super-senior`)}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Search + actions row ─────────────────────────────────────── */}
      <div className="px-6 py-3 border-b shrink-0 flex items-center gap-2 bg-background">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or club…"
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {hasActiveSearch && (
          <Button size="sm" variant="ghost" onClick={() => setSearch("")}>
            Clear
          </Button>
        )}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
          <SelectTrigger className="h-9 w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Name (A→Z)</SelectItem>
            <SelectItem value="name_desc">Name (Z→A)</SelectItem>
            <SelectItem value="date_desc">Date Added (Newest)</SelectItem>
            <SelectItem value="date_asc">Date Added (Oldest)</SelectItem>
            <SelectItem value="division">Division</SelectItem>
            <SelectItem value="club_asc">Club (A→Z)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${currentCount}${currentCount !== totalForDivision ? ` of ${totalForDivision}` : ""}`}
        </span>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCurrentTab} disabled={currentCount === 0}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* ── Table body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : currentCount === 0 ? (
          <EmptyState tab={activeTab} hasActiveFilters={hasActiveSearch} />
        ) : activeTab === "requested" ? (
          <RequestedTable
            items={filteredRequested}
            onSelect={openInvitation}
          />
        ) : activeTab === "invited" ? (
          <PlayerTable items={filteredInvited} onSelect={openPlayer} showAccessCode />
        ) : (
          <PlayerTable items={filteredRegistered} onSelect={openPlayer} showAccessCode />
        )}
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={(v) => { if (!v) closeDrawer(); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0">
          {selectedItem?.kind === "invitation" && (
            <InvitationDetailView
              // Prefer the full record from /invitations/{id}; fall back to the
              // slim list row while the detail fetch is in flight so the drawer
              // never flashes empty.
              invitation={invitationDetail ?? selectedItem.data}
              onAccept={() => acceptMutation.mutate(selectedItem.data.id)}
              onDecline={() => declineMutation.mutate(selectedItem.data.id)}
              onDelete={() => setDeleteConfirmOpen(true)}
              isActing={acceptMutation.isPending || declineMutation.isPending}
            />
          )}
          {selectedItem?.kind === "player" && (
            <PlayerDetailView
              key={selectedItem.data.id}
              player={selectedItem.data}
              sourceInvitation={playerSourceInvitation ?? null}
              onDelete={() => setDeleteConfirmOpen(true)}
              onSave={(updates) =>
                updatePlayerMutation.mutate({ id: selectedItem.data.id, updates })
              }
              isSaving={updatePlayerMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ── New Invitation Dialog ───────────────────────────────────── */}
      <Dialog open={newInviteOpen} onOpenChange={setNewInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Player Invitation</DialogTitle>
            <DialogDescription>
              Manually create an invitation. Once accepted, the player receives an access code and registration email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fn">First Name *</Label>
                <Input id="fn" value={newInvite.first_name} onChange={(e) => setNewInvite({ ...newInvite, first_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ln">Last Name *</Label>
                <Input id="ln" value={newInvite.last_name} onChange={(e) => setNewInvite({ ...newInvite, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="em">Email *</Label>
              <Input id="em" type="email" value={newInvite.email} onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })} />
            </div>
            <div>
              <Label>Division *</Label>
              <Select value={newInvite.division} onValueChange={(v) => setNewInvite({ ...newInvite, division: v as Division })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mens">Men's</SelectItem>
                  <SelectItem value="womens">Women's</SelectItem>
                  <SelectItem value="senior">Senior/Mid-Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Month"
                  min={1} max={12}
                  value={newInvite.birth_month ?? ""}
                  onChange={(e) => setNewInvite({ ...newInvite, birth_month: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
                <Input
                  type="number"
                  placeholder="Day"
                  min={1} max={31}
                  value={newInvite.birth_day ?? ""}
                  onChange={(e) => setNewInvite({ ...newInvite, birth_day: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
                <Input
                  type="number"
                  placeholder="Year"
                  min={1900} max={2026}
                  value={newInvite.birth_year ?? ""}
                  onChange={(e) => setNewInvite({ ...newInvite, birth_year: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Required — used to bucket senior players into Mid-Master / Senior / Super Senior.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Player Dialog ───────────────────────────────────────── */}
      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Player Manually</DialogTitle>
            <DialogDescription>
              Skips the invitation + PayPal flow. The player is added directly
              to your roster as <strong>registered</strong> and will appear on{" "}
              <strong>dixieamateur.com</strong> immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAddPlayer} className="space-y-4">
            {/* Personal */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personal</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ap-fn">First Name *</Label>
                  <Input id="ap-fn" value={newPlayer.first_name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, first_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ap-ln">Last Name *</Label>
                  <Input id="ap-ln" value={newPlayer.last_name}
                    onChange={(e) => setNewPlayer({ ...newPlayer, last_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ap-em">Email *</Label>
                  <Input id="ap-em" type="email" value={newPlayer.email}
                    onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ap-ph">Phone</Label>
                  <Input id="ap-ph" value={newPlayer.phone ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Division *</Label>
                <Select value={newPlayer.division}
                  onValueChange={(v) => setNewPlayer({ ...newPlayer, division: v as Division })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mens">Men's</SelectItem>
                    <SelectItem value="womens">Women's</SelectItem>
                    <SelectItem value="senior">Senior / Mid-Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date of Birth *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" placeholder="Month" min={1} max={12}
                    value={newPlayer.birth_month ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, birth_month: e.target.value ? parseInt(e.target.value, 10) : undefined as unknown as number })} />
                  <Input type="number" placeholder="Day" min={1} max={31}
                    value={newPlayer.birth_day ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, birth_day: e.target.value ? parseInt(e.target.value, 10) : undefined as unknown as number })} />
                  <Input type="number" placeholder="Year" min={1900} max={2026}
                    value={newPlayer.birth_year ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, birth_year: e.target.value ? parseInt(e.target.value, 10) : undefined as unknown as number })} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Required — used to bucket senior players into Mid-Master / Senior / Super Senior.
                </p>
              </div>
            </div>

            {/* Address — fills in the location shown on dixieamateur.com */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</h4>
              <p className="text-xs text-muted-foreground -mt-1">
                Optional — but the website roster shows "City, State/Country" per player.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="ap-city">City</Label>
                  <Input id="ap-city" value={newPlayer.city ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ap-state">State / Province</Label>
                  <Input id="ap-state" value={newPlayer.state ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, state: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ap-country">Country</Label>
                  <Input id="ap-country" value={newPlayer.country ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, country: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Golf */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Golf Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="ap-club">Primary Club</Label>
                  <Input id="ap-club" value={newPlayer.club ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, club: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="ap-hcp">Handicap Index</Label>
                  <Input id="ap-hcp" type="number" step="0.1"
                    value={newPlayer.handicap_index ?? ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, handicap_index: e.target.value ? parseFloat(e.target.value) : undefined })} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddPlayerOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addPlayerMutation.isPending}>
                {addPlayerMutation.isPending ? "Adding…" : "Add Player"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import Dialog ───────────────────────────────────────── */}
      <Dialog open={csvImportOpen} onOpenChange={(v) => { if (!v) resetCsv(); else setCsvImportOpen(true); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Players from CSV</DialogTitle>
            <DialogDescription>
              {csvRows.length === 0
                ? "Upload a CSV file. We'll auto-map columns based on header names."
                : `Map ${csvHeaders.length} columns from your file. ${csvRows.length} row${csvRows.length !== 1 ? "s" : ""} ready to import.`}
            </DialogDescription>
          </DialogHeader>

          {csvRows.length === 0 ? (
            <div className="py-8">
              <Input type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
              <p className="text-xs text-muted-foreground mt-2">
                Required columns: First Name, Last Name. Optional: Email, Phone, Division, Club, Handicap, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {csvHeaders.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{h}</div>
                    <div className="text-xs text-muted-foreground truncate">e.g. "{csvRows[0]?.[h] ?? ""}"</div>
                  </div>
                  <Select
                    value={fieldMapping[h] ?? "__skip__"}
                    onValueChange={(v) => setFieldMapping({ ...fieldMapping, [h]: v })}
                  >
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetCsv}>Cancel</Button>
            {csvRows.length > 0 && (
              <Button onClick={submitCsvImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing…" : `Import ${csvRows.length} Player${csvRows.length !== 1 ? "s" : ""}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedItem?.kind === "invitation" ? "Invitation" : "Player"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {selectedItem?.kind === "invitation" ? "invitation request" : "player record"} from your roster. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!selectedItem) return;
                if (selectedItem.kind === "invitation") {
                  deleteInvitationMutation.mutate(selectedItem.data.id);
                } else {
                  deletePlayerMutation.mutate(selectedItem.data.id);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ tab, hasActiveFilters }: { tab: TabValue; hasActiveFilters: boolean }) {
  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12">
        <p className="text-sm font-medium text-muted-foreground">No results match your filters.</p>
      </div>
    );
  }
  const copy =
    tab === "requested" ? {
      title: "No pending requests.",
      sub: "Players who request to register from your tournament site will appear here for review.",
    } : tab === "invited" ? {
      title: "No invited players yet.",
      sub: "Once you accept an invitation request, the player gets an access code and shows up here until they complete registration.",
    } : {
      title: "No registered players yet.",
      sub: "Players appear here after they complete registration and PayPal payment is captured.",
    };
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-12">
      <p className="text-sm font-medium text-muted-foreground">{copy.title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-md">{copy.sub}</p>
    </div>
  );
}

function RequestedTable({ items, onSelect }: { items: PlayerInvitation[]; onSelect: (i: PlayerInvitation) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((inv) => (
          <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(inv)}>
            <TableCell className="font-medium">{inv.first_name} {inv.last_name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{inv.email}</TableCell>
            <TableCell className="text-sm">{DIVISION_LABELS[inv.division] ?? inv.division}</TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(inv.created_at)}</TableCell>
            <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PlayerTable({ items, onSelect, showAccessCode }: { items: Player[]; onSelect: (p: Player) => void; showAccessCode?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Division</TableHead>
          <TableHead>Club</TableHead>
          {showAccessCode && <TableHead>Access Code</TableHead>}
          <TableHead>Added</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onSelect(p)}>
            <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
            <TableCell className="text-sm"><LocationCell p={p} /></TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.email ?? "—"}</TableCell>
            <TableCell className="text-sm">{p.division ? DIVISION_LABELS[p.division] ?? p.division : "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{p.club ?? "—"}</TableCell>
            {showAccessCode && (
              <TableCell>
                {p.access_code ? (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.access_code}</span>
                ) : "—"}
              </TableCell>
            )}
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(p.created_at)}</TableCell>
            <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LinkField({ label, href }: { label: string; href?: string | null }) {
  if (!href) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline hover:no-underline break-all"
      >
        {href}
      </a>
    </div>
  );
}

function dobString(by?: number | null, bm?: number | null, bd?: number | null): string | null {
  return by && bm && bd ? `${bm}/${bd}/${by}` : null;
}

function policyValue(agreed?: boolean | null): string | null {
  if (agreed === true) return "Yes — agreed to withdrawal & refund policy";
  if (agreed === false) return "No — did not agree";
  return null;
}

function InvitationDetailView({
  invitation, onAccept, onDecline, onDelete, isActing,
}: {
  invitation: PlayerInvitation;
  onAccept: () => void;
  onDecline: () => void;
  onDelete: () => void;
  isActing: boolean;
}) {
  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <SheetTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          Invitation Request
        </SheetTitle>
      </SheetHeader>
      <div className="px-6 py-5 space-y-6">
        {invitation.status === "pending" && (
          <div className="flex gap-2">
            <Button onClick={onAccept} disabled={isActing} className="flex-1 gap-1.5">
              <Check className="h-4 w-4" />
              Accept & Send Invitation
            </Button>
            <Button onClick={onDecline} disabled={isActing} variant="outline" className="gap-1.5">
              <XCircle className="h-4 w-4" />
              Decline
            </Button>
          </div>
        )}

        {/* ── Personal ────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            <DetailField label="Name" value={`${invitation.first_name} ${invitation.last_name}`} />
            <DetailField
              label="Division"
              value={formatDivision(invitation.division, invitation.birth_year, invitation.birth_month, invitation.birth_day) ?? invitation.division}
            />
            <DetailField label="Email" value={invitation.email} />
            <DetailField label="Phone" value={invitation.phone} />
            <DetailField
              label="Date of Birth"
              value={dobString(invitation.birth_year, invitation.birth_month, invitation.birth_day)}
            />
            <DetailField label="Shirt Size" value={invitation.shirt_size} />
          </div>
        </section>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            <DetailField label="Street" value={invitation.street_address} />
            <DetailField label="City" value={invitation.city} />
            <DetailField label="State / Province" value={invitation.state} />
            <DetailField label="Country" value={invitation.country} />
            <DetailField label="ZIP / Postal Code" value={invitation.zip} />
          </div>
        </section>

        {/* ── Golf Profile ────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Golf Profile</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            <DetailField label="Primary Club" value={invitation.club} />
            <DetailField label="Handicap Index" value={invitation.handicap_index} />
            <DetailField label="WAGR Ranking" value={invitation.wagr} />
            <LinkField label="WAGR Profile" href={invitation.wagr_url} />
            <DetailField label="Golf Resume" value={invitation.golf_resume} />
            <LinkField label="Resume File" href={invitation.resume_file_url} />
          </div>
        </section>

        {/* ── Record ──────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Record</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            <DetailField label="Date Requested" value={formatDate(invitation.created_at)} />
            <DetailField label="Status" value={invitation.status} />
            <DetailField label="Access Code" value={invitation.access_code} />
            <DetailField label="Policy" value={policyValue(invitation.agree_policy)} />
          </div>
        </section>

        <Button variant="outline" onClick={onDelete} className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
          Delete Invitation
        </Button>
      </div>
    </>
  );
}

// Form state for the player edit mode — every editable field held as a string
// so inputs stay controlled; converted back to the API's types on save.
type PlayerEditForm = Record<
  | "first_name" | "last_name" | "email" | "phone" | "division"
  | "birth_month" | "birth_day" | "birth_year" | "shirt_size"
  | "street_address" | "city" | "state" | "country" | "zip"
  | "club" | "handicap_index" | "wagr",
  string
>;

function playerToForm(p: Player): PlayerEditForm {
  const s = (v: string | number | null | undefined) =>
    v === null || v === undefined ? "" : String(v);
  return {
    first_name: s(p.first_name),
    last_name: s(p.last_name),
    email: s(p.email),
    phone: s(p.phone),
    division: p.division ?? "mens",
    birth_month: s(p.birth_month),
    birth_day: s(p.birth_day),
    birth_year: s(p.birth_year),
    shirt_size: s(p.shirt_size),
    street_address: s(p.street_address),
    city: s(p.city),
    state: s(p.state),
    country: s(p.country),
    zip: s(p.zip),
    club: s(p.club),
    handicap_index: s(p.handicap_index),
    wagr: s(p.wagr),
  };
}

function PlayerDetailView({
  player, sourceInvitation, onDelete, onSave, isSaving,
}: {
  player: Player;
  // The original invitation record (when player.source === "invitation"). Provides
  // the wagr_url / golf_resume / resume_file_url / agree_policy fields that aren't
  // copied to the players table on accept.
  sourceInvitation: PlayerInvitation | null;
  onDelete: () => void;
  onSave: (updates: PlayerUpdateFields) => void;
  isSaving: boolean;
}) {
  const isRegistered = player.registration_status === "registered";
  const isLiveOnSite = isRegistered && player.show_on_site;

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<PlayerEditForm>(() => playerToForm(player));

  // Per-field setter for controlled inputs. startEdit re-seeds `form` from the
  // latest record each time edit mode opens, so it always reflects saved data.
  const setField = (key: keyof PlayerEditForm) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  function startEdit() {
    setForm(playerToForm(player));
    setEditMode(true);
  }
  function cancelEdit() {
    setForm(playerToForm(player));
    setEditMode(false);
  }

  function handleSave() {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    // Convert form strings back to the API's field types. Empty text fields
    // become null (clears the value); empty numbers become null too.
    const text = (v: string): string | null => (v.trim() === "" ? null : v.trim());
    const num = (v: string): number | null => {
      if (v.trim() === "") return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };
    const updates: PlayerUpdateFields = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: text(form.email),
      phone: text(form.phone),
      division: form.division as Division,
      birth_month: num(form.birth_month),
      birth_day: num(form.birth_day),
      birth_year: num(form.birth_year),
      shirt_size: text(form.shirt_size),
      street_address: text(form.street_address),
      city: text(form.city),
      state: text(form.state),
      country: text(form.country),
      zip: text(form.zip),
      club: text(form.club),
      handicap_index: num(form.handicap_index),
      wagr: text(form.wagr),
    };
    onSave(updates);
    setEditMode(false);
  }

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <SheetTitle className="flex items-center gap-3 flex-wrap">
          {isRegistered ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Registered
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              <Mail className="h-3 w-3" />
              Invited
            </span>
          )}
          <span>{player.first_name} {player.last_name}</span>
          {player.access_code && (
            <span className="font-mono text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-2 py-0.5 rounded">
              {player.access_code}
            </span>
          )}
        </SheetTitle>
        {/* Edit / Save / Cancel controls */}
        <div className="flex items-center gap-2 pt-2">
          {editMode ? (
            <>
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving…" : "Save Changes"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit} disabled={isSaving}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Edit Details
            </Button>
          )}
        </div>
        {editMode && isLiveOnSite && (
          <p className="text-xs text-muted-foreground pt-1">
            This player is live on <strong>dixieamateur.com</strong> — saved changes to name,
            division, or location update the public roster.
          </p>
        )}
      </SheetHeader>
      <div className="px-6 py-5 space-y-6">
        {/* ── Personal ────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            {editMode ? (
              <>
                <EditField label="First Name" value={form.first_name} onChange={setField("first_name")} />
                <EditField label="Last Name" value={form.last_name} onChange={setField("last_name")} />
                <div className="flex flex-col gap-1 py-2 border-b border-border/30">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Division</Label>
                  <Select value={form.division} onValueChange={setField("division")}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mens">Men's</SelectItem>
                      <SelectItem value="womens">Women's</SelectItem>
                      <SelectItem value="senior">Senior / Mid-Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <EditField label="Email" value={form.email} onChange={setField("email")} type="email" />
                <EditField label="Phone" value={form.phone} onChange={setField("phone")} />
                <div className="flex flex-col gap-1 py-2 border-b border-border/30">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Date of Birth</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input className="h-8 text-sm" type="number" placeholder="Month" min={1} max={12}
                      value={form.birth_month} onChange={(e) => setField("birth_month")(e.target.value)} />
                    <Input className="h-8 text-sm" type="number" placeholder="Day" min={1} max={31}
                      value={form.birth_day} onChange={(e) => setField("birth_day")(e.target.value)} />
                    <Input className="h-8 text-sm" type="number" placeholder="Year" min={1900} max={2026}
                      value={form.birth_year} onChange={(e) => setField("birth_year")(e.target.value)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Buckets senior players into Mid-Master / Senior / Super Senior on the site.
                  </p>
                </div>
                <EditField label="Shirt Size" value={form.shirt_size} onChange={setField("shirt_size")} />
              </>
            ) : (
              <>
                <DetailField label="Name" value={`${player.first_name} ${player.last_name}`} />
                <DetailField
                  label="Division"
                  value={
                    player.division
                      ? formatDivision(player.division, player.birth_year, player.birth_month, player.birth_day) ?? player.division
                      : null
                  }
                />
                <DetailField label="Email" value={player.email} />
                <DetailField label="Phone" value={player.phone} />
                <DetailField
                  label="Date of Birth"
                  value={dobString(player.birth_year, player.birth_month, player.birth_day)}
                />
                <DetailField label="Shirt Size" value={player.shirt_size} />
              </>
            )}
          </div>
        </section>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Address</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            {editMode ? (
              <>
                <EditField label="Street" value={form.street_address} onChange={setField("street_address")} />
                <EditField label="City" value={form.city} onChange={setField("city")} />
                <EditField label="State / Province" value={form.state} onChange={setField("state")} />
                <EditField label="Country" value={form.country} onChange={setField("country")} />
                <EditField label="ZIP / Postal Code" value={form.zip} onChange={setField("zip")} />
              </>
            ) : (
              <>
                <LocationSummaryField player={player} />
                <DetailField label="Street" value={player.street_address} />
                <DetailField label="City" value={player.city} />
                <DetailField label="State / Province" value={player.state} />
                <DetailField label="Country" value={player.country} />
                <DetailField label="ZIP / Postal Code" value={player.zip} />
              </>
            )}
          </div>
        </section>

        {/* ── Golf Profile ────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Golf Profile</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            {editMode ? (
              <>
                <EditField label="Primary Club" value={form.club} onChange={setField("club")} />
                <EditField label="Handicap Index" value={form.handicap_index} onChange={setField("handicap_index")} type="number" />
                <EditField label="WAGR Ranking" value={form.wagr} onChange={setField("wagr")} />
              </>
            ) : (
              <>
                <DetailField label="Primary Club" value={player.club} />
                <DetailField label="Handicap Index" value={player.handicap_index} />
                <DetailField label="WAGR Ranking" value={player.wagr} />
              </>
            )}
            {/* WAGR profile / resume links live on the source invitation and are read-only here. */}
            <LinkField label="WAGR Profile" href={sourceInvitation?.wagr_url} />
            <DetailField label="Golf Resume" value={sourceInvitation?.golf_resume} />
            <LinkField label="Resume File" href={sourceInvitation?.resume_file_url} />
          </div>
        </section>

        {/* ── Record ──────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Record</h3>
          <div className="rounded-lg border divide-y divide-border/30 px-4">
            <DetailField label="Date Added" value={formatDate(player.created_at)} />
            <DetailField label="Source" value={player.source === "invitation" ? "Tournament Invitation" : "CSV Import"} />
            <DetailField label="Access Code" value={player.access_code} />
            <DetailField label="Status" value={player.registration_status} />
            <DetailField label="Policy" value={policyValue(sourceInvitation?.agree_policy)} />
          </div>
        </section>

        {!editMode && (
          <Button variant="outline" onClick={onDelete} className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
            Remove Player
          </Button>
        )}
      </div>
    </>
  );
}
