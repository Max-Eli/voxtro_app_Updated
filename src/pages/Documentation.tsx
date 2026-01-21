import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Code, Users, Zap, Shield, Globe, Book, Settings, MessageSquare } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Documentation = () => {
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
            Documentation
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to know about building and deploying AI agents with Voxtro.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Quick Start</h2>
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-pink-400" />
                  <CardTitle className="text-white">1. Create Your Agent</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Set up your first AI agent in minutes with our intuitive interface.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li>• Choose your AI model</li>
                  <li>• Configure personality and tone</li>
                  <li>• Add knowledge sources</li>
                  <li>• Set up basic responses</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white">2. Configure Integrations</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Connect your systems and data sources for real-time information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li>• Connect CRM systems</li>
                  <li>• Add API endpoints</li>
                  <li>• Set up webhooks</li>
                  <li>• Configure actions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-green-400" />
                  <CardTitle className="text-white">3. Deploy & Monitor</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Launch your agent and track performance with detailed analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li>• Embed on website</li>
                  <li>• Monitor conversations</li>
                  <li>• Track metrics</li>
                  <li>• Optimize performance</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Core Features</h2>
            <div className="space-y-6">
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Book className="h-5 w-5 text-pink-400" />
                    Agent Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Learn how to configure your AI agent's personality, knowledge base, and response patterns.
                  </p>
                  <ul className="text-gray-400 space-y-1 text-sm">
                    <li>• Personality customization</li>
                    <li>• Knowledge base management</li>
                    <li>• Response templates</li>
                    <li>• Conversation flows</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-400" />
                    API Integration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Connect external services and databases to enhance your agent's capabilities.
                  </p>
                  <ul className="text-gray-400 space-y-1 text-sm">
                    <li>• REST API connections</li>
                    <li>• Database integrations</li>
                    <li>• Third-party services</li>
                    <li>• Custom webhooks</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Advanced Topics</h2>
            <div className="space-y-6">
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-400" />
                    Security & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Understand how Voxtro protects your data and ensures compliance.
                  </p>
                  <ul className="text-gray-400 space-y-1 text-sm">
                    <li>• Data encryption</li>
                    <li>• Access controls</li>
                    <li>• GDPR compliance</li>
                    <li>• SOC 2 certification</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-400" />
                    Performance Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Best practices for optimizing your agent's performance and response quality.
                  </p>
                  <ul className="text-gray-400 space-y-1 text-sm">
                    <li>• Response time optimization</li>
                    <li>• Model fine-tuning</li>
                    <li>• Conversation analytics</li>
                    <li>• A/B testing</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Need Help Section */}
        <section className="mt-16 text-center">
          <Card className="bg-background shadow-lg shadow-pink-500/20 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Need Help?</h3>
            <p className="text-gray-300 mb-6">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild>
                <Link to="/support">Contact Support</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/api">API Reference</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Documentation;