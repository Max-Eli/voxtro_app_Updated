import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2, Phone, PhoneOff, Mic } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import Vapi from "@vapi-ai/web";

interface VoiceAssistant {
  id: string;
  name: string;
  first_message: string;
  voice_provider: string;
  voice_id: string;
  model_provider: string;
  model: string;
  transcriber_provider: string;
}

export default function EditVoiceAssistant() {
  const { assistantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistant, setAssistant] = useState<VoiceAssistant | null>(null);
  const vapiRef = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    firstMessage: "",
    firstMessageMode: "assistant-speaks-first",
    voiceProvider: "11labs",
    voiceId: "",
    voiceStability: 0.5,
    voiceSimilarityBoost: 0.75,
    voiceSpeed: 1.0,
    modelProvider: "openai",
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 250,
    emotionRecognitionEnabled: false,
    transcriberProvider: "deepgram",
    transcriberModel: "nova-2",
    transcriberLanguage: "en",
    silenceTimeoutSeconds: 30,
    responseDelaySeconds: 0.4,
    llmRequestDelaySeconds: 0.1,
    numWordsToInterruptAssistant: 3,
    maxDurationSeconds: 600,
    endCallMessage: "Thank you for calling. Goodbye!",
    endCallPhrases: [] as string[],
    recordingEnabled: false,
    hipaaEnabled: false,
    backchannelingEnabled: false,
    backgroundDenoisingEnabled: false,
    modelOutputInMessagesEnabled: false,
    voicemailDetectionEnabled: false,
    voicemailMessage: "",
    backgroundSound: "off",
  });

  useEffect(() => {
    fetchAssistant();
  }, [assistantId]);

  const fetchAssistant = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_assistants')
        .select('*')
        .eq('id', assistantId)
        .single();

      if (error) throw error;
      
      setAssistant(data);
      setFormData({
        name: data.name || "",
        firstMessage: data.first_message || "",
        firstMessageMode: "assistant-speaks-first",
        voiceProvider: data.voice_provider || "11labs",
        voiceId: data.voice_id || "",
        voiceStability: 0.5,
        voiceSimilarityBoost: 0.75,
        voiceSpeed: 1.0,
        modelProvider: data.model_provider || "openai",
        model: data.model || "gpt-4",
        temperature: 0.7,
        maxTokens: 250,
        emotionRecognitionEnabled: false,
        transcriberProvider: data.transcriber_provider || "deepgram",
        transcriberModel: "nova-2",
        transcriberLanguage: "en",
        silenceTimeoutSeconds: 30,
        responseDelaySeconds: 0.4,
        llmRequestDelaySeconds: 0.1,
        numWordsToInterruptAssistant: 3,
        maxDurationSeconds: 600,
        endCallMessage: "Thank you for calling. Goodbye!",
        endCallPhrases: [],
        recordingEnabled: false,
        hipaaEnabled: false,
        backchannelingEnabled: false,
        backgroundDenoisingEnabled: false,
        modelOutputInMessagesEnabled: false,
        voicemailDetectionEnabled: false,
        voicemailMessage: "",
        backgroundSound: "off",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Detect changes for changelog
      const fieldsToTrack = { name: 'name', firstMessage: 'first_message', voiceProvider: 'voice_provider', voiceId: 'voice_id', modelProvider: 'model_provider', model: 'model' };
      const previousValues: Record<string, any> = {};
      const newValues: Record<string, any> = {};
      
      if (assistant) {
        for (const [formKey, dbKey] of Object.entries(fieldsToTrack)) {
          const oldVal = (assistant as any)[dbKey];
          const newVal = (formData as any)[formKey];
          if (oldVal !== newVal) {
            previousValues[dbKey] = oldVal;
            newValues[dbKey] = newVal;
          }
        }
      }

      const updates: any = {
        name: formData.name,
        firstMessage: formData.firstMessage,
        firstMessageMode: formData.firstMessageMode,
        voice: {
          provider: formData.voiceProvider,
          voiceId: formData.voiceId,
        },
        model: {
          provider: formData.modelProvider,
          model: formData.model,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          emotionRecognitionEnabled: formData.emotionRecognitionEnabled,
        },
        transcriber: {
          provider: formData.transcriberProvider,
          model: formData.transcriberModel,
          language: formData.transcriberLanguage,
        },
        silenceTimeoutSeconds: formData.silenceTimeoutSeconds,
        responseDelaySeconds: formData.responseDelaySeconds,
        llmRequestDelaySeconds: formData.llmRequestDelaySeconds,
        numWordsToInterruptAssistant: formData.numWordsToInterruptAssistant,
        maxDurationSeconds: formData.maxDurationSeconds,
        endCallMessage: formData.endCallMessage,
        endCallPhrases: formData.endCallPhrases,
        recordingEnabled: formData.recordingEnabled,
        hipaaEnabled: formData.hipaaEnabled,
        backchannelingEnabled: formData.backchannelingEnabled,
        backgroundDenoisingEnabled: formData.backgroundDenoisingEnabled,
        modelOutputInMessagesEnabled: formData.modelOutputInMessagesEnabled,
        backgroundSound: formData.backgroundSound,
      };

      if (formData.voiceProvider === "11labs") {
        updates.voice.stability = formData.voiceStability;
        updates.voice.similarityBoost = formData.voiceSimilarityBoost;
      }

      if (formData.voiceProvider === "playht" || formData.voiceProvider === "rime-ai") {
        updates.voice.speed = formData.voiceSpeed;
      }

      if (formData.voicemailDetectionEnabled) {
        updates.voicemailDetection = {
          enabled: true,
          provider: "twilio",
        };
        updates.voicemailMessage = formData.voicemailMessage;
      }

      const { data, error } = await supabase.functions.invoke('update-voice-assistant', {
        body: { assistantId, updates }
      });

      if (error) throw error;

      // Create changelog entry if there were changes
      if (Object.keys(newValues).length > 0 && assistantId && user) {
        const changedFields = Object.keys(newValues).join(', ');
        await supabase.from('changelog_entries').insert({
          user_id: user.id,
          entity_type: 'voice_assistant',
          entity_id: assistantId,
          change_type: 'update',
          title: `Configuration updated: ${changedFields}`,
          description: `Updated settings for assistant "${formData.name}"`,
          previous_values: previousValues,
          new_values: newValues,
          status: null,
          source: 'auto',
        });
      }

      toast({
        title: "Success",
        description: "Voice assistant updated successfully",
      });

      navigate('/voice-assistants');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (isCallActive && vapiRef.current) {
      // End the call
      vapiRef.current.stop();
      setIsCallActive(false);
      setTesting(false);
      toast({
        title: "Call Ended",
        description: "Voice assistant test completed",
      });
      return;
    }

    setTesting(true);
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get Vapi public key from our edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('get-vapi-web-token');

      if (tokenError) throw tokenError;
      
      if (!tokenData?.publicKey) {
        throw new Error('No Vapi public key available. Please reconnect your Vapi account.');
      }

      // Initialize Vapi client with the public key
      if (!vapiRef.current) {
        vapiRef.current = new Vapi(tokenData.publicKey);
      }

      // Set up event listeners before starting the call
      vapiRef.current.on('call-start', () => {
        console.log('Call started');
        setIsCallActive(true);
        toast({
          title: "Call Started",
          description: "You're now connected to the voice assistant. Speak to test it!",
        });
      });

      vapiRef.current.on('call-end', () => {
        console.log('Call ended');
        setIsCallActive(false);
        setIsSpeaking(false);
        setTesting(false);
        toast({
          title: "Call Ended",
          description: "Voice assistant test completed",
        });
      });

      vapiRef.current.on('speech-start', () => {
        console.log('Assistant started speaking');
        setIsSpeaking(true);
      });

      vapiRef.current.on('speech-end', () => {
        console.log('Assistant stopped speaking');
        setIsSpeaking(false);
      });

      vapiRef.current.on('error', (error: any) => {
        console.error('Vapi error:', error);
        setIsCallActive(false);
        setTesting(false);
        toast({
          title: "Call Error",
          description: error.message || "An error occurred during the call",
          variant: "destructive",
        });
      });

      vapiRef.current.on('message', (message: any) => {
        console.log('Vapi message:', message);
      });

      // Start the call with the assistant ID
      await vapiRef.current.start(assistantId);

    } catch (error: any) {
      console.error('Test error:', error);
      setIsCallActive(false);
      setTesting(false);
      
      if (error.name === 'NotAllowedError') {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access to test the voice assistant",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to start test call. Make sure you have an active Vapi connection.",
          variant: "destructive",
        });
      }
    } finally {
      if (!isCallActive) {
        setTesting(false);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current && isCallActive) {
        vapiRef.current.stop();
      }
    };
  }, [isCallActive]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/voice-assistants')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Voice Assistant</h1>
              <p className="text-muted-foreground">Configure your Vapi assistant settings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={isCallActive ? "destructive" : "outline"} 
              onClick={handleTest} 
              disabled={testing && !isCallActive}
            >
              {testing && !isCallActive ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isCallActive ? (
                <PhoneOff className="h-4 w-4 mr-2" />
              ) : (
                <Phone className="h-4 w-4 mr-2" />
              )}
              {isCallActive ? "End Call" : "Test Assistant"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        {isCallActive && (
          <Card className="mb-6 border-primary bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Mic className={`h-5 w-5 ${isSpeaking ? 'text-muted-foreground' : 'text-primary'}`} />
                  {!isSpeaking && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {isSpeaking ? 'Assistant is speaking...' : 'Listening...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSpeaking ? 'The assistant is responding to you' : 'Speak now to interact with the assistant'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="model">Model</TabsTrigger>
            <TabsTrigger value="transcriber">Transcriber</TabsTrigger>
            <TabsTrigger value="call">Call Settings</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Configure the basic settings for your assistant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Assistant Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Assistant"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstMessage">First Message</Label>
                  <Textarea
                    id="firstMessage"
                    value={formData.firstMessage}
                    onChange={(e) => setFormData({ ...formData, firstMessage: e.target.value })}
                    placeholder="Hello! How can I help you today?"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstMessageMode">First Message Mode</Label>
                  <Select value={formData.firstMessageMode} onValueChange={(value) => setFormData({ ...formData, firstMessageMode: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assistant-speaks-first">Assistant Speaks First</SelectItem>
                      <SelectItem value="assistant-waits">Assistant Waits</SelectItem>
                      <SelectItem value="assistant-speaks-first-with-model-generated-message">AI Generated First Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voice" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Configuration</CardTitle>
                <CardDescription>Configure the voice settings for your assistant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voiceProvider">Voice Provider</Label>
                  <Select value={formData.voiceProvider} onValueChange={(value) => setFormData({ ...formData, voiceProvider: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11labs">ElevenLabs</SelectItem>
                      <SelectItem value="playht">PlayHT</SelectItem>
                      <SelectItem value="rime-ai">Rime AI</SelectItem>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voiceId">Voice ID</Label>
                  <Input
                    id="voiceId"
                    value={formData.voiceId}
                    onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                    placeholder="Enter voice ID"
                  />
                </div>
                {formData.voiceProvider === "11labs" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="voiceStability">Voice Stability: {formData.voiceStability}</Label>
                      <Input
                        id="voiceStability"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formData.voiceStability}
                        onChange={(e) => setFormData({ ...formData, voiceStability: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="voiceSimilarityBoost">Similarity Boost: {formData.voiceSimilarityBoost}</Label>
                      <Input
                        id="voiceSimilarityBoost"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formData.voiceSimilarityBoost}
                        onChange={(e) => setFormData({ ...formData, voiceSimilarityBoost: parseFloat(e.target.value) })}
                      />
                    </div>
                  </>
                )}
                {(formData.voiceProvider === "playht" || formData.voiceProvider === "rime-ai") && (
                  <div className="space-y-2">
                    <Label htmlFor="voiceSpeed">Voice Speed: {formData.voiceSpeed}</Label>
                    <Input
                      id="voiceSpeed"
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={formData.voiceSpeed}
                      onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="backgroundSound">Background Sound</Label>
                  <Select value={formData.backgroundSound} onValueChange={(value) => setFormData({ ...formData, backgroundSound: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="cafe">Cafe</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="model" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>AI Model Configuration</CardTitle>
                <CardDescription>Configure the language model settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="modelProvider">Model Provider</Label>
                  <Select value={formData.modelProvider} onValueChange={(value) => setFormData({ ...formData, modelProvider: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="together-ai">Together AI</SelectItem>
                      <SelectItem value="groq">Groq</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="gpt-4"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature: {formData.temperature}</Label>
                  <Input
                    id="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="emotionRecognition"
                    checked={formData.emotionRecognitionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, emotionRecognitionEnabled: checked })}
                  />
                  <Label htmlFor="emotionRecognition">Enable Emotion Recognition</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcriber" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transcriber Configuration</CardTitle>
                <CardDescription>Configure speech-to-text settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="transcriberProvider">Transcriber Provider</Label>
                  <Select value={formData.transcriberProvider} onValueChange={(value) => setFormData({ ...formData, transcriberProvider: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                      <SelectItem value="gladia">Gladia</SelectItem>
                      <SelectItem value="talkscriber">Talkscriber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transcriberModel">Model</Label>
                  <Input
                    id="transcriberModel"
                    value={formData.transcriberModel}
                    onChange={(e) => setFormData({ ...formData, transcriberModel: e.target.value })}
                    placeholder="nova-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transcriberLanguage">Language</Label>
                  <Input
                    id="transcriberLanguage"
                    value={formData.transcriberLanguage}
                    onChange={(e) => setFormData({ ...formData, transcriberLanguage: e.target.value })}
                    placeholder="en"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="call" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Call Settings</CardTitle>
                <CardDescription>Configure call behavior and timing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="silenceTimeout">Silence Timeout (seconds)</Label>
                  <Input
                    id="silenceTimeout"
                    type="number"
                    value={formData.silenceTimeoutSeconds}
                    onChange={(e) => setFormData({ ...formData, silenceTimeoutSeconds: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responseDelay">Response Delay (seconds)</Label>
                  <Input
                    id="responseDelay"
                    type="number"
                    step="0.1"
                    value={formData.responseDelaySeconds}
                    onChange={(e) => setFormData({ ...formData, responseDelaySeconds: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="llmRequestDelay">LLM Request Delay (seconds)</Label>
                  <Input
                    id="llmRequestDelay"
                    type="number"
                    step="0.1"
                    value={formData.llmRequestDelaySeconds}
                    onChange={(e) => setFormData({ ...formData, llmRequestDelaySeconds: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numWordsInterrupt">Words to Interrupt</Label>
                  <Input
                    id="numWordsInterrupt"
                    type="number"
                    value={formData.numWordsToInterruptAssistant}
                    onChange={(e) => setFormData({ ...formData, numWordsToInterruptAssistant: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxDuration">Max Call Duration (seconds)</Label>
                  <Input
                    id="maxDuration"
                    type="number"
                    value={formData.maxDurationSeconds}
                    onChange={(e) => setFormData({ ...formData, maxDurationSeconds: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endCallMessage">End Call Message</Label>
                  <Textarea
                    id="endCallMessage"
                    value={formData.endCallMessage}
                    onChange={(e) => setFormData({ ...formData, endCallMessage: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Features</CardTitle>
                <CardDescription>Enable or disable advanced features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="recording">Call Recording</Label>
                    <p className="text-sm text-muted-foreground">Record all calls for quality assurance</p>
                  </div>
                  <Switch
                    id="recording"
                    checked={formData.recordingEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, recordingEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="hipaa">HIPAA Compliance</Label>
                    <p className="text-sm text-muted-foreground">Enable HIPAA-compliant mode</p>
                  </div>
                  <Switch
                    id="hipaa"
                    checked={formData.hipaaEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, hipaaEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="backchanneling">Backchanneling</Label>
                    <p className="text-sm text-muted-foreground">Allow verbal acknowledgments during speech</p>
                  </div>
                  <Switch
                    id="backchanneling"
                    checked={formData.backchannelingEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, backchannelingEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="denoising">Background Denoising</Label>
                    <p className="text-sm text-muted-foreground">Reduce background noise</p>
                  </div>
                  <Switch
                    id="denoising"
                    checked={formData.backgroundDenoisingEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, backgroundDenoisingEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="modelOutput">Model Output in Messages</Label>
                    <p className="text-sm text-muted-foreground">Include model output in message logs</p>
                  </div>
                  <Switch
                    id="modelOutput"
                    checked={formData.modelOutputInMessagesEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, modelOutputInMessagesEnabled: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="voicemail">Voicemail Detection</Label>
                    <p className="text-sm text-muted-foreground">Detect and handle voicemail</p>
                  </div>
                  <Switch
                    id="voicemail"
                    checked={formData.voicemailDetectionEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, voicemailDetectionEnabled: checked })}
                  />
                </div>
                {formData.voicemailDetectionEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="voicemailMessage">Voicemail Message</Label>
                    <Textarea
                      id="voicemailMessage"
                      value={formData.voicemailMessage}
                      onChange={(e) => setFormData({ ...formData, voicemailMessage: e.target.value })}
                      placeholder="Please leave a message after the beep."
                      rows={2}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
