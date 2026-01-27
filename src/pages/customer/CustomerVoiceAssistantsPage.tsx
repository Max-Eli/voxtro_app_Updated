import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { fetchVapiCalls } from "@/integrations/api/endpoints/voice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Phone, Clock, Calendar, FileText, Headphones, TrendingUp, Search, Sparkles, CheckCircle, AlertCircle, Target, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { EmptyAgentState } from "@/components/customer/EmptyAgentState";

interface AssistantWithDetails {
  id: string;
  name: string;
  first_message: string;
  totalCalls: number;
  completedCalls: number;
  totalDuration: number;
  avgDuration: number;
}

interface CallLog {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  status: string;
  call_type: string;
  assistant_name: string;
  assistant_id: string;
  recording_url?: string;
  phone_number?: string;
  // AI Summary fields
  summary?: string;
  key_points?: string[];
  action_items?: string[];
  sentiment?: string;
  sentiment_notes?: string;
  call_outcome?: string;
  topics_discussed?: string[];
  lead_info?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    interest_level?: string;
    notes?: string;
  };
}

interface Transcript {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

export default function CustomerVoiceAssistantsPage() {
  const { customer } = useCustomerAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assistants, setAssistants] = useState<AssistantWithDetails[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [showCallDetail, setShowCallDetail] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [phoneSearch, setPhoneSearch] = useState("");

  useEffect(() => {
    if (customer) {
      fetchData();
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) return;

    const callsChannel = supabase
      .channel('voice-calls-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_assistant_calls',
          filter: `customer_id=eq.${customer.id}`
        },
        (payload) => {
          console.log('Call log changed:', payload);
          fetchData();
        }
      )
      .subscribe();

    const transcriptsChannel = supabase
      .channel('voice-transcripts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_assistant_transcripts'
        },
        (payload) => {
          console.log('New transcript:', payload);
          if (selectedCall && payload.new.call_id === selectedCall.id) {
            loadTranscript(selectedCall.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsChannel);
      supabase.removeChannel(transcriptsChannel);
    };
  }, [customer, selectedCall]);

  // Background sync function - syncs from VAPI without blocking UI
  const syncFromVapi = async (assistantIds: string[]) => {
    for (const assistantId of assistantIds) {
      try {
        const syncResult = await fetchVapiCalls(assistantId);
        console.log(`VAPI sync for ${assistantId}:`, {
          assistant: syncResult.data?.assistant_name,
          org: syncResult.data?.vapi_org_name,
          matchedId: syncResult.data?.matched_vapi_id,
          callsSynced: syncResult.data?.synced_count,
          totalCalls: syncResult.data?.total_from_vapi
        });
      } catch (syncError) {
        console.log('VAPI sync error for assistant', assistantId, syncError);
      }
    }
    // Refresh data after sync completes
    await loadCachedData();
  };

  // Load data from database (fast - shows cached data immediately)
  const loadCachedData = async (): Promise<string[]> => {
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('customer_assistant_assignments')
        .select('assistant_id')
        .eq('customer_id', customer.id);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setAssistants([]);
        setCallLogs([]);
        setLoading(false);
        setRefreshing(false);
        return [];
      }

      const assistantIds = assignments.map(a => a.assistant_id);

      const { data: assistantData, error: assistantError } = await supabase
        .from('voice_assistants')
        .select('*')
        .in('id', assistantIds);

      if (assistantError) throw assistantError;

      const { data: callData, error: callsError } = await supabase
        .from('voice_assistant_calls')
        .select('*, summary, key_points, action_items, sentiment, sentiment_notes, call_outcome, topics_discussed, lead_info')
        .in('assistant_id', assistantIds)
        .order('started_at', { ascending: false });

      if (callsError) throw callsError;
      const calls = callData || [];

      const callIds = calls.map(c => c.id);
      const { data: recordings } = callIds.length > 0
        ? await supabase
            .from('voice_assistant_recordings')
            .select('call_id, recording_url')
            .in('call_id', callIds)
        : { data: [] };

      const recordingMap = new Map(recordings?.map(r => [r.call_id, r.recording_url]) || []);

      // Build assistant stats
      const assistantsWithStats = (assistantData || []).map(assistant => {
        const assistantCalls = calls.filter(c => c.assistant_id === assistant.id);
        const callsWithDuration = assistantCalls.filter(c => c.duration_seconds != null && c.duration_seconds > 0);
        const totalDuration = callsWithDuration.reduce((sum, call) => sum + (call.duration_seconds || 0), 0);
        const completedCalls = assistantCalls.filter(c => c.status === 'completed' || c.ended_at != null).length;

        return {
          id: assistant.id,
          name: assistant.name || 'Unnamed Assistant',
          first_message: assistant.first_message || '',
          totalCalls: assistantCalls.length,
          completedCalls,
          totalDuration,
          avgDuration: callsWithDuration.length > 0 ? Math.round(totalDuration / callsWithDuration.length) : 0,
        };
      });

      // Format call logs
      const formattedCalls = calls.map(call => {
        const assistant = (assistantData || []).find(a => a.id === call.assistant_id);
        return {
          ...call,
          assistant_name: assistant?.name || 'Unknown',
          assistant_id: call.assistant_id,
          recording_url: recordingMap.get(call.id),
        };
      });

      setAssistants(assistantsWithStats);
      setCallLogs(formattedCalls);
      setLoading(false);
      setRefreshing(false);

      return assistantIds;
    } catch (error) {
      console.error('Error loading cached data:', error);
      setLoading(false);
      setRefreshing(false);
      return [];
    }
  };

  const fetchData = async () => {
    if (refreshing) return;

    try {
      setRefreshing(true);

      // Step 1: Load cached data immediately (fast - no VAPI calls)
      const assistantIds = await loadCachedData();

      // Step 2: Sync from VAPI in background (slow - don't block UI)
      if (assistantIds.length > 0) {
        // Don't await - let it run in background and refresh when done
        syncFromVapi(assistantIds);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load voice assistants",
        variant: "destructive",
      });
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTranscript = async (callId: string) => {
    setLoadingTranscript(true);
    try {
      const { data, error } = await supabase
        .from('voice_assistant_transcripts')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setTranscripts(data || []);
    } catch (error) {
      console.error('Error loading transcript:', error);
      toast({
        title: "Error",
        description: "Failed to load transcript",
        variant: "destructive",
      });
    } finally {
      setLoadingTranscript(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (assistants.length === 0) {
    return <EmptyAgentState type="voice" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Voice Assistants</h1>
            <p className="text-muted-foreground">
              View analytics, call history, and transcripts for your voice assistants
            </p>
          </div>
          {refreshing && (
            <Badge variant="secondary" className="animate-pulse">
              Updating...
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assistants.reduce((sum, a) => sum + a.totalCalls, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all assistants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Calls</CardTitle>
            <Phone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assistants.reduce((sum, a) => sum + a.completedCalls, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(assistants.reduce((sum, a) => sum + a.totalDuration, 0))}
            </div>
            <p className="text-xs text-muted-foreground">Combined talk time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Call Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalDuration = assistants.reduce((sum, a) => sum + a.totalDuration, 0);
                const completedCalls = assistants.reduce((sum, a) => sum + a.completedCalls, 0);
                return completedCalls > 0 ? formatDuration(Math.round(totalDuration / completedCalls)) : '0m 0s';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Per completed call</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Voice Assistants</CardTitle>
          <CardDescription>Overview of your assigned assistants and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assistants.map((assistant) => (
              <div key={assistant.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium">{assistant.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{assistant.first_message}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold">{assistant.totalCalls}</p>
                    <p className="text-xs text-muted-foreground">Total Calls</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatDuration(assistant.totalDuration)}</p>
                    <p className="text-xs text-muted-foreground">Total Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{formatDuration(assistant.avgDuration)}</p>
                    <p className="text-xs text-muted-foreground">Avg Duration</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Call History</CardTitle>
              <CardDescription>Complete history of all voice assistant calls</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by phone number..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredCalls = callLogs.filter(call => 
              !phoneSearch || 
              (call.phone_number && call.phone_number.toLowerCase().includes(phoneSearch.toLowerCase()))
            );
            
            if (filteredCalls.length === 0) {
              return (
                <p className="text-center text-muted-foreground py-8">
                  {phoneSearch ? 'No calls match your search' : 'No calls recorded yet'}
                </p>
              );
            }
            
            return (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredCalls.map((call) => (
                    <div
                      key={call.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCall(call);
                        loadTranscript(call.id);
                        setShowCallDetail(true);
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{call.assistant_name}</h4>
                          <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                            {call.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(call.started_at), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(call.started_at), 'h:mm a')}
                          </span>
                          <span>
                            Duration: {call.duration_seconds != null && call.ended_at 
                              ? formatDuration(call.duration_seconds) 
                              : 'N/A'}
                          </span>
                          {call.phone_number && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {call.phone_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            );
          })()}
        </CardContent>
      </Card>

      <Sheet open={showCallDetail} onOpenChange={setShowCallDetail}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Call Details</SheetTitle>
            <SheetDescription>
              {selectedCall && (
                <div className="text-sm space-y-1 mt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(selectedCall.started_at), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selectedCall.started_at), 'h:mm a')}
                  </div>
                  {selectedCall.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {selectedCall.phone_number}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Duration: {selectedCall.duration_seconds != null && selectedCall.ended_at 
                      ? formatDuration(selectedCall.duration_seconds) 
                      : 'N/A'}
                  </div>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* AI Summary Section */}
            {selectedCall?.summary && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">AI Analysis</h3>
                </div>

                {/* Summary */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm">{selectedCall.summary}</p>
                </div>

                {/* Sentiment & Outcome */}
                <div className="flex flex-wrap gap-2">
                  {selectedCall.sentiment && (
                    <Badge variant={
                      selectedCall.sentiment === 'positive' ? 'default' :
                      selectedCall.sentiment === 'negative' ? 'destructive' : 'secondary'
                    }>
                      {selectedCall.sentiment === 'positive' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {selectedCall.sentiment === 'negative' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {selectedCall.sentiment.charAt(0).toUpperCase() + selectedCall.sentiment.slice(1)} Sentiment
                    </Badge>
                  )}
                  {selectedCall.call_outcome && (
                    <Badge variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {selectedCall.call_outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  )}
                </div>

                {/* Sentiment Notes */}
                {selectedCall.sentiment_notes && (
                  <p className="text-sm text-muted-foreground italic">
                    {selectedCall.sentiment_notes}
                  </p>
                )}

                {/* Key Points */}
                {selectedCall.key_points && selectedCall.key_points.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Key Points
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {selectedCall.key_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {selectedCall.action_items && selectedCall.action_items.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Action Items
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {selectedCall.action_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500 mt-1">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Topics Discussed */}
                {selectedCall.topics_discussed && selectedCall.topics_discussed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Topics Discussed</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedCall.topics_discussed.map((topic, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lead Info */}
                {selectedCall.lead_info && (selectedCall.lead_info.name || selectedCall.lead_info.email || selectedCall.lead_info.phone) && (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <h4 className="text-sm font-medium">Lead Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedCall.lead_info.name && (
                        <div>
                          <span className="text-muted-foreground">Name:</span> {selectedCall.lead_info.name}
                        </div>
                      )}
                      {selectedCall.lead_info.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span> {selectedCall.lead_info.email}
                        </div>
                      )}
                      {selectedCall.lead_info.phone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span> {selectedCall.lead_info.phone}
                        </div>
                      )}
                      {selectedCall.lead_info.company && (
                        <div>
                          <span className="text-muted-foreground">Company:</span> {selectedCall.lead_info.company}
                        </div>
                      )}
                      {selectedCall.lead_info.interest_level && (
                        <div>
                          <span className="text-muted-foreground">Interest:</span>{' '}
                          <Badge variant="outline" className="text-xs">
                            {selectedCall.lead_info.interest_level}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {selectedCall.lead_info.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedCall.lead_info.notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recording Section */}
            {selectedCall?.recording_url && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  <h3 className="font-semibold">Recording</h3>
                </div>
                <audio controls className="w-full" autoPlay>
                  <source src={selectedCall.recording_url} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Transcript Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Transcript</h3>
              </div>
              
              {loadingTranscript ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : transcripts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No transcript available for this call
                </p>
              ) : (
                <div className="space-y-4">
                  {transcripts.map((transcript) => (
                    <div
                      key={transcript.id}
                      className={`flex gap-3 ${
                        transcript.role === 'assistant' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          transcript.role === 'assistant'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {transcript.role === 'assistant' ? 'Assistant' : 'User'}
                        </p>
                        <p className="text-sm">{transcript.content}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {format(new Date(transcript.timestamp), 'h:mm:ss a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
