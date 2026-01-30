import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Bot, Phone, MessageCircle, Eye, Edit, FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCustomerAssignmentsWithPermissions,
  getAssignmentPermissions,
  setAssignmentPermissions,
  CustomerAssignment,
  AssignmentPermission,
} from '@/integrations/api/endpoints/permissions';

interface CustomerPermissionConfigProps {
  customerId: string;
  customerName: string;
  onClose?: () => void;
}

export function CustomerPermissionConfig({
  customerId,
  customerName,
  onClose,
}: CustomerPermissionConfigProps) {
  const [assignments, setAssignments] = useState<CustomerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<CustomerAssignment | null>(null);
  const [permissions, setPermissions] = useState<AssignmentPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, [customerId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await getCustomerAssignmentsWithPermissions(customerId);
      setAssignments(response.assignments || []);

      // Auto-select first assignment
      if (response.assignments?.length > 0) {
        handleSelectAssignment(response.assignments[0]);
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      toast.error('Failed to load customer assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = async (assignment: CustomerAssignment) => {
    setSelectedAssignment(assignment);
    setPermissionsLoading(true);

    try {
      const response = await getAssignmentPermissions(assignment.type, assignment.assignment_id);
      setPermissions(response.permissions || []);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      toast.error('Failed to load permissions');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionTypeId: string, isEnabled: boolean) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.permission_type_id === permissionTypeId ? { ...p, is_enabled: isEnabled } : p
      )
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedAssignment) return;

    setSaving(true);
    try {
      await setAssignmentPermissions(
        selectedAssignment.type,
        selectedAssignment.assignment_id,
        permissions.map((p) => ({
          permission_type_id: p.permission_type_id,
          is_enabled: p.is_enabled,
        }))
      );
      toast.success('Permissions saved successfully');
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return <Phone className="h-4 w-4" />;
      case 'chatbot':
        return <Bot className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'edit':
        return <Edit className="h-4 w-4" />;
      case 'content':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'view':
        return 'bg-blue-100 text-blue-800';
      case 'edit':
        return 'bg-yellow-100 text-yellow-800';
      case 'content':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const category = perm.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, AssignmentPermission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            No agent assignments found for this customer.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Configure Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Manage what {customerName} can see and do in their portal
          </p>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Agent Selection Tabs */}
      <Tabs
        value={selectedAssignment?.assignment_id || assignments[0]?.assignment_id}
        onValueChange={(value) => {
          const assignment = assignments.find((a) => a.assignment_id === value);
          if (assignment) handleSelectAssignment(assignment);
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {assignments.map((assignment) => (
            <TabsTrigger
              key={assignment.assignment_id}
              value={assignment.assignment_id}
              className="flex items-center gap-2"
            >
              {getAgentIcon(assignment.type)}
              <span className="max-w-[120px] truncate">{assignment.agent_name}</span>
              <Badge variant="outline" className="text-xs">
                {assignment.type}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {assignments.map((assignment) => (
          <TabsContent key={assignment.assignment_id} value={assignment.assignment_id}>
            {permissionsLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {getAgentIcon(assignment.type)}
                    {assignment.agent_name}
                  </CardTitle>
                  <CardDescription>
                    Configure what this customer can access for this{' '}
                    {assignment.type === 'voice'
                      ? 'voice assistant'
                      : assignment.type === 'chatbot'
                      ? 'chatbot'
                      : 'WhatsApp agent'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <h4 className="font-medium capitalize">{category} Permissions</h4>
                      </div>
                      <div className="space-y-2 pl-6">
                        {perms.map((perm) => (
                          <div
                            key={perm.permission_type_id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Label
                                  htmlFor={perm.permission_type_id}
                                  className="font-medium cursor-pointer"
                                >
                                  {perm.name}
                                </Label>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getCategoryColor(perm.category)}`}
                                >
                                  {perm.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                            <Switch
                              id={perm.permission_type_id}
                              checked={perm.is_enabled}
                              onCheckedChange={(checked) =>
                                handlePermissionToggle(perm.permission_type_id, checked)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSavePermissions} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Permissions
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
