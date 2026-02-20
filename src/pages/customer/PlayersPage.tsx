// PlayersPage: manages player roster, CSV import, invitations, and filtering
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Upload, Download, X, ChevronUp, ChevronDown, Search, Pencil, Check, Ban } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  playerInvitationsApi,
  type Player,
  type PlayerImportRow,
  type PlayerUpdateFields,
} from "@/integrations/api/endpoints/playerInvitations";

// ---- Constants ----

const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

const PORTAL_FIELDS = [
  { value: "__skip__",       label: "— Skip —" },
  { value: "first_name",     label: "First Name *" },
  { value: "last_name",      label: "Last Name *" },
  { value: "email",          label: "Email" },
  { value: "phone",          label: "Phone" },
  { value: "division",       label: "Division" },
  { value: "club",           label: "Club / Association" },
  { value: "handicap_index", label: "Handicap Index" },
  { value: "birth_year",     label: "Birth Year" },
  { value: "birth_month",    label: "Birth Month" },
  { value: "birth_day",      label: "Birth Day" },
  { value: "shirt_size",     label: "Shirt Size" },
  { value: "wagr",           label: "WAGR Ranking" },
  { value: "street_address", label: "Street Address" },
  { value: "city",           label: "City" },
  { value: "state",          label: "State / Province" },
  { value: "country",        label: "Country" },
  { value: "zip",            label: "ZIP / Postal Code" },
] as const;

// ---- Helpers ----

function autoDetectField(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const map: Record<string, string> = {
    firstname:     "first_name",
    first:         "first_name",
    lastname:      "last_name",
    last:          "last_name",
    email:         "email",
    emailaddress:  "email",
    phone:         "phone",
    mobile:        "phone",
    telephone:     "phone",
    division:      "division",
    category:      "division",
    club:          "club",
    association:   "club",
    handicap:      "handicap_index",
    handicapindex: "handicap_index",
    hcp:           "handicap_index",
    birthyear:     "birth_year",
    year:          "birth_year",
    birthmonth:    "birth_month",
    month:         "birth_month",
    birthday:      "birth_day",
    day:           "birth_day",
    shirtsize:     "shirt_size",
    shirt:         "shirt_size",
    size:          "shirt_size",
    wagr:          "wagr",
    ranking:       "wagr",
    street:        "street_address",
    address:       "street_address",
    streetaddress: "street_address",
    city:          "city",
    state:         "state",
    province:      "state",
    country:       "country",
    zip:           "zip",
    postal:        "zip",
    postalcode:    "zip",
    zipcode:       "zip",
  };
  return map[h] ?? "__skip__";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function exportToCsv(players: Player[]) {
  const headers = [
    "First Name", "Last Name", "Email", "Phone", "Division", "Club",
    "Handicap Index", "Birth Year", "Birth Month", "Birth Day",
    "Shirt Size", "WAGR", "Street Address", "City", "State", "Country", "ZIP",
    "Added",
  ];
  const rows = players.map((p) => [
    p.first_name, p.last_name, p.email ?? "", p.phone ?? "",
    DIVISION_LABELS[p.division ?? ""] ?? p.division ?? "",
    p.club ?? "", p.handicap_index ?? "", p.birth_year ?? "",
    p.birth_month ?? "", p.birth_day ?? "", p.shirt_size ?? "",
    p.wagr ?? "", p.street_address ?? "", p.city ?? "",
    p.state ?? "", p.country ?? "", p.zip ?? "",
    formatDate(p.created_at),
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dixie-players-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type SortField = "name" | "division" | "club" | "handicap_index" | "created_at";

// ---- Detail Field Components ----

function ReadField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function EditField({
  label,
  name,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  type?: string;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/30 last:border-0">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Input
        className="h-8 text-sm"
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  );
}

// ---- Main Component ----

export default function PlayersPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setOpen: setSidebarOpen } = useSidebar();

  // Split-panel state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, string>>({});

  // Search / filter / sort
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // CSV import state
  const [csvHeaders, setCsvHeaders]     = useState<string[]>([]);
  const [csvRows, setCsvRows]           = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Players query
  const { data, isLoading } = useQuery({
    queryKey: ["players"],
    queryFn:  () => playerInvitationsApi.listPlayers(),
  });
  const players: Player[] = data?.players ?? [];

  // Selected player (from already-loaded list data)
  const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (rows: PlayerImportRow[]) => playerInvitationsApi.importPlayers(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setShowMappingDialog(false);
      setCsvHeaders([]);
      setCsvRows([]);
      setFieldMapping({});
      toast.success(`${result.imported} player(s) imported successfully.`);
    },
    onError: (err: Error) => toast.error(`Import failed: ${err.message}`),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PlayerUpdateFields }) =>
      playerInvitationsApi.updatePlayer(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setEditMode(false);
      toast.success("Player updated.");
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });

  // Open detail + collapse sidebar
  function selectPlayer(id: string) {
    const p = players.find((pl) => pl.id === id);
    if (!p) return;
    setSelectedId(id);
    setEditMode(false);
    setEditFields({
      first_name:     p.first_name ?? "",
      last_name:      p.last_name ?? "",
      email:          p.email ?? "",
      phone:          p.phone ?? "",
      division:       p.division ?? "",
      club:           p.club ?? "",
      handicap_index: p.handicap_index != null ? String(p.handicap_index) : "",
      birth_year:     p.birth_year != null ? String(p.birth_year) : "",
      birth_month:    p.birth_month != null ? String(p.birth_month) : "",
      birth_day:      p.birth_day != null ? String(p.birth_day) : "",
      shirt_size:     p.shirt_size ?? "",
      wagr:           p.wagr ?? "",
      street_address: p.street_address ?? "",
      city:           p.city ?? "",
      state:          p.state ?? "",
      country:        p.country ?? "",
      zip:            p.zip ?? "",
    });
    setSidebarOpen(false);
  }

  function closeDetail() {
    setSelectedId(null);
    setEditMode(false);
    setSidebarOpen(true);
  }

  function handleEditFieldChange(name: string, value: string) {
    setEditFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleSaveEdit() {
    if (!selectedId) return;
    const updates: PlayerUpdateFields = {};
    const p = selectedPlayer;
    if (!p) return;

    const str = (v: string) => v.trim() || undefined;
    const num = (v: string) => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };
    const int = (v: string) => {
      const n = parseInt(v, 10);
      return isNaN(n) ? undefined : n;
    };

    if (editFields.first_name.trim() !== p.first_name) updates.first_name = editFields.first_name.trim();
    if (editFields.last_name.trim() !== p.last_name) updates.last_name = editFields.last_name.trim();
    if (editFields.email.trim().toLowerCase() !== (p.email ?? "")) updates.email = str(editFields.email) ?? null as unknown as string;
    if (editFields.phone !== (p.phone ?? "")) updates.phone = str(editFields.phone) ?? null as unknown as string;
    if (editFields.division !== (p.division ?? "")) updates.division = str(editFields.division) as PlayerUpdateFields["division"];
    if (editFields.club !== (p.club ?? "")) updates.club = str(editFields.club) ?? null as unknown as string;

    const newHandicap = editFields.handicap_index ? num(editFields.handicap_index) : null;
    if (newHandicap !== p.handicap_index) updates.handicap_index = newHandicap ?? undefined;

    const newBirthYear = editFields.birth_year ? int(editFields.birth_year) : null;
    if (newBirthYear !== p.birth_year) updates.birth_year = newBirthYear ?? undefined;

    const newBirthMonth = editFields.birth_month ? int(editFields.birth_month) : null;
    if (newBirthMonth !== p.birth_month) updates.birth_month = newBirthMonth ?? undefined;

    const newBirthDay = editFields.birth_day ? int(editFields.birth_day) : null;
    if (newBirthDay !== p.birth_day) updates.birth_day = newBirthDay ?? undefined;

    if (editFields.shirt_size !== (p.shirt_size ?? "")) updates.shirt_size = str(editFields.shirt_size) ?? null as unknown as string;
    if (editFields.wagr !== (p.wagr ?? "")) updates.wagr = str(editFields.wagr) ?? null as unknown as string;
    if (editFields.street_address !== (p.street_address ?? "")) updates.street_address = str(editFields.street_address) ?? null as unknown as string;
    if (editFields.city !== (p.city ?? "")) updates.city = str(editFields.city) ?? null as unknown as string;
    if (editFields.state !== (p.state ?? "")) updates.state = str(editFields.state) ?? null as unknown as string;
    if (editFields.country !== (p.country ?? "")) updates.country = str(editFields.country) ?? null as unknown as string;
    if (editFields.zip !== (p.zip ?? "")) updates.zip = str(editFields.zip) ?? null as unknown as string;

    if (Object.keys(updates).length === 0) {
      setEditMode(false);
      return;
    }

    updateMutation.mutate({ id: selectedId, updates });
  }

  // Sort toggle
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d: "asc" | "desc") => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...players];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(s) ||
          (p.email ?? "").toLowerCase().includes(s) ||
          (p.club ?? "").toLowerCase().includes(s)
      );
    }
    if (filterDivision !== "all") items = items.filter((p) => p.division === filterDivision);

    items.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortField === "name") {
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
      } else if (sortField === "division") {
        aVal = a.division ?? "";
        bVal = b.division ?? "";
      } else if (sortField === "club") {
        aVal = a.club ?? "";
        bVal = b.club ?? "";
      } else if (sortField === "handicap_index") {
        return sortDir === "asc"
          ? (a.handicap_index ?? 999) - (b.handicap_index ?? 999)
          : (b.handicap_index ?? 999) - (a.handicap_index ?? 999);
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [players, search, filterDivision, sortField, sortDir]);

  // CSV file select
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          toast.error("The CSV file has no column headers.");
          return;
        }
        const autoMapping: Record<string, string> = {};
        for (const h of headers) autoMapping[h] = autoDetectField(h);
        setCsvHeaders(headers);
        setCsvRows(results.data);
        setFieldMapping(autoMapping);
        setShowMappingDialog(true);
      },
      error: () => toast.error("Could not parse the CSV file. Please check the format."),
    });
    e.target.value = "";
  }

  function handleConfirmImport() {
    const mappedValues = Object.values(fieldMapping);
    if (!mappedValues.includes("first_name") || !mappedValues.includes("last_name")) {
      toast.error("You must map at least First Name and Last Name before importing.");
      return;
    }

    const rowsToImport: PlayerImportRow[] = csvRows
      .map((csvRow) => {
        const row: Record<string, unknown> = {};
        for (const [csvCol, portalField] of Object.entries(fieldMapping)) {
          if (portalField === "__skip__") continue;
          const raw = (csvRow[csvCol] ?? "").trim();
          if (!raw) continue;
          if (portalField === "handicap_index") {
            const n = parseFloat(raw);
            if (!isNaN(n)) row[portalField] = n;
          } else if (["birth_year", "birth_month", "birth_day"].includes(portalField)) {
            const n = parseInt(raw, 10);
            if (!isNaN(n)) row[portalField] = n;
          } else {
            row[portalField] = raw;
          }
        }
        return row as unknown as PlayerImportRow;
      })
      .filter(
        (r) =>
          typeof r.first_name === "string" && r.first_name.trim().length > 0 &&
          typeof r.last_name === "string"  && r.last_name.trim().length > 0
      );

    if (rowsToImport.length === 0) {
      toast.error("No valid rows found. Make sure First Name and Last Name are present.");
      return;
    }
    importMutation.mutate(rowsToImport);
  }

  const previewRows   = csvRows.slice(0, 5);
  const mappedColumns = Object.entries(fieldMapping).filter(([, v]) => v !== "__skip__");
  const hasActiveFilters = search.trim() || filterDivision !== "all";

  // ---- Render ----
  return (
    <div
      className="-m-8 flex overflow-hidden"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* ============ LEFT: LIST PANEL ============ */}
      <div
        className={`transition-all duration-300 ease-in-out flex flex-col overflow-hidden border-r bg-background ${
          selectedId ? "w-[38%] min-w-[280px]" : "w-full"
        }`}
      >
        {/* Panel header */}
        <div className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold">Players</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${filtered.length}${filtered.length !== players.length ? ` of ${players.length}` : ""} player${players.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {!selectedId && (
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => players.length > 0 && exportToCsv(players)}
                  disabled={players.length === 0}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Import CSV
                </Button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, email, or club…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1.5">
            <Select value={filterDivision} onValueChange={setFilterDivision}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Division" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                <SelectItem value="mens">Men's</SelectItem>
                <SelectItem value="womens">Women's</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => { setSearch(""); setFilterDivision("all"); }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <p className="text-sm font-medium text-muted-foreground">
                {players.length === 0 ? "No players yet." : "No results match your filters."}
              </p>
              {players.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Accept invitation requests or use Import CSV to add players.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">Name <SortIcon field="name" /></div>
                  </TableHead>
                  {!selectedId && (
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("division")}>
                      <div className="flex items-center gap-1">Division <SortIcon field="division" /></div>
                    </TableHead>
                  )}
                  {!selectedId && (
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("club")}>
                      <div className="flex items-center gap-1">Club <SortIcon field="club" /></div>
                    </TableHead>
                  )}
                  {!selectedId && (
                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort("handicap_index")}>
                      <div className="flex items-center gap-1">HCP <SortIcon field="handicap_index" /></div>
                    </TableHead>
                  )}
                  {!selectedId && <TableHead>Email</TableHead>}
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center gap-1">
                      {selectedId ? "Added" : "Date Added"} <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedId === p.id ? "bg-muted" : ""
                    }`}
                    onClick={() => selectPlayer(p.id)}
                  >
                    <TableCell className="font-medium py-2.5">
                      {p.first_name} {p.last_name}
                    </TableCell>
                    {!selectedId && (
                      <TableCell className="py-2.5">
                        {p.division ? (DIVISION_LABELS[p.division] ?? p.division) : "—"}
                      </TableCell>
                    )}
                    {!selectedId && (
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        {p.club ?? "—"}
                      </TableCell>
                    )}
                    {!selectedId && (
                      <TableCell className="py-2.5 text-sm">
                        {p.handicap_index != null ? p.handicap_index : "—"}
                      </TableCell>
                    )}
                    {!selectedId && (
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        {p.email ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ============ RIGHT: DETAIL PANEL ============ */}
      {selectedId && selectedPlayer && (
        <div className="flex flex-col flex-1 overflow-hidden bg-background">
          {/* Detail header */}
          <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold">
                {selectedPlayer.first_name} {selectedPlayer.last_name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedPlayer.division
                  ? DIVISION_LABELS[selectedPlayer.division] ?? selectedPlayer.division
                  : "No division"}
                {selectedPlayer.club ? ` · ${selectedPlayer.club}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editMode ? (
                <>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {updateMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setEditMode(false)}
                    disabled={updateMutation.isPending}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setEditMode(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              <Button size="icon" variant="ghost" onClick={closeDetail} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-2xl space-y-6">
              {/* Personal */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Personal Information
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  {editMode ? (
                    <>
                      <EditField label="First Name" name="first_name" value={editFields.first_name} onChange={handleEditFieldChange} />
                      <EditField label="Last Name"  name="last_name"  value={editFields.last_name}  onChange={handleEditFieldChange} />
                      <EditField label="Email"      name="email"      value={editFields.email}       onChange={handleEditFieldChange} />
                      <EditField label="Phone"      name="phone"      value={editFields.phone}       onChange={handleEditFieldChange} />
                      <div className="flex flex-col gap-1 py-2 border-b border-border/30 last:border-0">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Division</Label>
                        <Select
                          value={editFields.division}
                          onValueChange={(v) => handleEditFieldChange("division", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mens">Men's</SelectItem>
                            <SelectItem value="womens">Women's</SelectItem>
                            <SelectItem value="senior">Senior/Mid-Master</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <EditField label="Shirt Size" name="shirt_size" value={editFields.shirt_size} onChange={handleEditFieldChange} />
                      <EditField label="Birth Year"  name="birth_year"  value={editFields.birth_year}  type="number" onChange={handleEditFieldChange} />
                      <EditField label="Birth Month" name="birth_month" value={editFields.birth_month} type="number" onChange={handleEditFieldChange} />
                      <EditField label="Birth Day"   name="birth_day"   value={editFields.birth_day}   type="number" onChange={handleEditFieldChange} />
                    </>
                  ) : (
                    <>
                      <ReadField label="Email"  value={selectedPlayer.email} />
                      <ReadField label="Phone"  value={selectedPlayer.phone} />
                      <ReadField label="Division" value={selectedPlayer.division ? DIVISION_LABELS[selectedPlayer.division] ?? selectedPlayer.division : null} />
                      <ReadField
                        label="Date of Birth"
                        value={
                          selectedPlayer.birth_month && selectedPlayer.birth_day && selectedPlayer.birth_year
                            ? `${selectedPlayer.birth_month}/${selectedPlayer.birth_day}/${selectedPlayer.birth_year}`
                            : null
                        }
                      />
                      <ReadField label="Shirt Size" value={selectedPlayer.shirt_size} />
                    </>
                  )}
                </div>
              </section>

              {/* Golf Profile */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Golf Profile
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  {editMode ? (
                    <>
                      <EditField label="Primary Club"    name="club"           value={editFields.club}           onChange={handleEditFieldChange} />
                      <EditField label="Handicap Index"  name="handicap_index" value={editFields.handicap_index} type="number" onChange={handleEditFieldChange} />
                      <EditField label="WAGR Ranking"    name="wagr"           value={editFields.wagr}           onChange={handleEditFieldChange} />
                    </>
                  ) : (
                    <>
                      <ReadField label="Primary Club"   value={selectedPlayer.club} />
                      <ReadField label="Handicap Index" value={selectedPlayer.handicap_index} />
                      <ReadField label="WAGR Ranking"   value={selectedPlayer.wagr} />
                    </>
                  )}
                </div>
              </section>

              {/* Address */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Mailing Address
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  {editMode ? (
                    <>
                      <EditField label="Street Address"    name="street_address" value={editFields.street_address} onChange={handleEditFieldChange} />
                      <EditField label="City"              name="city"           value={editFields.city}           onChange={handleEditFieldChange} />
                      <EditField label="State / Province"  name="state"          value={editFields.state}          onChange={handleEditFieldChange} />
                      <EditField label="Country"           name="country"        value={editFields.country}        onChange={handleEditFieldChange} />
                      <EditField label="ZIP / Postal Code" name="zip"            value={editFields.zip}            onChange={handleEditFieldChange} />
                    </>
                  ) : (
                    <>
                      <ReadField label="Street Address"    value={selectedPlayer.street_address} />
                      <ReadField label="City"              value={selectedPlayer.city} />
                      <ReadField label="State / Province"  value={selectedPlayer.state} />
                      <ReadField label="Country"           value={selectedPlayer.country} />
                      <ReadField label="ZIP / Postal Code" value={selectedPlayer.zip} />
                    </>
                  )}
                </div>
              </section>

              {/* Tournament History — placeholder */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Tournament History
                </h3>
                <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                  Tournament history tracking coming soon.
                </div>
              </section>

              {/* Meta */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Record Info
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  <ReadField label="Added"    value={formatDate(selectedPlayer.created_at)} />
                  <ReadField label="Updated"  value={formatDate(selectedPlayer.updated_at)} />
                  <ReadField
                    label="Source"
                    value={selectedPlayer.source === "invitation" ? "Tournament Invitation" : "CSV Import"}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ============ CSV Field Mapping Dialog ============ */}
      <Dialog
        open={showMappingDialog}
        onOpenChange={(open) => { if (!open && !importMutation.isPending) setShowMappingDialog(false); }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map CSV Fields</DialogTitle>
            <DialogDescription>
              {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected.
              Map each CSV column to the matching portal field, or skip it.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span>CSV Column</span>
              <span>Portal Field</span>
            </div>
            {csvHeaders.map((header) => (
              <div key={header} className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">{header}</span>
                <Select
                  value={fieldMapping[header] ?? "__skip__"}
                  onValueChange={(val) => setFieldMapping((prev) => ({ ...prev, [header]: val }))}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTAL_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {mappedColumns.length > 0 && previewRows.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold mb-2">
                Preview — first {previewRows.length} row{previewRows.length !== 1 ? "s" : ""}
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-muted">
                      {mappedColumns.map(([, portalField]) => (
                        <th key={portalField} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                          {portalField}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {mappedColumns.map(([csvCol, portalField]) => (
                          <td key={portalField} className="px-3 py-1.5 max-w-[160px] truncate">
                            {row[csvCol] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMappingDialog(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmImport} disabled={importMutation.isPending}>
              {importMutation.isPending
                ? "Importing…"
                : `Import ${csvRows.length} Player${csvRows.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
