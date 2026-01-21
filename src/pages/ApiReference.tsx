import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Code, Key, Database, MessageSquare } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const ApiReference = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1c191b' }}>
      {/* Header */}
      <header className="w-full border-b border-gray-700" style={{ backgroundColor: 'rgba(28, 25, 27, 0.8)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center">
              <img src={voxtroLogo} alt="Voxtro" className="h-8 md:h-12 w-auto" />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-white" asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 font-montserrat">
            API Reference
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Complete reference for the Voxtro API. Build integrations and automate your AI agents programmatically.
          </p>
        </div>

        {/* Authentication */}
        <section className="mb-16">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="h-6 w-6 text-pink-400" />
                Authentication
              </CardTitle>
              <CardDescription className="text-gray-400">
                All API requests require authentication using your API key.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <code className="text-green-400 text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>
              <p className="text-gray-300 text-sm">
                You can find your API key in your dashboard settings. Keep it secure and never expose it in client-side code.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* API Endpoints */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-white">Endpoints</h2>

          {/* Agents */}
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-400" />
                Agents
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your AI agents programmatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Get Agents */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">GET</Badge>
                  <code className="text-gray-300">/api/v1/agents</code>
                </div>
                <p className="text-gray-400 text-sm mb-4">Retrieve all your AI agents.</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "agents": [
    {
      "id": "agent_123",
      "name": "Support Bot",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              {/* Create Agent */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500">POST</Badge>
                  <code className="text-gray-300">/api/v1/agents</code>
                </div>
                <p className="text-gray-400 text-sm mb-4">Create a new AI agent.</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "name": "Customer Support Bot",
  "personality": "helpful and professional",
  "model": "gpt-4",
  "knowledge_base": ["doc1", "doc2"]
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversations */}
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-6 w-6 text-purple-400" />
                Conversations
              </CardTitle>
              <CardDescription className="text-gray-400">
                Access and manage conversations between users and your agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Get Conversations */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">GET</Badge>
                  <code className="text-gray-300">/api/v1/conversations</code>
                </div>
                <p className="text-gray-400 text-sm mb-4">Retrieve conversations for your agents.</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "conversations": [
    {
      "id": "conv_123",
      "agent_id": "agent_123",
      "user_id": "user_456",
      "messages": 5,
      "status": "resolved",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}
                  </pre>
                </div>
              </div>

              {/* Send Message */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500">POST</Badge>
                  <code className="text-gray-300">/api/v1/conversations/{'{conversation_id}'}/messages</code>
                </div>
                <p className="text-gray-400 text-sm mb-4">Send a message in a conversation.</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "message": "Hello, I need help with my order",
  "user_id": "user_456"
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Code className="h-6 w-6 text-orange-400" />
                Analytics
              </CardTitle>
              <CardDescription className="text-gray-400">
                Get insights and analytics about your agent performance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500">GET</Badge>
                  <code className="text-gray-300">/api/v1/analytics/agents/{'{agent_id}'}</code>
                </div>
                <p className="text-gray-400 text-sm mb-4">Get analytics for a specific agent.</p>
                <div className="bg-gray-900 rounded-lg p-4">
                  <pre className="text-green-400 text-sm overflow-x-auto">
{`{
  "total_conversations": 1250,
  "resolution_rate": 0.89,
  "avg_response_time": 1.2,
  "satisfaction_score": 4.6,
  "period": "last_30_days"
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ApiReference;