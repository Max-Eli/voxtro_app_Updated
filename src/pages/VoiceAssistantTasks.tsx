import { useState, useEffect } from "react";
import { CheckSquare, Clock, AlertCircle, CheckCircle, Loader2, LayoutGrid, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TaskCard } from "@/components/tasks/TaskCard";
import { AssistantSearchPreview } from "@/components/tasks/AssistantSearchPreview";
import { QuickTaskForm } from "@/components/tasks/QuickTaskForm";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
interface VoiceAssistant {
  id: string;
  name: string | null;
  org_id: string | null;
}

interface VoiceConnection {
  id: string;
  org_id: string | null;
  org_name: string | null;
  is_active: boolean;
}

interface TeamMember {
  user_id: string;
  email?: string;
  user_name?: string;
}

interface Chatbot {
  id: string;
  name: string;
}

interface WhatsAppAgent {
  id: string;
  name: string | null;
  phone_number: string | null;
}

interface TeamOrganization {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  user_id: string;
  assistant_id: string | null;
  org_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  team_org_id: string | null;
  is_team_shared: boolean;
  assigned_to: string | null;
  chatbot_id: string | null;
  whatsapp_agent_id: string | null;
}

const VoiceAssistantTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(new Set());
  const [assistants, setAssistants] = useState<VoiceAssistant[]>([]);
  const [connections, setConnections] = useState<VoiceConnection[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [whatsappAgents, setWhatsappAgents] = useState<WhatsAppAgent[]>([]);
  const [teamOrganizations, setTeamOrganizations] = useState<TeamOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch connections
      const { data: connectionsData } = await supabase
        .from("voice_connections")
        .select("*")
        .eq("user_id", user?.id);

      setConnections(connectionsData || []);

      // Fetch assistants
      const { data: assistantsData } = await supabase
        .from("voice_assistants")
        .select("id, name, org_id")
        .eq("user_id", user?.id);

      setAssistants(assistantsData || []);

      // Fetch team members for assignment
      const { data: membersData } = await supabase
        .from("team_members")
        .select("user_id, email");

      let membersWithNames: TeamMember[] = [];
      if (membersData) {
        const uniqueUserIds = [...new Set(membersData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", uniqueUserIds);

        membersWithNames = uniqueUserIds.map(userId => {
          const member = membersData.find(m => m.user_id === userId);
          const profile = profilesData?.find(p => p.user_id === userId);
          return {
            user_id: userId,
            email: member?.email || profile?.email,
            user_name: profile?.full_name,
          };
        });
      }

      // Fetch chatbots (RLS policies handle team visibility)
      const { data: chatbotsData } = await supabase
        .from("chatbots")
        .select("id, name")
        .order("name");

      setChatbots(chatbotsData || []);

      // Fetch WhatsApp agents (RLS policies handle team visibility)
      const { data: whatsappData } = await supabase
        .from("whatsapp_agents")
        .select("id, name, phone_number")
        .order("name");

      setWhatsappAgents(whatsappData || []);

      // Fetch team organizations (RLS policies handle team visibility)
      const { data: teamOrgsData } = await supabase
        .from("team_organizations")
        .select("id, name")
        .order("name");

      setTeamOrganizations(teamOrgsData || []);

      // Fetch hidden task IDs for current user
      const { data: hiddenData } = await supabase
        .from("task_hidden_by_users")
        .select("task_id")
        .eq("user_id", user?.id);

      const hiddenIds = new Set((hiddenData || []).map(h => h.task_id));
      setHiddenTaskIds(hiddenIds);

      // Fetch tasks (RLS policy handles filtering for owned/assigned/team tasks)
      const { data: tasksData, error } = await supabase
        .from("voice_assistant_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out hidden tasks
      const visibleTasks = (tasksData || []).filter(task => !hiddenIds.has(task.id));
      setTasks(visibleTasks);

      // Fetch profiles for all users involved in tasks (creators and assignees)
      if (tasksData && tasksData.length > 0) {
        const allUserIds = new Set<string>();
        tasksData.forEach((task: Task) => {
          if (task.user_id) allUserIds.add(task.user_id);
          if (task.assigned_to) allUserIds.add(task.assigned_to);
        });

        const userIdsArray = Array.from(allUserIds);
        if (userIdsArray.length > 0) {
          const { data: allProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIdsArray);

          if (allProfiles) {
            // Merge with existing team members
            const existingUserIds = new Set(membersWithNames.map(m => m.user_id));
            allProfiles.forEach(profile => {
              if (!existingUserIds.has(profile.user_id)) {
                membersWithNames.push({
                  user_id: profile.user_id,
                  email: profile.email || undefined,
                  user_name: profile.full_name || undefined,
                });
              }
            });
          }
        }
      }

      setTeamMembers(membersWithNames);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleTaskHidden = (taskId: string) => {
    // Update local state when a task is hidden (not deleted)
    setHiddenTaskIds((prev) => new Set([...prev, taskId]));
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const getAssistantName = (assistantId: string | null) => {
    if (!assistantId) return "Unassigned";
    const assistant = assistants.find((a) => a.id === assistantId);
    return assistant?.name || "Unknown Assistant";
  };

  const getOrgName = (orgId: string | null, teamOrgId?: string | null) => {
    // First check team organization by team_org_id
    if (teamOrgId) {
      const teamOrg = teamOrganizations.find((t) => t.id === teamOrgId);
      if (teamOrg) return teamOrg.name;
    }
    // Check if orgId matches a team organization
    if (orgId) {
      const teamOrg = teamOrganizations.find((t) => t.id === orgId);
      if (teamOrg) return teamOrg.name;
    }
    // If user belongs to a team, show that team's name
    if (teamOrganizations.length > 0) {
      return teamOrganizations[0].name;
    }
    return "No Organization";
  };

  const getAssignedToName = (userId: string | null) => {
    if (!userId) return "";
    const member = teamMembers.find((m) => m.user_id === userId);
    if (member?.user_name) return member.user_name;
    if (member?.email) return member.email;
    // Return a shortened user ID if no profile info found
    return `User ${userId.slice(0, 8)}...`;
  };

  const getChatbotName = (chatbotId: string | null) => {
    if (!chatbotId) return "";
    const chatbot = chatbots.find((c) => c.id === chatbotId);
    return chatbot?.name || "Unknown Chatbot";
  };

  const getWhatsappAgentName = (agentId: string | null) => {
    if (!agentId) return "";
    const agent = whatsappAgents.find((a) => a.id === agentId);
    return agent?.name || agent?.phone_number || "Unknown Agent";
  };

  const getCreatedByName = (userId: string | null) => {
    if (!userId) return "Unknown";
    const member = teamMembers.find((m) => m.user_id === userId);
    if (member?.user_name) return member.user_name;
    if (member?.email) return member.email;
    return `User ${userId.slice(0, 8)}...`;
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter((task) => {
      const assistantName = getAssistantName(task.assistant_id).toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(searchLower) ||
        (task.description?.toLowerCase().includes(searchLower) ?? false) ||
        assistantName.includes(searchLower);
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesOrg = orgFilter === "all" || task.org_id === orgFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesOrg;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
        case "created_at":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    overdue: tasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between flex-shrink-0 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Task Manager</h1>
          <p className="text-muted-foreground">
            Manage tasks for your voice assistants across all organizations
          </p>
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {/* Quick Add Task */}
      <Card className="flex-shrink-0 mb-4 border-dashed">
        <CardContent className="pt-4">
          <QuickTaskForm
            onTaskCreated={handleTaskCreated}
            placeholder="What needs to be done? Press Enter to add..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            Click on a task to assign it to an assistant
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-shrink-0 mb-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {viewMode === "list" && (
        <Card className="flex-shrink-0 mb-4">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <AssistantSearchPreview
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                assistants={assistants}
                connections={connections}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={orgFilter} onValueChange={setOrgFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {connections
                  .filter((conn) => conn.org_id)
                  .map((conn) => (
                    <SelectItem key={conn.id} value={conn.org_id!}>
                      {conn.org_name || conn.org_id || "Unknown"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Newest First</SelectItem>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>
      )}

      {/* Tasks Display - fills remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "kanban" ? (
          <TaskKanbanBoard
            tasks={filteredTasks}
            getAssistantName={getAssistantName}
            getOrgName={getOrgName}
            getAssignedToName={getAssignedToName}
            getChatbotName={getChatbotName}
            getWhatsappAgentName={getWhatsappAgentName}
            getCreatedByName={getCreatedByName}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
            onTaskHidden={handleTaskHidden}
            currentUserId={user?.id}
            assistants={assistants}
            teamMembers={teamMembers}
            chatbots={chatbots}
            whatsappAgents={whatsappAgents}
          />
        ) : (
          <div className="space-y-4 h-full overflow-y-auto pr-2">
            {filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No tasks found</h3>
                  <p className="text-muted-foreground text-center">
                    {tasks.length === 0
                      ? "Use the quick add above to create your first task"
                      : "No tasks match your current filters"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assistantName={getAssistantName(task.assistant_id)}
                  orgName={getOrgName(task.org_id, task.team_org_id)}
                  chatbotName={getChatbotName(task.chatbot_id)}
                  whatsappAgentName={getWhatsappAgentName(task.whatsapp_agent_id)}
                  assignedToName={getAssignedToName(task.assigned_to)}
                  onUpdate={handleTaskUpdated}
                  onDelete={handleTaskDeleted}
                  onHide={handleTaskHidden}
                  currentUserId={user?.id}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistantTasks;
