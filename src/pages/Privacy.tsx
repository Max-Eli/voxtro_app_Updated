import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Eye, Lock, Database, Users, Globe, FileText } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Privacy = () => {
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
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-300">
            How we collect, use, and protect your information
          </p>
          <p className="text-gray-400 mt-4">
            Last updated: January 15, 2024
          </p>
        </div>

        {/* Privacy Overview */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-pink-400" />
                Our Commitment to Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                At Voxtro, we take your privacy seriously. This Privacy Policy explains how we collect, 
                use, disclose, and safeguard your information when you use our AI agent platform and services. 
                We are committed to protecting your personal information and your right to privacy.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Information We Collect */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Database className="h-8 w-8 text-blue-400" />
            Information We Collect
          </h2>
          
          <div className="space-y-6">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  We collect personal information that you voluntarily provide to us when you:
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Register for an account</li>
                  <li>• Use our services</li>
                  <li>• Contact us for support</li>
                  <li>• Subscribe to our newsletter</li>
                  <li>• Participate in surveys or promotions</li>
                </ul>
                <p className="text-gray-300 mt-4">
                  This may include: name, email address, phone number, company information, 
                  payment details, and any other information you choose to provide.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Usage Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  We automatically collect certain information when you use our services:
                </p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Device information (IP address, browser type, operating system)</li>
                  <li>• Usage patterns and preferences</li>
                  <li>• Log files and analytics data</li>
                  <li>• Cookies and similar tracking technologies</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">AI Training Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  <strong>Important:</strong> We do not use your conversations, documents, or any customer 
                  data to train our AI models. Your data remains private and is only used to provide 
                  services to you and your organization.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Eye className="h-8 w-8 text-green-400" />
            How We Use Your Information
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-6">
                We use the information we collect for the following purposes:
              </p>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Service Delivery</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Provide and maintain our services</li>
                    <li>• Process transactions and payments</li>
                    <li>• Provide customer support</li>
                    <li>• Send service-related communications</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Improvement & Analytics</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Analyze usage patterns and trends</li>
                    <li>• Improve our services and develop new features</li>
                    <li>• Conduct research and analytics</li>
                    <li>• Ensure security and prevent fraud</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Communication</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Send important updates and notifications</li>
                    <li>• Respond to inquiries and support requests</li>
                    <li>• Send marketing communications (with consent)</li>
                    <li>• Conduct surveys and gather feedback</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Legal Compliance</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Comply with legal obligations</li>
                    <li>• Enforce our terms of service</li>
                    <li>• Protect rights and prevent misuse</li>
                    <li>• Resolve disputes and legal claims</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Sharing */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-400" />
            Information Sharing
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-6">
                We do not sell, trade, or rent your personal information. We may share your information 
                in the following limited circumstances:
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Service Providers</h3>
                  <p className="text-gray-300 text-sm">
                    We may share information with trusted third-party service providers who assist us in 
                    operating our business (hosting, payment processing, analytics, customer support).
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Legal Requirements</h3>
                  <p className="text-gray-300 text-sm">
                    We may disclose information when required by law, court order, or to protect our 
                    rights, safety, or the rights and safety of others.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Business Transfers</h3>
                  <p className="text-gray-300 text-sm">
                    In the event of a merger, acquisition, or sale of assets, your information may be 
                    transferred as part of the transaction.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">With Your Consent</h3>
                  <p className="text-gray-300 text-sm">
                    We may share information with your explicit consent or at your direction.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Security */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Lock className="h-8 w-8 text-red-400" />
            Data Security
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-6">
                We implement appropriate technical and organizational security measures to protect your 
                personal information:
              </p>
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-white font-semibold mb-3">Technical Safeguards</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• AES-256 encryption for data at rest</li>
                    <li>• TLS 1.3 encryption for data in transit</li>
                    <li>• Regular security audits and penetration testing</li>
                    <li>• Secure cloud infrastructure</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-3">Organizational Measures</h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Access controls and authentication</li>
                    <li>• Employee security training</li>
                    <li>• Data processing agreements</li>
                    <li>• Incident response procedures</li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>Note:</strong> While we use industry-standard security measures, no method of 
                  transmission over the internet is 100% secure. We cannot guarantee absolute security 
                  but are committed to protecting your information.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <FileText className="h-8 w-8 text-orange-400" />
            Your Rights
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-6">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              <div className="space-y-4">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-white font-semibold mb-2">Access & Portability</h3>
                    <p className="text-gray-300 text-sm">
                      Request a copy of your personal information and receive it in a portable format.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Correction</h3>
                    <p className="text-gray-300 text-sm">
                      Update or correct inaccurate or incomplete personal information.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Deletion</h3>
                    <p className="text-gray-300 text-sm">
                      Request deletion of your personal information, subject to certain exceptions.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Opt-out</h3>
                    <p className="text-gray-300 text-sm">
                      Opt-out of marketing communications and certain data processing activities.
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-gray-300 text-sm">
                    To exercise these rights, please contact us at privacy@voxtro.com. 
                    We will respond to your request within 30 days.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                We use cookies and similar technologies to enhance your experience, analyze usage, 
                and provide personalized content. You can control cookie settings through your browser.
              </p>
              <p className="text-gray-300">
                For detailed information about our cookie usage, please see our 
                <Link to="/cookies" className="text-pink-400 hover:text-pink-300 ml-1">Cookie Policy</Link>.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-2 text-gray-300">
                <div><strong>Email:</strong> privacy@voxtro.com</div>
                <div><strong>Mail:</strong> Voxtro Privacy Team, 123 Innovation Drive, San Francisco, CA 94105</div>
                <div><strong>Phone:</strong> +1 (555) 123-4567</div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Updates */}
        <section>
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Policy Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                We may update this Privacy Policy from time to time. We will notify you of any material 
                changes by posting the new policy on this page and updating the "Last updated" date. 
                Your continued use of our services after any changes constitutes acceptance of the new policy.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Privacy;