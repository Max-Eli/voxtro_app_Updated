import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Activity, Globe, Zap, CheckCircle, AlertCircle, Clock, Database } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Status = () => {
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
            System Status
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Real-time status of Voxtro services and infrastructure.
          </p>
        </div>

        {/* Overall Status */}
        <section className="mb-16">
          <Card className="bg-background shadow-lg shadow-green-500/20">
            <CardContent className="p-8">
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-400 mr-4" />
                <div>
                  <h2 className="text-3xl font-bold text-white">All Systems Operational</h2>
                  <p className="text-gray-400">All services are running normally</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <Badge className="bg-green-500/20 text-green-400 border-green-500">
                  99.98% Uptime (Last 90 days)
                </Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Service Status */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Service Status</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Core Services */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Core Services</h3>
              
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-6 w-6 text-pink-400" />
                      <div>
                        <h4 className="text-white font-semibold">AI Agent API</h4>
                        <p className="text-gray-400 text-sm">Core agent processing and responses</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="h-6 w-6 text-blue-400" />
                      <div>
                        <h4 className="text-white font-semibold">Database</h4>
                        <p className="text-gray-400 text-sm">Data storage and retrieval</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-6 w-6 text-green-400" />
                      <div>
                        <h4 className="text-white font-semibold">Chat Widget</h4>
                        <p className="text-gray-400 text-sm">Website embedding and chat interface</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Infrastructure */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-white mb-4">Infrastructure</h3>
              
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="h-6 w-6 text-yellow-400" />
                      <div>
                        <h4 className="text-white font-semibold">Authentication</h4>
                        <p className="text-gray-400 text-sm">User login and security</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-6 w-6 text-purple-400" />
                      <div>
                        <h4 className="text-white font-semibold">Analytics</h4>
                        <p className="text-gray-400 text-sm">Usage tracking and insights</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Globe className="h-6 w-6 text-cyan-400" />
                      <div>
                        <h4 className="text-white font-semibold">CDN</h4>
                        <p className="text-gray-400 text-sm">Content delivery network</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Incident History */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Recent Incidents</h2>
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Recent Incidents</h3>
                <p className="text-gray-400">
                  All services have been running smoothly. No incidents to report in the last 30 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Performance Metrics */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8">Performance Metrics</h2>
          <div className="grid lg:grid-cols-4 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">99.98%</div>
                <h4 className="text-white font-semibold mb-1">Uptime</h4>
                <p className="text-gray-400 text-sm">Last 90 days</p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">0.8s</div>
                <h4 className="text-white font-semibold mb-1">Response Time</h4>
                <p className="text-gray-400 text-sm">Average API response</p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">2.1M</div>
                <h4 className="text-white font-semibold mb-1">Requests</h4>
                <p className="text-gray-400 text-sm">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">5</div>
                <h4 className="text-white font-semibold mb-1">Regions</h4>
                <p className="text-gray-400 text-sm">Global coverage</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Subscribe to Updates */}
        <section className="text-center">
          <Card className="bg-background shadow-lg shadow-pink-500/20 p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Stay Updated</h3>
            <p className="text-gray-300 mb-6">
              Subscribe to status updates and get notified about any service disruptions.
            </p>
            <div className="flex justify-center space-x-4">
              <Button>Subscribe to Updates</Button>
              <Button variant="outline">RSS Feed</Button>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Status;