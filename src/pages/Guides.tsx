import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Zap, Users, Settings, MessageSquare, TrendingUp } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Guides = () => {
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
            Guides & Tutorials
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Step-by-step guides to help you get the most out of your Voxtro AI agents.
          </p>
        </div>

        {/* Getting Started Guides */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Getting Started</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-pink-400" />
                  <CardTitle className="text-white">Your First AI Agent</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Learn how to create and configure your first AI agent from scratch.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                    <p className="text-gray-300 text-sm">Sign up and access your dashboard</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <p className="text-gray-300 text-sm">Choose your AI model and configure personality</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                    <p className="text-gray-300 text-sm">Add knowledge sources and train your agent</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">4</div>
                    <p className="text-gray-300 text-sm">Test and deploy to your website</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-blue-400" />
                  <CardTitle className="text-white">Setting Up Integrations</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Connect your existing tools and systems to enhance your agent's capabilities.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">1</div>
                    <p className="text-gray-300 text-sm">Connect your CRM or helpdesk</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">2</div>
                    <p className="text-gray-300 text-sm">Set up API endpoints for real-time data</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">3</div>
                    <p className="text-gray-300 text-sm">Configure webhooks and notifications</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">4</div>
                    <p className="text-gray-300 text-sm">Test integrations and monitor performance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Advanced Guides */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Advanced Guides</h2>
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-yellow-400" />
                  <CardTitle className="text-white">Performance Optimization</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Optimize your agent for faster responses and better accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Response time optimization</li>
                  <li>• Model fine-tuning techniques</li>
                  <li>• Caching strategies</li>
                  <li>• Load balancing</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-green-400" />
                  <CardTitle className="text-white">Multi-Agent Systems</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Build complex workflows with multiple specialized agents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Agent orchestration</li>
                  <li>• Handoff strategies</li>
                  <li>• Specialized agent roles</li>
                  <li>• Workflow management</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                  <CardTitle className="text-white">Analytics & Insights</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Extract valuable insights from your agent interactions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Conversation analysis</li>
                  <li>• Performance metrics</li>
                  <li>• Customer satisfaction tracking</li>
                  <li>• Business intelligence</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Use Cases & Examples</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">E-commerce Support Agent</CardTitle>
                <CardDescription className="text-gray-400">
                  Build an AI agent that handles order inquiries, returns, and product recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Learn how to create a comprehensive e-commerce support agent that can handle order tracking, 
                  process returns, and make personalized product recommendations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">SaaS Onboarding Assistant</CardTitle>
                <CardDescription className="text-gray-400">
                  Create an agent that guides new users through your product features and setup.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Build an intelligent onboarding assistant that helps new users understand your product, 
                  complete setup tasks, and discover key features.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Guides;