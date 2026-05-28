import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, ChevronRight } from "lucide-react";
import {
  contactMessagesApi,
  type ContactMessage,
} from "@/integrations/api/endpoints/contactMessages";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium break-words">{value || "—"}</span>
    </div>
  );
}

export default function CustomerContactMessagesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: () => contactMessagesApi.listMessages(),
  });
  const messages: ContactMessage[] = data?.messages ?? [];

  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openMessage = (m: ContactMessage) => {
    setSelected(m);
    setDrawerOpen(true);
  };

  return (
    <div className="-m-8 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b shrink-0 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Contact Messages</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Messages submitted through the Contact Us form on dixieamateur.com, newest first.
            </p>
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {isLoading
              ? "Loading…"
              : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
            <Mail className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium">No contact messages yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Submissions from the dixieamateur.com Contact Us form will appear here. Bot
              submissions are filtered out automatically.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((m) => (
                <TableRow
                  key={m.id}
                  className="cursor-pointer"
                  onClick={() => openMessage(m)}
                >
                  <TableCell className="font-medium">{m.name || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.email || "—"}</TableCell>
                  <TableCell className="text-sm">{m.subject || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Detail drawer ───────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={(v) => setDrawerOpen(v)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selected?.subject || "Contact message"}</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <Field label="Name" value={selected.name} />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Email</span>
                {selected.email ? (
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-sm font-medium text-primary hover:underline break-words"
                  >
                    {selected.email}
                  </a>
                ) : (
                  <span className="text-sm font-medium">—</span>
                )}
              </div>
              <Field label="Subject" value={selected.subject} />
              <Field label="Received" value={formatDateTime(selected.created_at)} />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Message</span>
                <p className="text-sm whitespace-pre-wrap break-words">{selected.message || "—"}</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
