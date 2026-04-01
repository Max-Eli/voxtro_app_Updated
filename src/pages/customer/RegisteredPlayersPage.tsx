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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { X, ChevronUp, ChevronDown, Search, Download } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  playerInvitationsApi,
  type Player,
  type RegistrationStatus,
} from "@/integrations/api/endpoints/playerInvitations";

// ---- Constants ----

const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

const REG_STATUS_LABELS: Record<RegistrationStatus, string> = {
  invited:    "Invited",
  registered: "Registered",
  withdrew:   "Withdrew",
};

const REG_STATUS_COLORS: Record<RegistrationStatus, string> = {
  invited:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  registered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  withdrew:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

// Export column definitions
interface ExportColumn {
  key: string;
  label: string;
  getValue: (p: Player) => string;
}

const EXPORT_COLUMN_GROUPS: { groupLabel: string; columns: ExportColumn[] }[] = [
  {
    groupLabel: "Identity",
    columns: [
      { key: "first_name",  label: "First Name",  getValue: (p) => p.first_name },
      { key: "last_name",   label: "Last Name",   getValue: (p) => p.last_name },
      { key: "email",       label: "Email",       getValue: (p) => p.email ?? "" },
      { key: "phone",       label: "Phone",       getValue: (p) => p.phone ?? "" },
    ],
  },
  {
    groupLabel: "Golf Profile",
    columns: [
      { key: "division",       label: "Division",       getValue: (p) => DIVISION_LABELS[p.division ?? ""] ?? p.division ?? "" },
      { key: "club",           label: "Club",           getValue: (p) => p.club ?? "" },
      { key: "handicap_index", label: "Handicap Index", getValue: (p) => p.handicap_index != null ? String(p.handicap_index) : "" },
      { key: "wagr",           label: "WAGR Ranking",   getValue: (p) => p.wagr ?? "" },
      { key: "shirt_size",     label: "Shirt Size",     getValue: (p) => p.shirt_size ?? "" },
    ],
  },
  {
    groupLabel: "Date of Birth",
    columns: [
      { key: "birth_year",  label: "Birth Year",  getValue: (p) => p.birth_year != null ? String(p.birth_year) : "" },
      { key: "birth_month", label: "Birth Month", getValue: (p) => p.birth_month != null ? String(p.birth_month) : "" },
      { key: "birth_day",   label: "Birth Day",   getValue: (p) => p.birth_day != null ? String(p.birth_day) : "" },
    ],
  },
  {
    groupLabel: "Address",
    columns: [
      { key: "street_address", label: "Street Address",    getValue: (p) => p.street_address ?? "" },
      { key: "city",           label: "City",              getValue: (p) => p.city ?? "" },
      { key: "state",          label: "State / Province",  getValue: (p) => p.state ?? "" },
      { key: "country",        label: "Country",           getValue: (p) => p.country ?? "" },
      { key: "zip",            label: "ZIP / Postal Code", getValue: (p) => p.zip ?? "" },
    ],
  },
  {
    groupLabel: "Meta",
    columns: [
      { key: "access_code",         label: "Access Code",         getValue: (p) => p.access_code ?? "" },
      { key: "registration_status", label: "Registration Status", getValue: (p) => REG_STATUS_LABELS[p.registration_status] ?? p.registration_status },
      { key: "date_added",          label: "Date Added",          getValue: (p) => new Date(p.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) },
    ],
  },
];

const ALL_COLUMN_KEYS = EXPORT_COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key));
const ALL_COLUMNS_MAP = Object.fromEntries(
  EXPORT_COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => [c.key, c]))
) as Record<string, ExportColumn>;

// ---- Helpers ----

function RegStatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${REG_STATUS_COLORS[status]}`}>
      {REG_STATUS_LABELS[status]}
    </span>
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

type SortField = "name" | "division" | "registration_status" | "created_at";

// ---- Export ----

function exportSelectedColumns(players: Player[], selectedKeys: string[]) {
  const cols = selectedKeys.map((k) => ALL_COLUMNS_MAP[k]).filter(Boolean);
  const headers = cols.map((c) => c.label);
  const rows = players.map((p) => cols.map((c) => c.getValue(p)));
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dixie-registered-players-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Main Component ----

export default function RegisteredPlayersPage() {
  const queryClient = useQueryClient();
  const { setOpen: setSidebarOpen } = useSidebar();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search / filter / sort
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedExportKeys, setSelectedExportKeys] = useState<string[]>(ALL_COLUMN_KEYS);

  // Players query (reuses the same endpoint; registration_status now included)
  const { data, isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => playerInvitationsApi.listPlayers(),
  });
  const allPlayers: Player[] = data?.players ?? [];

  // Only show players with an access_code (accepted from invitations)
  const players = useMemo(
    () => allPlayers.filter((p) => p.source === "invitation"),
    [allPlayers]
  );

  const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;

  // Registration status update mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RegistrationStatus }) =>
      playerInvitationsApi.updatePlayerRegistrationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Registration status updated.");
    },
    onError: (err: Error) => toast.error(`Update failed: ${err.message}`),
  });

  function selectPlayer(id: string) {
    setSelectedId(id);
    setSidebarOpen(false);
  }

  function closeDetail() {
    setSelectedId(null);
    setSidebarOpen(true);
  }

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
    return sortDir === "asc"
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  }

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
    if (filterStatus !== "all") items = items.filter((p) => p.registration_status === filterStatus);
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
      } else if (sortField === "registration_status") {
        aVal = a.registration_status;
        bVal = b.registration_status;
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [players, search, filterStatus, filterDivision, sortField, sortDir]);

  const hasActiveFilters = search.trim() || filterStatus !== "all" || filterDivision !== "all";

  function toggleExportKey(key: string) {
    setSelectedExportKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleGroupKeys(keys: string[], checked: boolean) {
    if (checked) {
      setSelectedExportKeys((prev) => [...new Set([...prev, ...keys])]);
    } else {
      setSelectedExportKeys((prev) => prev.filter((k) => !keys.includes(k)));
    }
  }

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
              <h1 className="text-lg font-semibold">Registered Players</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${filtered.length}${filtered.length !== players.length ? ` of ${players.length}` : ""} player${players.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            {!selectedId && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setExportOpen(true)}
                disabled={filtered.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="withdrew">Withdrew</SelectItem>
              </SelectContent>
            </Select>
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
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                  setFilterDivision("all");
                }}
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
                {players.length === 0
                  ? "No players yet."
                  : "No results match your filters."}
              </p>
              {players.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Players appear here after their invitations are accepted.
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Name <SortIcon field="name" />
                    </div>
                  </TableHead>
                  {!selectedId && (
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => handleSort("division")}
                    >
                      <div className="flex items-center gap-1">
                        Division <SortIcon field="division" />
                      </div>
                    </TableHead>
                  )}
                  {!selectedId && <TableHead>Email</TableHead>}
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("registration_status")}
                  >
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="registration_status" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("created_at")}
                  >
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
                        {p.email ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="py-2.5">
                      <RegStatusBadge status={p.registration_status} />
                    </TableCell>
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
            <div className="flex items-center gap-3 flex-wrap">
              <RegStatusBadge status={selectedPlayer.registration_status} />
              {selectedPlayer.access_code && (
                <span className="font-mono text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-3 py-1 rounded-md tracking-wider">
                  {selectedPlayer.access_code}
                </span>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={closeDetail} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-2xl space-y-6">
              {/* Registration Status control */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Registration Status
                </h3>
                <div className="rounded-lg border px-4 py-3">
                  <Select
                    value={selectedPlayer.registration_status}
                    onValueChange={(v) =>
                      statusMutation.mutate({ id: selectedPlayer.id, status: v as RegistrationStatus })
                    }
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invited">Invited</SelectItem>
                      <SelectItem value="registered">Registered</SelectItem>
                      <SelectItem value="withdrew">Withdrew</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Change the player's registration status. "Registered" is set automatically when PayPal payment is captured.
                  </p>
                </div>
              </section>

              {/* Personal */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Personal Information
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  <DetailField label="Full Name" value={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`} />
                  <DetailField label="Email" value={selectedPlayer.email} />
                  <DetailField label="Phone" value={selectedPlayer.phone} />
                  <DetailField label="Division" value={selectedPlayer.division ? DIVISION_LABELS[selectedPlayer.division] ?? selectedPlayer.division : null} />
                  <DetailField
                    label="Date of Birth"
                    value={
                      selectedPlayer.birth_month && selectedPlayer.birth_day && selectedPlayer.birth_year
                        ? `${selectedPlayer.birth_month}/${selectedPlayer.birth_day}/${selectedPlayer.birth_year}`
                        : null
                    }
                  />
                  <DetailField label="Shirt Size" value={selectedPlayer.shirt_size} />
                </div>
              </section>

              {/* Address */}
              {(selectedPlayer.street_address || selectedPlayer.city || selectedPlayer.country) && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Mailing Address
                  </h3>
                  <div className="rounded-lg border divide-y divide-border/30 px-4">
                    <DetailField label="Street" value={selectedPlayer.street_address} />
                    <DetailField label="City" value={selectedPlayer.city} />
                    <DetailField label="State / Province" value={selectedPlayer.state} />
                    <DetailField label="Country" value={selectedPlayer.country} />
                    <DetailField label="ZIP / Postal Code" value={selectedPlayer.zip} />
                  </div>
                </section>
              )}

              {/* Golf Profile */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Golf Profile
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  <DetailField label="Primary Club" value={selectedPlayer.club} />
                  <DetailField label="Handicap Index" value={selectedPlayer.handicap_index} />
                  <DetailField label="WAGR Ranking" value={selectedPlayer.wagr} />
                </div>
              </section>

              {/* Meta */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Record Info
                </h3>
                <div className="rounded-lg border divide-y divide-border/30 px-4">
                  <DetailField label="Date Added" value={formatDate(selectedPlayer.created_at)} />
                  <DetailField label="Access Code" value={selectedPlayer.access_code} />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ============ EXPORT DIALOG ============ */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Players</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Select the columns to include in the CSV export.
            {filterStatus !== "all" || filterDivision !== "all" || search.trim()
              ? ` Exporting ${filtered.length} filtered player${filtered.length !== 1 ? "s" : ""}.`
              : ` Exporting all ${filtered.length} player${filtered.length !== 1 ? "s" : ""}.`}
          </p>

          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => setSelectedExportKeys(ALL_COLUMN_KEYS)}
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => setSelectedExportKeys([])}
              >
                Deselect All
              </Button>
            </div>

            {EXPORT_COLUMN_GROUPS.map((group) => {
              const groupKeys = group.columns.map((c) => c.key);
              const allChecked = groupKeys.every((k) => selectedExportKeys.includes(k));
              const someChecked = groupKeys.some((k) => selectedExportKeys.includes(k));
              return (
                <div key={group.groupLabel}>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox
                      id={`group-${group.groupLabel}`}
                      checked={allChecked}
                      ref={(el) => {
                        if (el) (el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someChecked && !allChecked;
                      }}
                      onCheckedChange={(checked) => toggleGroupKeys(groupKeys, !!checked)}
                    />
                    <Label htmlFor={`group-${group.groupLabel}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
                      {group.groupLabel}
                    </Label>
                  </div>
                  <div className="ml-6 space-y-1.5">
                    {group.columns.map((col) => (
                      <div key={col.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`col-${col.key}`}
                          checked={selectedExportKeys.includes(col.key)}
                          onCheckedChange={() => toggleExportKey(col.key)}
                        />
                        <Label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">
                          {col.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedExportKeys.length === 0 || filtered.length === 0}
              onClick={() => {
                exportSelectedColumns(filtered, selectedExportKeys);
                setExportOpen(false);
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export {filtered.length} Player{filtered.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
