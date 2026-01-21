import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  MessageCircle, 
  Bot, 
  Zap, 
  Clock, 
  TrendingUp, 
  Shield, 
  Globe,
  Headphones,
  BarChart3,
  Users,
  Sparkles,
  ArrowRight,
  Mail
} from "lucide-react";
import { LucideIcon } from "lucide-react";

type AgentType = 'voice' | 'whatsapp' | 'chatbot';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface EmptyAgentStateProps {
  type: AgentType;
  compact?: boolean;
}

const agentConfig: Record<AgentType, {
  icon: LucideIcon;
  iconColor: string;
  bgGradient: string;
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  stats: { value: string; label: string }[];
}> = {
  voice: {
    icon: Phone,
    iconColor: "text-chart-5",
    bgGradient: "from-chart-5/20 via-chart-5/5 to-transparent",
    title: "Voice Assistants",
    subtitle: "Transform Your Customer Calls",
    description: "AI-powered voice assistants that handle calls 24/7, qualify leads, and schedule appointments with natural conversations.",
    features: [
      {
        icon: Headphones,
        title: "24/7 Availability",
        description: "Never miss a call. Your AI assistant is always ready to help customers."
      },
      {
        icon: Zap,
        title: "Instant Response",
        description: "Zero wait times. Customers get immediate, accurate answers."
      },
      {
        icon: BarChart3,
        title: "Call Analytics",
        description: "Full transcripts, recordings, and insights from every conversation."
      },
      {
        icon: Globe,
        title: "Multi-Language",
        description: "Support customers in multiple languages automatically."
      }
    ],
    stats: [
      { value: "90%", label: "Call Resolution Rate" },
      { value: "24/7", label: "Availability" },
      { value: "< 1s", label: "Response Time" }
    ]
  },
  whatsapp: {
    icon: MessageCircle,
    iconColor: "text-green-500",
    bgGradient: "from-green-500/20 via-green-500/5 to-transparent",
    title: "WhatsApp Agents",
    subtitle: "Meet Customers Where They Are",
    description: "Engage billions of WhatsApp users with AI agents that handle inquiries, process orders, and provide support—all within the world's most popular messaging app.",
    features: [
      {
        icon: Users,
        title: "Massive Reach",
        description: "Connect with 2+ billion active WhatsApp users worldwide."
      },
      {
        icon: Clock,
        title: "Instant Replies",
        description: "Respond to messages instantly, any time of day or night."
      },
      {
        icon: Shield,
        title: "Secure & Private",
        description: "End-to-end encryption keeps conversations safe."
      },
      {
        icon: TrendingUp,
        title: "Conversion Boost",
        description: "Higher engagement rates than email or traditional channels."
      }
    ],
    stats: [
      { value: "98%", label: "Open Rate" },
      { value: "45%", label: "Higher Engagement" },
      { value: "3x", label: "Faster Resolution" }
    ]
  },
  chatbot: {
    icon: Bot,
    iconColor: "text-primary",
    bgGradient: "from-primary/20 via-primary/5 to-transparent",
    title: "AI Chatbots",
    subtitle: "Supercharge Your Website",
    description: "Intelligent chatbots that engage visitors, answer questions, capture leads, and provide personalized support—turning your website into a 24/7 sales and support machine.",
    features: [
      {
        icon: Sparkles,
        title: "Smart Conversations",
        description: "AI that understands context and provides relevant answers."
      },
      {
        icon: TrendingUp,
        title: "Lead Capture",
        description: "Automatically qualify and capture leads from website visitors."
      },
      {
        icon: Clock,
        title: "Reduce Wait Times",
        description: "Instant answers mean happier customers and less support load."
      },
      {
        icon: BarChart3,
        title: "Deep Insights",
        description: "Understand what your customers are asking and improve over time."
      }
    ],
    stats: [
      { value: "67%", label: "Support Deflection" },
      { value: "40%", label: "Lead Increase" },
      { value: "24/7", label: "Availability" }
    ]
  }
};

export function EmptyAgentState({ type, compact = false }: EmptyAgentStateProps) {
  const config = agentConfig[type];
  const IconComponent = config.icon;

  const handleContactSales = () => {
    window.location.href = "mailto:info@voxtro.io?subject=Interested in " + config.title;
  };

  if (compact) {
    return (
      <div className="text-center py-8 px-4">
        <div className={`p-4 rounded-full w-fit mx-auto mb-4 bg-gradient-to-br ${config.bgGradient}`}>
          <IconComponent className={`h-10 w-10 ${config.iconColor}`} />
        </div>
        <h3 className="text-lg font-semibold mb-2">No {config.title.toLowerCase()} assigned</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
          {config.description.substring(0, 120)}...
        </p>
        <Button onClick={handleContactSales} size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Contact Sales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} border`}>
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className={`p-5 rounded-2xl bg-gradient-to-br ${config.bgGradient} border shadow-lg`}>
              <IconComponent className={`h-12 w-12 ${config.iconColor}`} />
            </div>
            <div className="flex-1">
              <Badge variant="secondary" className="mb-3">
                <Sparkles className="h-3 w-3 mr-1" />
                Available for Your Account
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{config.subtitle}</h1>
              <p className="text-muted-foreground text-lg max-w-2xl">
                {config.description}
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap gap-6 mt-8 pt-8 border-t border-border/50">
            {config.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className={`text-3xl font-bold ${config.iconColor}`}>{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.features.map((feature, index) => {
          const FeatureIcon = feature.icon;
          return (
            <Card key={index} className="group hover:shadow-md transition-all duration-300 hover:border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${config.bgGradient} group-hover:scale-110 transition-transform`}>
                    <FeatureIcon className={`h-5 w-5 ${config.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Ready to Get Started?</h2>
              <p className="text-muted-foreground">
                Contact our sales team to add {config.title.toLowerCase()} to your account and start seeing results immediately.
              </p>
            </div>
            <Button onClick={handleContactSales} size="lg" className="shrink-0 gap-2">
              <Mail className="h-5 w-5" />
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
