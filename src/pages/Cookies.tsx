import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Cookie, Settings, Eye, Shield, AlertCircle, CheckCircle2, BarChart3, Globe } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Cookies = () => {
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
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6 font-montserrat">
            Cookie Policy
          </h1>
          <p className="text-xl text-gray-300">
            How we use cookies and similar technologies
          </p>
          <p className="text-gray-400 mt-4">
            Last updated: January 15, 2024
          </p>
        </div>

        {/* What are Cookies */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cookie className="h-6 w-6 text-pink-400" />
                What are Cookies?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                Cookies are small text files that are stored on your device when you visit a website. 
                They help websites remember your preferences, improve your experience, and provide 
                analytics about how the site is used. We use cookies and similar technologies to 
                enhance your experience with Voxtro.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Types of Cookies */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Types of Cookies We Use</h2>
          
          <div className="space-y-6">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-6 w-6 text-green-400" />
                    Essential Cookies
                  </CardTitle>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500">Required</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  These cookies are necessary for the website to function properly. They cannot be disabled 
                  as they are essential for core functionality.
                </p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Authentication and session management</li>
                  <li>• Security and fraud prevention</li>
                  <li>• Load balancing and performance optimization</li>
                  <li>• Remember your privacy preferences</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="h-6 w-6 text-blue-400" />
                    Functional Cookies
                  </CardTitle>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  These cookies enable enhanced functionality and personalization, but the site can 
                  function without them.
                </p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Remember your language and region preferences</li>
                  <li>• Customize the user interface based on your settings</li>
                  <li>• Remember form data and user inputs</li>
                  <li>• Provide personalized content and recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-purple-400" />
                    Analytics Cookies
                  </CardTitle>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  These cookies help us understand how visitors interact with our website by collecting 
                  and reporting information anonymously.
                </p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Track page visits and user behavior patterns</li>
                  <li>• Measure website performance and loading times</li>
                  <li>• Understand which features are most popular</li>
                  <li>• Identify and fix technical issues</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="h-6 w-6 text-orange-400" />
                    Marketing Cookies
                  </CardTitle>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  These cookies are used to deliver personalized advertisements and measure the 
                  effectiveness of marketing campaigns.
                </p>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Show relevant ads based on your interests</li>
                  <li>• Prevent the same ad from being shown repeatedly</li>
                  <li>• Measure advertising campaign effectiveness</li>
                  <li>• Enable social media sharing features</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Third Party Cookies */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Third-Party Services</h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-6">
                We use trusted third-party services that may set their own cookies. These services 
                help us provide better functionality and insights:
              </p>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Analytics & Performance</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Google Analytics - Website usage analytics</li>
                    <li>• Mixpanel - Product analytics and insights</li>
                    <li>• Sentry - Error tracking and monitoring</li>
                    <li>• Cloudflare - CDN and security services</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Marketing & Communication</h3>
                  <ul className="text-gray-300 space-y-2 text-sm">
                    <li>• Intercom - Customer messaging and support</li>
                    <li>• Mailchimp - Email marketing campaigns</li>
                    <li>• LinkedIn Insights - Professional targeting</li>
                    <li>• Google Ads - Advertising and retargeting</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Managing Cookies */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Managing Your Cookie Preferences</h2>
          
          <div className="space-y-6">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Cookie Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  You can manage your cookie preferences through our cookie banner when you first 
                  visit our site, or by clicking the "Cookie Settings" link in our footer.
                </p>
                <div className="flex space-x-4">
                  <Button>Manage Cookie Preferences</Button>
                  <Button variant="outline">Accept All Cookies</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Browser Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  You can also control cookies through your browser settings. Most browsers allow you to:
                </p>
                <ul className="text-gray-300 space-y-2 text-sm mb-4">
                  <li>• View cookies that have been set and delete them individually</li>
                  <li>• Block third-party cookies</li>
                  <li>• Block all cookies from specific sites</li>
                  <li>• Block all cookies from being set</li>
                  <li>• Delete all cookies when you close your browser</li>
                </ul>
                <div className="grid lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-white font-semibold mb-2">Desktop Browsers</h4>
                    <ul className="text-gray-300 space-y-1">
                      <li>• Chrome: Settings → Privacy and security → Cookies</li>
                      <li>• Firefox: Preferences → Privacy & Security</li>
                      <li>• Safari: Preferences → Privacy</li>
                      <li>• Edge: Settings → Cookies and site permissions</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-2">Mobile Browsers</h4>
                    <ul className="text-gray-300 space-y-1">
                      <li>• Chrome Mobile: Settings → Site settings → Cookies</li>
                      <li>• Safari iOS: Settings → Safari → Privacy & Security</li>
                      <li>• Samsung Internet: Settings → Sites and downloads</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cookie Retention */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Cookie Retention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Different types of cookies are retained for different periods:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Session Cookies</h3>
                  <p className="text-gray-300 text-sm">
                    Temporary cookies that are deleted when you close your browser. Used for essential 
                    functionality like maintaining your login session.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Persistent Cookies</h3>
                  <p className="text-gray-300 text-sm">
                    Stored on your device for a specific period or until manually deleted. Retention 
                    periods range from 30 days to 2 years depending on the cookie's purpose.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Impact of Disabling Cookies */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Impact of Disabling Cookies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                While you can use our website with cookies disabled, some functionality may be limited:
              </p>
              <ul className="text-gray-300 space-y-2 text-sm">
                <li>• You may need to log in repeatedly</li>
                <li>• Your preferences and settings may not be saved</li>
                <li>• Some features may not work as expected</li>
                <li>• You may see less relevant content and advertisements</li>
                <li>• We may not be able to provide personalized experiences</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Updates to Cookie Policy */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Updates to This Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                We may update this Cookie Policy from time to time to reflect changes in our practices 
                or for other operational, legal, or regulatory reasons. We will notify you of any 
                material changes by updating the "Last updated" date at the top of this policy.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section>
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Questions About Cookies?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                If you have questions about our use of cookies or this policy, please contact us:
              </p>
              <div className="space-y-2 text-gray-300">
                <div><strong>Email:</strong> privacy@voxtro.com</div>
                <div><strong>Mail:</strong> Voxtro Privacy Team, 123 Innovation Drive, San Francisco, CA 94105</div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Cookies;