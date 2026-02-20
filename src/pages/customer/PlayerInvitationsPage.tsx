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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { X, ChevronUp, ChevronDown, Search } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  playerInvitationsApi,
  type PlayerInvitation,
  type InvitationStatus,
} from "@/integrations/api/endpoints/playerInvitations";

// ---- Helpers & constants ----

const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

const STATUS_COLORS: Record<InvitationStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

type SortField = "name" | "division" | "created_at" | "status";

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-border/30 last:border-0">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{String(value)}</span>
    </div>
  );
}

// ---- Main Component ----

export default function PlayerInvitationsPage() {
  const queryClient = useQueryClient();
  const { setOpen: setSidebarOpen } = useSidebar();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Search / filter / sort state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch all invitations
  const { data, isLoading } = useQuery({
    queryKey: ["player-invitations"],
    queryFn: () => playerInvitationsApi.listInvitations(),
  });
  const invitations: PlayerInvitation[] = data?.invitations ?? [];

  // Fetch full detail when a row is selected
  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["player-invitation", selectedId],
    queryFn:  () => playerInvitationsApi.getInvitation(selectedId!),
    enabled:  !!selectedId,
  });

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.acceptInvitation(id),
    onSuccess: (result: { success: boolean; access_code: string; email_sent: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["player-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["player-invitation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(
        `Player accepted! Access code: ${result.access_code}` +
        (result.email_sent ? " — Email sent." : " — Email sending failed.")
      );
    },
    onError: (err: Error) => toast.error(`Accept failed: ${err.message}`),
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.declineInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["player-invitation", selectedId] });
      toast.success("Invitation declined.");
    },
    onError: (err: Error) => toast.error(`Decline failed: ${err.message}`),
  });

  const isActing = acceptMutation.isPending || declineMutation.isPending;

  // Open detail + collapse sidebar
  function selectInvitation(id: string) {
    setSelectedId(id);
    setSidebarOpen(false);
  }

  // Close detail + restore sidebar
  function closeDetail() {
    setSelectedId(null);
    setSidebarOpen(true);
  }

  // Toggle sort
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

  // Available years for filter
  const years = useMemo(() => {
    const set = new Set(invitations.map((inv) =>
      new Date(inv.created_at).getFullYear().toString()
    ));
    return Array.from(set).sort().reverse();
  }, [invitations]);

  // Filter + sort
  const filtered = useMemo(() => {
    let items = [...invitations];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      items = items.filter(
        (inv) =>
          `${inv.first_name} ${inv.last_name}`.toLowerCase().includes(s) ||
          inv.email.toLowerCase().includes(s)
      );
    }
    if (filterStatus !== "all") items = items.filter((inv) => inv.status === filterStatus);
    if (filterDivision !== "all") items = items.filter((inv) => inv.division === filterDivision);
    if (filterYear !== "all")
      items = items.filter(
        (inv) => new Date(inv.created_at).getFullYear().toString() === filterYear
      );

    items.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      if (sortField === "name") {
        aVal = `${a.first_name} ${a.last_name}`;
        bVal = `${b.first_name} ${b.last_name}`;
      } else if (sortField === "division") {
        aVal = a.division ?? "";
        bVal = b.division ?? "";
      } else if (sortField === "status") {
        aVal = a.status;
        bVal = b.status;
      } else {
        aVal = a.created_at;
        bVal = b.created_at;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [invitations, search, filterStatus, filterDivision, filterYear, sortField, sortDir]);

  const hasActiveFilters =
    search.trim() || filterStatus !== "all" || filterDivision !== "all" || filterYear !== "all";

  // ---- Render ----
  return (
    // -m-8 negates the p-8 on <main>; height fills viewport minus the h-16 header
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
              <h1 className="text-lg font-semibold">Player Invitations</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${filtered.length}${filtered.length !== invitations.length ? ` of ${invitations.length}` : ""} invitation${invitations.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
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
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
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
                  setFilterYear("all");
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
                {invitations.length === 0
                  ? "No invitation requests yet."
                  : "No results match your filters."}
              </p>
              {invitations.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Requests submitted through the tournament website will appear here.
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
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center gap-1">
                      {selectedId ? "Date" : "Submitted"} <SortIcon field="created_at" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedId === inv.id ? "bg-muted" : ""
                    }`}
                    onClick={() => selectInvitation(inv.id)}
                  >
                    <TableCell className="font-medium py-2.5">
                      {inv.first_name} {inv.last_name}
                    </TableCell>
                    {!selectedId && (
                      <TableCell className="py-2.5">
                        {DIVISION_LABELS[inv.division] ?? inv.division}
                      </TableCell>
                    )}
                    {!selectedId && (
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        {inv.email}
                      </TableCell>
                    )}
                    <TableCell className="py-2.5 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(inv.created_at)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusBadge status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* ============ RIGHT: DETAIL PANEL ============ */}
      {selectedId && (
        <div className="flex flex-col flex-1 overflow-hidden bg-background">
          {/* Detail header: status + actions */}
          <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              {detail && <StatusBadge status={detail.status} />}
              {detail?.access_code && (
                <span className="font-mono text-sm bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-3 py-1 rounded-md tracking-wider">
                  {detail.access_code}
                </span>
              )}
              {isDetailLoading && (
                <Skeleton className="h-5 w-24" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isDetailLoading && detail?.status === "pending" && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => acceptMutation.mutate(detail.id)}
                    disabled={isActing}
                  >
                    {acceptMutation.isPending ? "Accepting…" : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => declineMutation.mutate(detail.id)}
                    disabled={isActing}
                  >
                    {declineMutation.isPending ? "Declining…" : "Decline"}
                  </Button>
                </>
              )}
              <Button size="icon" variant="ghost" onClick={closeDetail} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Detail content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isDetailLoading || !detail ? (
              <div className="space-y-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-w-2xl space-y-6">
                {/* Personal */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Personal Information
                  </h3>
                  <div className="rounded-lg border divide-y divide-border/30 px-4">
                    <DetailField label="Full Name" value={`${detail.first_name} ${detail.last_name}`} />
                    <DetailField label="Email" value={detail.email} />
                    <DetailField label="Phone" value={detail.phone} />
                    <DetailField label="Division" value={DIVISION_LABELS[detail.division] ?? detail.division} />
                    <DetailField
                      label="Date of Birth"
                      value={
                        detail.birth_month && detail.birth_day && detail.birth_year
                          ? `${detail.birth_month}/${detail.birth_day}/${detail.birth_year}`
                          : null
                      }
                    />
                    <DetailField label="Shirt Size" value={detail.shirt_size} />
                  </div>
                </section>

                {/* Address */}
                {(detail.street_address || detail.city || detail.country) && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Mailing Address
                    </h3>
                    <div className="rounded-lg border divide-y divide-border/30 px-4">
                      <DetailField label="Street" value={detail.street_address} />
                      <DetailField label="City" value={detail.city} />
                      <DetailField label="State / Province" value={detail.state} />
                      <DetailField label="Country" value={detail.country} />
                      <DetailField label="ZIP / Postal Code" value={detail.zip} />
                    </div>
                  </section>
                )}

                {/* Golf Profile */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Golf Profile
                  </h3>
                  <div className="rounded-lg border divide-y divide-border/30 px-4">
                    <DetailField label="Primary Club" value={detail.club} />
                    <DetailField label="Handicap Index" value={detail.handicap_index} />
                    <DetailField label="WAGR Ranking" value={detail.wagr} />
                    {detail.wagr_url && (
                      <div className="flex flex-col gap-0.5 py-2">
                        <span className="text-xs text-muted-foreground uppercase tracking-wide">WAGR Profile</span>
                        <a
                          href={detail.wagr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline truncate"
                        >
                          View Profile →
                        </a>
                      </div>
                    )}
                  </div>
                </section>

                {/* Golf Resume */}
                {detail.golf_resume && (
                  <section>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Golf Resume
                    </h3>
                    <div className="rounded-lg border p-4">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {detail.golf_resume}
                      </p>
                    </div>
                  </section>
                )}

                {/* Resume file */}
                {detail.resume_file_url && (
                  <a
                    href={detail.resume_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    Download Resume File →
                  </a>
                )}

                {/* Submission meta */}
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Submission
                  </h3>
                  <div className="rounded-lg border divide-y divide-border/30 px-4">
                    <DetailField label="Received" value={formatDateTime(detail.created_at)} />
                    <DetailField
                      label="Policy Agreement"
                      value={detail.agree_policy ? "Agreed" : "Not indicated"}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
