import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Play, Settings, Zap, GitBranch, ZoomIn, ZoomOut, Maximize2, Clock, MousePointer, MessageSquare, Trash2, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlowBuilderProps {
  chatbotId: string;
  chatbotName: string;
  onBack: () => void;
}

interface FlowNode {
  id: string;
  type: 'start' | 'message' | 'question' | 'action' | 'trigger';
  content: string;
  position: { x: number; y: number }; // in pixels relative to canvas center
  triggerType?: string;
  triggerValue?: string;
  actionType?: string;
  actionValue?: string;
  actionDelay?: number;
}

interface NodeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePoint: 'top' | 'bottom';
  targetPoint: 'top' | 'bottom';
}

export function FlowBuilder({ chatbotId, chatbotName, onBack }: FlowBuilderProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [description, setDescription] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>([
    {
      id: 'start',
      type: 'start',
      content: 'Start',
      position: { x: 0, y: 0 } // center of canvas
    }
  ]);
  
  // Connections between nodes
  const [connections, setConnections] = useState<NodeConnection[]>([]);
  
  // Pan and zoom state
  const [zoom, setZoom] = useState(1);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Node dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });
  
  // Connection drawing state
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; point: 'top' | 'bottom' } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState({ x: 0, y: 0 });

  const triggerCount = nodes.filter(n => n.type === 'trigger').length;
  const actionCount = nodes.filter(n => n.type === 'action').length;

  const handleSaveFlow = () => {
    toast({
      title: "Flow saved",
      description: `"${flowName}" has been saved successfully.`,
    });
  };

  const addNode = (type: 'trigger' | 'action' | 'message' | 'question') => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type,
      content: type.charAt(0).toUpperCase() + type.slice(1),
      position: { 
        x: (Math.random() - 0.5) * 300, 
        y: (Math.random() - 0.5) * 300 
      },
      ...(type === 'trigger' && { 
        triggerType: 'time-on-page',
        triggerValue: '5s'
      }),
      ...(type === 'action' && {
        actionType: 'show-message',
        actionValue: '👋 Hi there! How can I help you today?',
        actionDelay: 0
      })
    };
    setNodes([...nodes, newNode]);
    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} added`,
      description: "Node has been added to your flow",
    });
  };

  const updateNodeTriggerType = (nodeId: string, triggerType: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, triggerType } : node
    ));
  };

  const updateNodeActionType = (nodeId: string, actionType: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, actionType } : node
    ));
  };

  const updateNodeActionValue = (nodeId: string, actionValue: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, actionValue } : node
    ));
  };

  const updateNodeActionDelay = (nodeId: string, actionDelay: number) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, actionDelay } : node
    ));
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'start') return;
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    toast({
      title: "Node deleted",
      description: "Node has been removed from your flow",
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls - only when not dragging a node
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingNodeId) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !draggingNodeId && !isDrawingConnection) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (draggingNodeId) {
      handleNodeDrag(e);
    } else if (isDrawingConnection && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setCurrentMousePos({ 
        x: e.clientX - canvasRect.left, 
        y: e.clientY - canvasRect.top 
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingNodeId(null);
    setIsDrawingConnection(false);
    setConnectionStart(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  };

  // Node dragging handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setDraggingNodeId(nodeId);
    // Calculate the offset between mouse position and node position in screen space
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const nodeScreenX = centerX + node.position.x * zoom + pan.x;
    const nodeScreenY = centerY + node.position.y * zoom + pan.y;
    
    setNodeDragOffset({
      x: e.clientX - nodeScreenX,
      y: e.clientY - nodeScreenY
    });
  };

  const handleNodeDrag = (e: React.MouseEvent) => {
    if (!draggingNodeId || !canvasRef.current) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    
    // Convert screen position to canvas position
    const screenX = e.clientX - nodeDragOffset.x;
    const screenY = e.clientY - nodeDragOffset.y;
    
    const canvasX = (screenX - centerX - pan.x) / zoom;
    const canvasY = (screenY - centerY - pan.y) / zoom;
    
    setNodes(prev => prev.map(node => 
      node.id === draggingNodeId
        ? { ...node, position: { x: canvasX, y: canvasY } }
        : node
    ));
  };

  // Connection handlers
  const handleConnectionPointMouseDown = (e: React.MouseEvent, nodeId: string, point: 'top' | 'bottom') => {
    e.stopPropagation();
    setIsDrawingConnection(true);
    setConnectionStart({ nodeId, point });
    if (canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setCurrentMousePos({ 
        x: e.clientX - canvasRect.left, 
        y: e.clientY - canvasRect.top 
      });
    }
  };

  const handleConnectionPointMouseUp = (e: React.MouseEvent, nodeId: string, point: 'top' | 'bottom') => {
    e.stopPropagation();
    if (isDrawingConnection && connectionStart && connectionStart.nodeId !== nodeId) {
      const newConnection: NodeConnection = {
        id: `conn-${Date.now()}`,
        sourceId: connectionStart.nodeId,
        targetId: nodeId,
        sourcePoint: connectionStart.point,
        targetPoint: point
      };
      setConnections(prev => [...prev, newConnection]);
      toast({
        title: "Nodes connected",
        description: "Connection has been created",
      });
    }
    setIsDrawingConnection(false);
    setConnectionStart(null);
  };

  const getNodeScreenPosition = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return { x: 0, y: 0 };
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    
    return {
      x: centerX + node.position.x * zoom + pan.x,
      y: centerY + node.position.y * zoom + pan.y
    };
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDraggingNodeId(null);
      setIsDrawingConnection(false);
      setConnectionStart(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1">
            {isEditingName ? (
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                autoFocus
                className="text-lg font-semibold max-w-md bg-transparent border-none focus-visible:ring-0 p-0 h-auto"
              />
            ) : (
              <h1 
                className="text-lg font-semibold cursor-pointer hover:text-muted-foreground transition-colors"
                onClick={() => setIsEditingName(true)}
              >
                {flowName}
              </h1>
            )}
            {isEditingDescription ? (
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setIsEditingDescription(false)}
                placeholder="Add a description..."
                autoFocus
                className="text-sm text-muted-foreground max-w-md bg-transparent border-none focus-visible:ring-0 p-0 h-auto mt-1"
              />
            ) : (
              <p 
                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditingDescription(true)}
              >
                {description || "Add a description..."}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="gap-1.5">
              <GitBranch className="h-3 w-3" />
              {triggerCount} Triggers
            </Badge>
            <Badge variant="secondary" className="gap-1.5">
              <Zap className="h-3 w-3" />
              {actionCount} Actions
            </Badge>
            <Button variant="outline" size="sm">
              Templates
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={handleSaveFlow} size="sm">
              Save Flow
            </Button>
            <Button variant="ghost" size="icon" onClick={onBack}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="text-sm text-muted-foreground">Add Node:</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addNode('trigger')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Trigger
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => addNode('action')}
          >
            <Plus className="h-3 w-3 mr-1" />
            Action
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={canvasRef}
        className="flex-1 relative overflow-hidden bg-muted/20"
        style={{ cursor: isDragging ? 'grabbing' : isDrawingConnection ? 'crosshair' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG Layer for connections */}
        <svg 
          className="absolute inset-0 pointer-events-none" 
          style={{ width: '100%', height: '100%' }}
        >
          {/* Render existing connections */}
          {connections.map(conn => {
            const sourceNode = nodes.find(n => n.id === conn.sourceId);
            const targetNode = nodes.find(n => n.id === conn.targetId);
            if (!sourceNode || !targetNode || !canvasRef.current) return null;

            const canvasRect = canvasRef.current.getBoundingClientRect();
            const centerX = canvasRect.width / 2;
            const centerY = canvasRect.height / 2;

            const sourcePos = {
              x: centerX + sourceNode.position.x * zoom + pan.x,
              y: centerY + sourceNode.position.y * zoom + pan.y + (conn.sourcePoint === 'bottom' ? 24 : -24)
            };

            const targetPos = {
              x: centerX + targetNode.position.x * zoom + pan.x,
              y: centerY + targetNode.position.y * zoom + pan.y + (conn.targetPoint === 'top' ? -24 : 24)
            };

            // Create right-angled path
            const midY = (sourcePos.y + targetPos.y) / 2;

            return (
              <path
                key={conn.id}
                d={`M ${sourcePos.x} ${sourcePos.y} L ${sourcePos.x} ${midY} L ${targetPos.x} ${midY} L ${targetPos.x} ${targetPos.y}`}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                fill="none"
                strokeDasharray="6,6"
                className="opacity-60"
                style={{
                  animation: 'flowLine 1s linear infinite'
                }}
              />
            );
          })}

          {/* Render drawing connection */}
          {isDrawingConnection && connectionStart && canvasRef.current && (
            (() => {
              const sourcePos = getNodeScreenPosition(connectionStart.nodeId);
              const startY = sourcePos.y + (connectionStart.point === 'bottom' ? 24 : -24);
              const curveOffset = Math.abs(startY - currentMousePos.y) / 4;

              return (
                <path
                  d={`M ${sourcePos.x} ${startY} C ${sourcePos.x} ${startY + curveOffset}, ${currentMousePos.x} ${currentMousePos.y - curveOffset}, ${currentMousePos.x} ${currentMousePos.y}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                  className="opacity-60"
                />
              );
            })()
          )}
        </svg>
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Render all nodes */}
          <div className="relative w-full h-full">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute select-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${node.position.x}px), calc(-50% + ${node.position.y}px))`,
                  pointerEvents: 'auto'
                }}
              >
                {/* Top connection point */}
                {node.type !== 'start' && (
                  <div 
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-muted-foreground/50 border-2 border-background hover:bg-primary hover:scale-110 transition-all cursor-crosshair z-10"
                    onMouseDown={(e) => handleConnectionPointMouseDown(e, node.id, 'top')}
                    onMouseUp={(e) => handleConnectionPointMouseUp(e, node.id, 'top')}
                  />
                )}

                {/* Node content */}
                <div
                  className="relative"
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                >
                  {node.type === 'start' ? (
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg cursor-grab"
                      size="lg"
                    >
                      <Play className="h-4 w-4 mr-2 fill-current" />
                      {node.content}
                    </Button>
                  ) : node.type === 'trigger' ? (
                    <div className="bg-card border-2 border-primary/20 rounded-lg shadow-lg p-3 min-w-[240px] cursor-grab">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Select 
                            value={node.triggerType} 
                            onValueChange={(value) => updateNodeTriggerType(node.id, value)}
                          >
                            <SelectTrigger 
                              className="border-none bg-transparent p-0 h-auto font-medium focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="time-on-page">Time on Page</SelectItem>
                              <SelectItem value="click">Click Event</SelectItem>
                              <SelectItem value="scroll">Scroll Depth</SelectItem>
                              <SelectItem value="message">Message Received</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="text-sm text-muted-foreground">{node.triggerValue || '5s'}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : node.type === 'action' ? (
                    <div className="bg-card border-2 border-primary/20 rounded-lg shadow-lg min-w-[240px]">
                      {/* Header */}
                      <div 
                        className="flex items-center gap-3 p-3 cursor-grab"
                        onClick={(e) => {
                          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.node-header')) {
                            setExpandedNodeId(expandedNodeId === node.id ? null : node.id);
                          }
                        }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center node-header">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0 node-header">
                          <div className="font-medium">Show Message</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNode(node.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 node-header"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedNodeId(expandedNodeId === node.id ? null : node.id);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {expandedNodeId === node.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded Content */}
                      {expandedNodeId === node.id && (
                        <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <Select 
                              value={node.actionType} 
                              onValueChange={(value) => updateNodeActionType(node.id, value)}
                            >
                              <SelectTrigger 
                                className="w-full"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="show-message">Show Message</SelectItem>
                                <SelectItem value="send-email">Send Email</SelectItem>
                                <SelectItem value="webhook">Call Webhook</SelectItem>
                                <SelectItem value="redirect">Redirect</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Message</label>
                            <Textarea
                              value={node.actionValue || ''}
                              onChange={(e) => updateNodeActionValue(node.id, e.target.value)}
                              placeholder="👋 Hi there! How can I help you today?"
                              className="min-h-[80px] resize-none"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Delay (ms)</label>
                            <Input
                              type="number"
                              value={node.actionDelay || 0}
                              onChange={(e) => updateNodeActionDelay(node.id, parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg cursor-grab"
                      size="lg"
                    >
                      {node.content}
                    </Button>
                  )}
                </div>

                {/* Bottom connection point */}
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-muted-foreground/50 border-2 border-background hover:bg-primary hover:scale-110 transition-all cursor-crosshair z-10"
                  onMouseDown={(e) => handleConnectionPointMouseDown(e, node.id, 'bottom')}
                  onMouseUp={(e) => handleConnectionPointMouseUp(e, node.id, 'bottom')}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 left-6 flex flex-col bg-card border rounded-lg shadow-lg overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-none hover:bg-accent"
            onClick={handleZoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="border-t" />
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-none hover:bg-accent"
            onClick={handleZoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="border-t" />
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-none hover:bg-accent"
            onClick={handleResetView}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Zoom indicator */}
        <div className="absolute bottom-6 left-24 bg-card border rounded-lg shadow-lg px-3 py-2 text-sm text-muted-foreground">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
