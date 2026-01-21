import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Plus, Trash2, Phone, Mail, MessageSquare, User } from "lucide-react";
import { Separator } from "./ui/separator";

interface WidgetFormButton {
  id: string;
  label: string;
  icon: string;
  formId: string;
  color: string;
}

interface WidgetCustomizationProps {
  formData: {
    widget_button_text: string;
    widget_position: string;
    widget_button_color: string;
    widget_text_color: string;
    widget_size: string;
    widget_border_radius: string;
    widget_custom_css: string;
    widget_form_buttons: WidgetFormButton[];
    widget_form_buttons_layout: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string | any[] } }) => void;
  availableForms: Array<{ id: string; form_name: string; form_title: string }>;
}

export default function WidgetCustomization({ formData, onChange, availableForms }: WidgetCustomizationProps) {
  const iconOptions = [
    { value: "phone", label: "Phone", icon: Phone },
    { value: "email", label: "Email", icon: Mail },
    { value: "message", label: "Message", icon: MessageSquare },
    { value: "user", label: "Contact", icon: User },
  ];

  const addFormButton = () => {
    const newButton: WidgetFormButton = {
      id: `btn_${Date.now()}`,
      label: "Contact Us",
      icon: "phone",
      formId: availableForms[0]?.id || "",
      color: formData.widget_button_color || "#3b82f6"
    };
    
    const updatedButtons = [...(formData.widget_form_buttons || []), newButton];
    onChange({ target: { name: 'widget_form_buttons', value: updatedButtons } });
  };

  const updateFormButton = (index: number, field: keyof WidgetFormButton, value: string) => {
    const updatedButtons = [...(formData.widget_form_buttons || [])];
    updatedButtons[index] = { ...updatedButtons[index], [field]: value };
    onChange({ target: { name: 'widget_form_buttons', value: updatedButtons } });
  };

  const removeFormButton = (index: number) => {
    const updatedButtons = formData.widget_form_buttons?.filter((_, i) => i !== index) || [];
    onChange({ target: { name: 'widget_form_buttons', value: updatedButtons } });
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Widget Customization</CardTitle>
        <CardDescription>
          Customize how your chat widget appears on your website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="widget_button_text">Button Text</Label>
          <Input
            id="widget_button_text"
            name="widget_button_text"
            value={formData.widget_button_text}
            onChange={onChange}
            placeholder="Chat with us"
          />
        </div>

        <div>
          <Label htmlFor="widget_position">Widget Position</Label>
          <Select
            value={formData.widget_position}
            onValueChange={(value) => onChange({ target: { name: 'widget_position', value } })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom-right">Bottom Right</SelectItem>
              <SelectItem value="bottom-left">Bottom Left</SelectItem>
              <SelectItem value="top-right">Top Right</SelectItem>
              <SelectItem value="top-left">Top Left</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="widget_button_color">Button Color</Label>
            <div className="flex space-x-2">
              <Input
                id="widget_button_color"
                name="widget_button_color"
                type="color"
                value={formData.widget_button_color || "#3b82f6"}
                onChange={onChange}
                className="w-16 h-10 p-1 border rounded"
              />
              <Input
                name="widget_button_color"
                value={formData.widget_button_color || "#3b82f6"}
                onChange={onChange}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="widget_text_color">Text Color</Label>
            <div className="flex space-x-2">
              <Input
                id="widget_text_color"
                name="widget_text_color"
                type="color"
                value={formData.widget_text_color}
                onChange={onChange}
                className="w-16 h-10 p-1 border rounded"
              />
              <Input
                name="widget_text_color"
                value={formData.widget_text_color}
                onChange={onChange}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="widget_size">Widget Size</Label>
            <Select
              value={formData.widget_size}
              onValueChange={(value) => onChange({ target: { name: 'widget_size', value } })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="widget_border_radius">Border Radius</Label>
            <Select
              value={formData.widget_border_radius}
              onValueChange={(value) => onChange({ target: { name: 'widget_border_radius', value } })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select border radius" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Square</SelectItem>
                <SelectItem value="8px">Rounded</SelectItem>
                <SelectItem value="50%">Circular</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="widget_custom_css">Custom CSS</Label>
          <Textarea
            id="widget_custom_css"
            name="widget_custom_css"
            value={formData.widget_custom_css}
            onChange={onChange}
            placeholder="/* Example: Customize widget button */
#voxtro-button {
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  animation: pulse 2s infinite;
}

/* Customize chat window */
#voxtro-chat {
  border-radius: 20px !important;
}

/* Customize messages */
.voxtro-user-message {
  background: linear-gradient(45deg, #667eea, #764ba2);
}

.voxtro-bot-message {
  background: #f8f9fa;
  border-left: 4px solid #007bff;
}"
            className="min-h-32 font-mono text-sm"
          />
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <p><strong>Available CSS selectors:</strong></p>
            <div className="bg-muted p-2 rounded text-xs font-mono space-y-0.5">
              <div><code>#voxtro-widget</code> - Main widget container</div>
              <div><code>#voxtro-button</code> - Chat button</div>
              <div><code>#voxtro-chat</code> - Chat window container</div>
              <div><code>#voxtro-messages</code> - Messages container</div>
              <div><code>#voxtro-input</code> - Input field</div>
              <div><code>#voxtro-send</code> - Send button</div>
              <div><code>#voxtro-faq-container</code> - FAQ suggestions container</div>
              <div><code>#voxtro-end-conversation</code> - End conversation button</div>
              <div><code>#voxtro-overlay</code> - Background overlay</div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-base font-medium">Form Buttons</Label>
              <p className="text-sm text-muted-foreground">
                Add buttons that open contact forms instead of the chat
              </p>
            </div>
            <Button 
              type="button" 
              onClick={addFormButton}
              size="sm"
              disabled={availableForms.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Button
            </Button>
          </div>

          {formData.widget_form_buttons && formData.widget_form_buttons.length > 0 && (
            <div className="mb-4">
              <Label htmlFor="widget_form_buttons_layout">Button Layout</Label>
              <Select
                value={formData.widget_form_buttons_layout || 'vertical'}
                onValueChange={(value) => onChange({ target: { name: 'widget_form_buttons_layout', value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical (Stacked)</SelectItem>
                  <SelectItem value="horizontal">Horizontal (Side by Side)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {availableForms.length === 0 && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              No forms available. Create some forms first to add form buttons to your widget.
            </div>
          )}

          <div className="space-y-4">
            {formData.widget_form_buttons?.map((button, index) => {
              const IconComponent = iconOptions.find(opt => opt.value === button.icon)?.icon || Phone;
              return (
                <Card key={button.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="font-medium">Form Button {index + 1}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFormButton(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Button Label</Label>
                        <Input
                          value={button.label}
                          onChange={(e) => updateFormButton(index, 'label', e.target.value)}
                          placeholder="Contact Us"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm">Icon</Label>
                        <Select
                          value={button.icon}
                          onValueChange={(value) => updateFormButton(index, 'icon', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="h-4 w-4" />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm">Form to Open</Label>
                        <Select
                          value={button.formId}
                          onValueChange={(value) => updateFormButton(index, 'formId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select form" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableForms.map((form) => (
                              <SelectItem key={form.id} value={form.id}>
                                {form.form_title || form.form_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label className="text-sm">Button Color</Label>
                        <div className="flex space-x-2">
                          <Input
                            type="color"
                            value={button.color}
                            onChange={(e) => updateFormButton(index, 'color', e.target.value)}
                            className="w-16 h-10 p-1 border rounded"
                          />
                          <Input
                            value={button.color}
                            onChange={(e) => updateFormButton(index, 'color', e.target.value)}
                            placeholder="#3b82f6"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}