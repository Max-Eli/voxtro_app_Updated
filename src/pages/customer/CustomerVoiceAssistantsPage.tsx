import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Phone, Clock, Calendar, FileText, Headphones, TrendingUp, Search } from "lucide-react";
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

  const fetchData = async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      const { data: assignments, error: assignmentsError } = await supabase
        .from('customer_assistant_assignments')
        .select('assistant_id')
        .eq('customer_id', customer.id);

      if (assignmentsError) throw assignmentsError;

      if (!assignments || assignments.length === 0) {
        setLoading(false);
        return;
      }

      const assistantIds = assignments.map(a => a.assistant_id);

      const { data: assistantData, error: assistantError } = await supabase
        .from('voice_assistants')
        .select('*')
        .in('id', assistantIds);

      if (assistantError) throw assistantError;

      const { data: callData, error: callsError } = await supabase
        .from('voice_assistant_calls')
        .select('*')
        .in('assistant_id', assistantIds)
        .order('started_at', { ascending: false });

      if (callsError) throw callsError;
      const calls = callData || [];

      const callIds = calls.map(c => c.id);
      const { data: recordings } = await supabase
        .from('voice_assistant_recordings')
        .select('call_id, recording_url')
        .in('call_id', callIds);

      const recordingMap = new Map(recordings?.map(r => [r.call_id, r.recording_url]) || []);

      const assistantsWithStats = assistantData.map(assistant => {
        const assistantCalls = calls.filter(c => c.assistant_id === assistant.id);
        // Only count calls with valid duration for accurate averages
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

      setAssistants(assistantsWithStats);

      const formattedCalls = calls.map(call => {
        const assistant = assistantData.find(a => a.id === call.assistant_id);
        return {
          ...call,
          assistant_name: assistant?.name || 'Unknown',
          assistant_id: call.assistant_id,
          recording_url: recordingMap.get(call.id),
        };
      });

      setCallLogs(formattedCalls);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load voice assistant data",
        variant: "destructive",
      });
    } finally {
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
