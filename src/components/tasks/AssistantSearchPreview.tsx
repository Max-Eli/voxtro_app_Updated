import { useState, useRef, useEffect } from "react";
import { Search, Bot, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VoiceAssistant {
  id: string;
  name: string | null;
  org_id: string | null;
}

interface VoiceConnection {
  id: string;
  org_id: string | null;
  org_name: string | null;
}

interface AssistantSearchPreviewProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  assistants: VoiceAssistant[];
  connections: VoiceConnection[];
  onAssistantSelect?: (assistant: VoiceAssistant) => void;
}

export const AssistantSearchPreview = ({
  searchQuery,
  onSearchChange,
  assistants,
  connections,
  onAssistantSelect,
}: AssistantSearchPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "No Organization";
    const connection = connections.find((c) => c.org_id === orgId);
    return connection?.org_name || orgId;
  };

  // Filter assistants based on search query
  const matchingAssistants = searchQuery.trim()
    ? assistants.filter((assistant) =>
        (assistant.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show dropdown when there's a search query and matching assistants
  useEffect(() => {
    if (searchQuery.trim() && matchingAssistants.length > 0 && isFocused) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchQuery, matchingAssistants.length, isFocused]);

  const handleAssistantClick = (assistant: VoiceAssistant) => {
    onSearchChange(assistant.name || "");
    setIsOpen(false);
    if (onAssistantSelect) {
      onAssistantSelect(assistant);
    }
  };

  const clearSearch = () => {
    onSearchChange("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search tasks or assistants..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        className="pl-10 pr-10"
      />
      {searchQuery && (
        <button
          onClick={clearSearch}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Preview Dropdown */}
      {isOpen && matchingAssistants.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[300px] overflow-auto">
          <div className="p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
              Matching Voice Assistants
            </p>
            {matchingAssistants.map((assistant) => (
              <button
                key={assistant.id}
                onClick={() => handleAssistantClick(assistant)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                )}
              >
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {assistant.name || "Unnamed Assistant"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getOrgName(assistant.org_id)}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  Assistant
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};