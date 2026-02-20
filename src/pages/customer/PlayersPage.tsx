// PlayersPage: manages player roster, CSV import, and invitations
import { useState, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  playerInvitationsApi,
  type Player,
  type PlayerImportRow,
} from "@/integrations/api/endpoints/playerInvitations";

// ---- Field mapping config ----

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

const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

/** Auto-detect a CSV column header to the best-matching portal field */
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
    year:  "numeric",
    month: "short",
    day:   "numeric",
  });
}

// ---- Main Component ----

export default function PlayersPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV import state
  const [csvHeaders, setCsvHeaders]       = useState<string[]>([]);
  const [csvRows, setCsvRows]             = useState<Record<string, string>[]>([]);
  const [fieldMapping, setFieldMapping]   = useState<Record<string, string>>({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Players list query
  const { data, isLoading } = useQuery({
    queryKey: ["players"],
    queryFn:  () => playerInvitationsApi.listPlayers(),
  });
  const players: Player[] = data?.players ?? [];

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (rows: PlayerImportRow[]) =>
      playerInvitationsApi.importPlayers(rows),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      setShowMappingDialog(false);
      setCsvHeaders([]);
      setCsvRows([]);
      setFieldMapping({});
      toast.success(`${result.imported} player(s) imported successfully.`);
    },
    onError: (err: Error) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header:         true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows    = results.data;

        if (headers.length === 0) {
          toast.error("The CSV file has no column headers.");
          return;
        }

        // Auto-detect field mapping
        const autoMapping: Record<string, string> = {};
        for (const h of headers) {
          autoMapping[h] = autoDetectField(h);
        }

        setCsvHeaders(headers);
        setCsvRows(rows);
        setFieldMapping(autoMapping);
        setShowMappingDialog(true);
      },
      error: () => {
        toast.error("Could not parse the CSV file. Please check the format.");
      },
    });

    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  // Preview: first 5 rows, only mapped (non-skip) columns
  const previewRows   = csvRows.slice(0, 5);
  const mappedColumns = Object.entries(fieldMapping).filter(
    ([, v]) => v !== "__skip__"
  );

  function handleConfirmImport() {
    // Validate that first_name and last_name are mapped
    const mappedValues = Object.values(fieldMapping);
    if (!mappedValues.includes("first_name") || !mappedValues.includes("last_name")) {
      toast.error("You must map at least First Name and Last Name before importing.");
      return;
    }

    // Build import rows from all CSV data
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
          } else if (
            portalField === "birth_year" ||
            portalField === "birth_month" ||
            portalField === "birth_day"
          ) {
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
          typeof r.first_name === "string" &&
          r.first_name.trim().length > 0 &&
          typeof r.last_name === "string" &&
          r.last_name.trim().length > 0
      );

    if (rowsToImport.length === 0) {
      toast.error(
        "No valid rows found. Make sure First Name and Last Name are present."
      );
      return;
    }

    importMutation.mutate(rowsToImport);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Players</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All accepted players and CSV-imported players.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No players yet.</p>
          <p className="text-sm mt-1">
            Accept invitation requests or use Import CSV to add players.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Handicap</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Access Code</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.first_name} {p.last_name}
                  </TableCell>
                  <TableCell>
                    {p.division
                      ? (DIVISION_LABELS[p.division] ?? p.division)
                      : "—"}
                  </TableCell>
                  <TableCell>{p.club ?? "—"}</TableCell>
                  <TableCell>
                    {p.handicap_index !== null && p.handicap_index !== undefined
                      ? p.handicap_index
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.source === "invitation" ? "default" : "secondary"
                      }
                    >
                      {p.source === "invitation" ? "Invitation" : "CSV Import"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.access_code ? (
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-wider">
                        {p.access_code}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ---- CSV Field Mapping Dialog ---- */}
      <Dialog
        open={showMappingDialog}
        onOpenChange={(open) => {
          if (!open && !importMutation.isPending) {
            setShowMappingDialog(false);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map CSV Fields</DialogTitle>
            <DialogDescription>
              {csvRows.length} row{csvRows.length !== 1 ? "s" : ""} detected.
              Map each CSV column to the matching portal field, or skip it.
            </DialogDescription>
          </DialogHeader>

          {/* Mapping grid */}
          <div className="my-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-2 border-b">
              <span>CSV Column</span>
              <span>Portal Field</span>
            </div>
            {csvHeaders.map((header) => (
              <div
                key={header}
                className="grid grid-cols-2 gap-4 items-center"
              >
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded truncate">
                  {header}
                </span>
                <Select
                  value={fieldMapping[header] ?? "__skip__"}
                  onValueChange={(val) =>
                    setFieldMapping((prev) => ({ ...prev, [header]: val }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PORTAL_FIELDS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          {mappedColumns.length > 0 && previewRows.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold mb-2">
                Preview — first {previewRows.length} row
                {previewRows.length !== 1 ? "s" : ""}
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-muted">
                      {mappedColumns.map(([, portalField]) => (
                        <th
                          key={portalField}
                          className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                        >
                          {portalField}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        {mappedColumns.map(([csvCol, portalField]) => (
                          <td
                            key={portalField}
                            className="px-3 py-1.5 max-w-[160px] truncate"
                          >
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
            <Button
              onClick={handleConfirmImport}
              disabled={importMutation.isPending}
            >
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
