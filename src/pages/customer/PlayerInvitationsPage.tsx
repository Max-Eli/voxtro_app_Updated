import { useState } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  playerInvitationsApi,
  type PlayerInvitation,
  type InvitationStatus,
} from "@/integrations/api/endpoints/playerInvitations";

// ---- Helpers ----

const DIVISION_LABELS: Record<string, string> = {
  mens:   "Men's",
  womens: "Women's",
  senior: "Senior/Mid-Master",
};

const STATUS_VARIANTS: Record<
  InvitationStatus,
  "default" | "secondary" | "destructive"
> = {
  pending:  "secondary",
  accepted: "default",
  declined: "destructive",
};

function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "short",
    day:   "numeric",
    hour:  "2-digit",
    minute:"2-digit",
  });
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{String(value)}</span>
    </div>
  );
}

// ---- Main Component ----

export default function PlayerInvitationsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // List all invitations
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
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["player-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["player-invitation", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(
        `Player accepted! Access code: ${result.access_code}` +
          (result.email_sent ? " — Acceptance email sent." : " — Email sending failed.")
      );
    },
    onError: (err: Error) => {
      toast.error(`Accept failed: ${err.message}`);
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: (id: string) => playerInvitationsApi.declineInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["player-invitation", selectedId] });
      toast.success("Invitation declined.");
    },
    onError: (err: Error) => {
      toast.error(`Decline failed: ${err.message}`);
    },
  });

  const isActing = acceptMutation.isPending || declineMutation.isPending;
  const isPending = detail?.status === "pending";

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Player Invitations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and manage invitation requests submitted through the tournament website.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {invitations.length} total
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">No invitation requests yet.</p>
          <p className="text-sm mt-1">
            Requests submitted through the tournament website will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedId(inv.id)}
                >
                  <TableCell className="font-medium">
                    {inv.first_name} {inv.last_name}
                  </TableCell>
                  <TableCell>
                    {DIVISION_LABELS[inv.division] ?? inv.division}
                  </TableCell>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(inv.created_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ---- Detail Side Drawer ---- */}
      <Sheet
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <SheetContent className="w-[480px] sm:w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invitation Request</SheetTitle>
          </SheetHeader>

          {isDetailLoading || !detail ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {/* Status + code */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={detail.status} />
                {detail.access_code && (
                  <span className="font-mono text-sm bg-muted px-3 py-1 rounded-md tracking-wider">
                    {detail.access_code}
                  </span>
                )}
              </div>

              {/* Personal info */}
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Personal Information
                </p>
                <DetailRow label="First Name" value={detail.first_name} />
                <DetailRow label="Last Name"  value={detail.last_name} />
                <DetailRow label="Email"      value={detail.email} />
                <DetailRow label="Phone"      value={detail.phone} />
                <DetailRow label="Division"   value={DIVISION_LABELS[detail.division] ?? detail.division} />
                <DetailRow
                  label="Date of Birth"
                  value={
                    detail.birth_month && detail.birth_day && detail.birth_year
                      ? `${detail.birth_month}/${detail.birth_day}/${detail.birth_year}`
                      : undefined
                  }
                />
              </div>

              {/* Address */}
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Mailing Address
                </p>
                <DetailRow label="Street"  value={detail.street_address} />
                <DetailRow label="City"    value={detail.city} />
                <DetailRow label="State"   value={detail.state} />
                <DetailRow label="Country" value={detail.country} />
                <DetailRow label="ZIP"     value={detail.zip} />
              </div>

              {/* Golf profile */}
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Golf Profile
                </p>
                <DetailRow label="Primary Club"    value={detail.club} />
                <DetailRow label="Handicap Index"  value={detail.handicap_index} />
                <DetailRow label="Shirt Size"      value={detail.shirt_size} />
                <DetailRow label="WAGR Ranking"    value={detail.wagr} />
                {detail.wagr_url && (
                  <div className="grid grid-cols-2 gap-2 py-1.5">
                    <span className="text-sm text-muted-foreground">WAGR Profile</span>
                    <a
                      href={detail.wagr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline truncate"
                    >
                      View Profile
                    </a>
                  </div>
                )}
              </div>

              {/* Golf resume text */}
              {detail.golf_resume && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Golf Resume
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {detail.golf_resume}
                  </p>
                </div>
              )}

              {/* Resume file download */}
              {detail.resume_file_url && (
                <div>
                  <a
                    href={detail.resume_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Download Resume File
                  </a>
                </div>
              )}

              {/* Accept / Decline buttons — only for pending invitations */}
              {isPending && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => acceptMutation.mutate(detail.id)}
                    disabled={isActing}
                  >
                    {acceptMutation.isPending ? "Accepting…" : "Accept Player"}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => declineMutation.mutate(detail.id)}
                    disabled={isActing}
                  >
                    {declineMutation.isPending ? "Declining…" : "Decline"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
