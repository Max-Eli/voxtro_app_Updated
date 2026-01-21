import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Bot, Mic2, ChevronRight, History, FileText, Sparkles, RefreshCw, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChangelogTimeline } from "@/components/ChangelogTimeline";
import { AddChangelogEntry } from "@/components/AddChangelogEntry";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

interface ChangelogEntry {
  id: string;
  user_id: string;
  entity_type: 'chatbot' | 'voice_assistant';
  entity_id: string;
  change_type: 'update' | 'create' | 'delete' | 'note' | 'task';
  title: string;
  description: string | null;
  previous_values: Record<string, any>;
  new_values: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | null;
  source: 'manual' | 'auto' | 'vapi_sync';
  created_at: string;
  updated_at: string;
}

interface Entity {
  id: string;
  name: string;
  org_id?: string | null;
}

// Quick inline add component - for voice assistants, adds to voice_assistant_tasks table
const QuickAddEntry = ({ 
  entityType, 
  entityId, 
  entityName,
  orgId,
  onEntryAdded 
}: { 
  entityType: 'chatbot' | 'voice_assistant';
  entityId: string;
  entityName: string;
  orgId?: string | null;
  onEntryAdded: () => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !user) return;

    setIsSubmitting(true);
    try {
      if (entityType === 'voice_assistant') {
        // Insert into BOTH tables so it shows on both Tasks page AND Changelog page
        const [tasksResult, changelogResult] = await Promise.all([
          supabase.from('voice_assistant_tasks').insert({
            user_id: user.id,
            assistant_id: entityId,
            org_id: orgId || null,
            title: title.trim(),
            priority: 'medium',
            status: 'pending',
          }),
          supabase.from('changelog_entries').insert({
            user_id: user.id,
            entity_type: entityType,
            entity_id: entityId,
            change_type: 'update',
            title: title.trim(),
            status: 'pending',
            source: 'manual',
          })
        ]);
        if (tasksResult.error) throw tasksResult.error;
        if (changelogResult.error) throw changelogResult.error;
      } else {
        // For chatbots, use changelog_entries
        const { error } = await supabase.from('changelog_entries').insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
          change_type: 'update',
          title: title.trim(),
          status: 'pending',
          source: 'manual',
        });
        if (error) throw error;
      }
      
      setTitle("");
      toast({ title: `Task added for ${entityName}` });
      onEntryAdded();
    } catch (error) {
      console.error("Error creating entry:", error);
      toast({ title: "Failed to create task", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg border border-border">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a task and press Enter..."
        disabled={isSubmitting}
        className="flex-1 bg-background"
      />
      <Button 
        type="submit" 
        size="sm" 
        disabled={isSubmitting || !title.trim()}
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};

export default function Changelog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entityType, setEntityType] = useState<'chatbot' | 'voice_assistant'>('chatbot');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [changeTypeFilter, setChangeTypeFilter] = useState<string>('all');
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [chatbots, setChatbots] = useState<Entity[]>([]);
  const [voiceAssistants, setVoiceAssistants] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchActiveConnection();
    fetchChatbots();
  }, [user]);

  // Fetch voice assistants when org changes
  useEffect(() => {
    if (user && activeOrgId !== null && entityType === 'voice_assistant') {
      fetchVoiceAssistants();
    }
  }, [user, activeOrgId, entityType]);

  const fetchActiveConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_connections')
        .select('org_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setActiveOrgId(data?.org_id || '');
    } catch (error) {
      console.error('Error fetching active connection:', error);
      setActiveOrgId('');
    }
  };

  const fetchChatbots = async () => {
    const { data } = await supabase.from('chatbots').select('id, name').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (data) setChatbots(data);
  };

  const fetchVoiceAssistants = async () => {
    let query = supabase.from('voice_assistants').select('id, name, org_id, created_at').eq('user_id', user?.id).order('created_at', { ascending: false });
    
    if (activeOrgId) {
      query = query.eq('org_id', activeOrgId);
    }
    
    const { data } = await query;
    if (data) {
      setVoiceAssistants(data.map(a => ({ id: a.id, name: a.name || 'Unnamed Assistant', org_id: a.org_id })));
    }
  };

  const handleOrgSwitch = async () => {
    setSelectedEntityId(null);
    await fetchActiveConnection();
    // Auto-sync after switching orgs
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-voice-assistants', {
        method: 'POST'
      });
      if (error) throw error;
      toast({ title: `Synced ${data.count} assistants` });
    } catch (error) {
      console.error('Error syncing assistants:', error);
      toast({ title: "Failed to sync assistants", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  // Auto-select first entity when data loads
  useEffect(() => {
    const currentEntities = entityType === 'chatbot' ? chatbots : voiceAssistants;
    if (currentEntities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(currentEntities[0].id);
    }
  }, [chatbots, voiceAssistants, entityType, selectedEntityId]);

  useEffect(() => {
    if (!user || !selectedEntityId) return;
    
    const fetchEntries = async () => {
      setLoading(true);
      let query = supabase
        .from('changelog_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', selectedEntityId)
        .order('created_at', { ascending: false });
      
      if (changeTypeFilter !== 'all') {
        query = query.eq('change_type', changeTypeFilter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        toast({ title: "Error fetching changelog", description: error.message, variant: "destructive" });
      } else {
        setEntries((data || []) as ChangelogEntry[]);
      }
      setLoading(false);
    };
    
    fetchEntries();
  }, [user, entityType, selectedEntityId, changeTypeFilter]);

  const currentEntities = entityType === 'chatbot' ? chatbots : voiceAssistants;
  const selectedEntity = currentEntities.find(e => e.id === selectedEntityId);

  const getEntryCount = (entityId: string) => {
    return entries.filter(e => e.entity_id === entityId).length;
  };

  const handleEntryAdded = async () => {
    // Refetch entries from database
    if (!user || !selectedEntityId) return;
    
    let query = supabase
      .from('changelog_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('entity_type', entityType)
      .eq('entity_id', selectedEntityId)
      .order('created_at', { ascending: false });
    
    if (changeTypeFilter !== 'all') {
      query = query.eq('change_type', changeTypeFilter);
    }
    
    const { data } = await query;
    if (data) {
      setEntries(data as ChangelogEntry[]);
    }
  };

  const handleStatusChange = async (entryId: string, newStatus: string) => {
    const { error } = await supabase
      .from('changelog_entries')
      .update({ status: newStatus })
      .eq('id', entryId);
    
    if (error) {
      toast({ title: "Error updating status", variant: "destructive" });
    } else {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: newStatus as any } : e));
      toast({ title: "Status updated" });
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('changelog_entries')
      .delete()
      .eq('id', entryId);
    
    if (error) {
      toast({ title: "Error deleting entry", variant: "destructive" });
    } else {
      setEntries(prev => prev.filter(e => e.id !== entryId));
      toast({ title: "Entry deleted" });
    }
  };

  const handleEntityTypeChange = (type: 'chatbot' | 'voice_assistant') => {
    setEntityType(type);
    setSelectedEntityId(null);
    if (type === 'voice_assistant') {
      fetchVoiceAssistants();
    }
  };

  const filterButtons = [
    { value: 'all', label: 'All', icon: History },
    { value: 'update', label: 'Updates', icon: Sparkles },
    { value: 'note', label: 'Notes', icon: FileText },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Entity List */}
        <div className="w-72 border-r border-border bg-muted/30 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Changelog</h1>
            </div>
            
            {/* Entity Type Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden mb-3">
              <button
                onClick={() => handleEntityTypeChange('chatbot')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  entityType === 'chatbot' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                Chatbots
              </button>
              <button
                onClick={() => handleEntityTypeChange('voice_assistant')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                  entityType === 'voice_assistant' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted'
                }`}
              >
                <Mic2 className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>

            {/* Organization Switcher (only for voice assistants) */}
            {entityType === 'voice_assistant' && (
              <div className="flex items-center gap-2">
                <OrganizationSwitcher onSwitch={handleOrgSwitch} compact />
                {syncing && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
            
            {/* Search Bar */}
            <div className="relative mt-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${entityType === 'chatbot' ? 'chatbots' : 'assistants'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Entity List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {(() => {
                const filteredEntities = currentEntities.filter(e => 
                  e.name?.toLowerCase().includes(searchQuery.toLowerCase())
                );
                
                if (filteredEntities.length === 0) {
                  return (
                    <div className="text-center py-8 px-4">
                      {entityType === 'chatbot' ? (
                        <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      ) : (
                        <Mic2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      )}
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No matching results' : `No ${entityType === 'chatbot' ? 'chatbots' : 'assistants'} found`}
                      </p>
                    </div>
                  );
                }
                
                return filteredEntities.map((entity) => {
                  const isSelected = selectedEntityId === entity.id;
                  
                  return (
                    <button
                      key={entity.id}
                      onClick={() => setSelectedEntityId(entity.id)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : ''}`}>
                            {entity.name}
                          </p>
                        </div>
                        {isSelected && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </ScrollArea>

          {/* Sidebar Footer */}
          {currentEntities.length > 0 && (
            <div className="p-3 border-t border-border bg-background/50">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{currentEntities.length} {entityType === 'chatbot' ? 'chatbots' : 'assistants'}</span>
                <span>{entries.length} entries</span>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - Timeline */}
        <div className="flex-1 overflow-auto">
          {selectedEntity ? (
            <div className="p-6 max-w-3xl">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    {entityType === 'chatbot' ? (
                      <Bot className="h-6 w-6 text-primary" />
                    ) : (
                      <Mic2 className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{selectedEntity.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {entries.length} changelog {entries.length === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowAddModal(true)} size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  More Options
                </Button>
              </div>

              {/* Quick Add Task Inline */}
              <QuickAddEntry
                entityType={entityType}
                entityId={selectedEntityId!}
                entityName={selectedEntity.name}
                orgId={selectedEntity.org_id}
                onEntryAdded={handleEntryAdded}
              />

              {/* Filter Pills */}
              <div className="flex items-center gap-2 mb-6">
                {filterButtons.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setChangeTypeFilter(filter.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      changeTypeFilter === filter.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <Separator className="mb-6" />

              {/* Timeline */}
              <ChangelogTimeline
                entries={entries}
                loading={loading}
                entities={currentEntities}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteEntry}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select an item to view its changelog</p>
              </div>
            </div>
          )}
        </div>

        {/* Add Entry Modal */}
        <AddChangelogEntry
          open={showAddModal}
          onOpenChange={setShowAddModal}
          entityType={entityType}
          entities={currentEntities}
          onEntryAdded={handleEntryAdded}
          preSelectedEntityId={selectedEntityId}
        />
      </div>
    </DashboardLayout>
  );
}
