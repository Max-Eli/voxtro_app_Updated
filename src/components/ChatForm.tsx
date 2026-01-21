import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, FileText } from 'lucide-react';

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ChatFormData {
  id: string;
  form_title: string;
  form_description?: string;
  fields: FormField[];
  success_message: string;
  terms_and_conditions?: string;
  require_terms_acceptance: boolean;
}

interface ChatFormProps {
  formData: ChatFormData;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  themeColor: string;
}

export function ChatForm({ formData, onSubmit, isSubmitting = false, themeColor }: ChatFormProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`;
    }

    if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Please enter a valid email address';
    }

    if (field.type === 'phone' && value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
      return 'Please enter a valid phone number';
    }

    if (field.validation?.min && value && value.length < field.validation.min) {
      return `${field.label} must be at least ${field.validation.min} characters`;
    }

    if (field.validation?.max && value && value.length > field.validation.max) {
      return `${field.label} must be no more than ${field.validation.max} characters`;
    }

    if (field.validation?.pattern && value && !new RegExp(field.validation.pattern).test(value)) {
      return `${field.label} format is invalid`;
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    formData.fields.forEach(field => {
      const error = validateField(field, values[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    // Validate terms acceptance if required
    if (formData.require_terms_acceptance && !termsAccepted) {
      newErrors['terms'] = 'You must accept the terms and conditions to proceed';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSubmit(values);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const renderField = (field: FormField) => {
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={values[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`focus:ring-2 ${error ? 'border-destructive focus:border-destructive' : 'focus:border-transparent'}`}
              style={{
                '--tw-ring-color': error ? undefined : themeColor + '40'
              } as React.CSSProperties}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={values[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className={`focus:ring-2 ${error ? 'border-destructive focus:border-destructive' : 'focus:border-transparent'}`}
              style={{
                '--tw-ring-color': error ? undefined : themeColor + '40'
              } as React.CSSProperties}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={values[field.id] || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              rows={3}
              className={`focus:ring-2 resize-none ${error ? 'border-destructive focus:border-destructive' : 'focus:border-transparent'}`}
              style={{
                '--tw-ring-color': error ? undefined : themeColor + '40'
              } as React.CSSProperties}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={values[field.id] || ''} onValueChange={(value) => handleFieldChange(field.id, value)}>
              <SelectTrigger className={error ? 'border-destructive' : ''}>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.id} className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <RadioGroup
              value={values[field.id] || ''}
              onValueChange={(value) => handleFieldChange(field.id, value)}
              className="space-y-2"
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={(values[field.id] || []).includes(option)}
                    onCheckedChange={(checked) => {
                      const currentValues = values[field.id] || [];
                      if (checked) {
                        handleFieldChange(field.id, [...currentValues, option]);
                      } else {
                        handleFieldChange(field.id, currentValues.filter((v: string) => v !== option));
                      }
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="text-sm font-normal">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-card">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-2">
          <div 
            className="p-2 rounded-full"
            style={{ backgroundColor: themeColor + '20' }}
          >
            <FileText 
              className="h-5 w-5" 
              style={{ color: themeColor }}
            />
          </div>
        </div>
        <CardTitle className="text-lg font-semibold text-foreground">
          {formData.form_title}
        </CardTitle>
        {formData.form_description && (
          <CardDescription className="text-sm text-muted-foreground">
            {formData.form_description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formData.fields.map(renderField)}
          
          {/* Terms and Conditions */}
          {formData.require_terms_acceptance && formData.terms_and_conditions && (
            <div className="space-y-3 pt-2 border-t">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {formData.terms_and_conditions}
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms-acceptance"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => {
                    setTermsAccepted(!!checked);
                    if (errors['terms']) {
                      setErrors(prev => ({ ...prev, terms: '' }));
                    }
                  }}
                />
                <Label htmlFor="terms-acceptance" className="text-sm font-normal leading-relaxed">
                  I accept the terms and conditions
                  <span className="text-destructive ml-1">*</span>
                </Label>
              </div>
              {errors['terms'] && <p className="text-sm text-destructive">{errors['terms']}</p>}
            </div>
          )}
          
          <div className="pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full text-white font-medium py-2.5 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: themeColor }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Form
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}