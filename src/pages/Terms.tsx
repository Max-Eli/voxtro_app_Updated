import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Scale, Shield, Eye, Lock, Cookie, FileText, AlertTriangle, CreditCard, Users } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Terms = () => {
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
            Terms of Service
          </h1>
          <p className="text-xl text-gray-300">
            The terms and conditions for using Voxtro services
          </p>
          <p className="text-gray-400 mt-4">
            Last updated: January 15, 2024
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="h-6 w-6 text-pink-400" />
                Agreement to Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                These Terms of Service ("Terms") govern your use of the Voxtro platform and services. 
                By accessing or using our services, you agree to be bound by these Terms. If you disagree 
                with any part of these terms, then you may not access our services.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Service Description */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-400" />
            Service Description
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <p className="text-gray-300 mb-4">
                Voxtro provides an AI-powered customer support platform that enables businesses to:
              </p>
              <ul className="text-gray-300 space-y-2 mb-6">
                <li>• Create and deploy AI agents for customer interactions</li>
                <li>• Integrate with existing business systems and workflows</li>
                <li>• Access analytics and insights about customer interactions</li>
                <li>• Manage and monitor AI agent performance</li>
              </ul>
              <p className="text-gray-300">
                We reserve the right to modify, suspend, or discontinue any part of our services at any 
                time with or without notice. We will not be liable to you or any third party for any 
                modification, price change, suspension, or discontinuance of the services.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* User Accounts */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <Users className="h-8 w-8 text-green-400" />
            User Accounts and Responsibilities
          </h2>
          
          <div className="space-y-6">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Account Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li>• You must provide accurate and complete information when creating an account</li>
                  <li>• You are responsible for maintaining the confidentiality of your account credentials</li>
                  <li>• You must be at least 18 years old to create an account</li>
                  <li>• One person or legal entity may not maintain more than one account</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Acceptable Use</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">You agree not to use our services to:</p>
                <ul className="text-gray-300 space-y-2">
                  <li>• Violate any applicable laws or regulations</li>
                  <li>• Infringe on intellectual property rights</li>
                  <li>• Transmit harmful, offensive, or inappropriate content</li>
                  <li>• Attempt to gain unauthorized access to our systems</li>
                  <li>• Use our services for any illegal or fraudulent activities</li>
                  <li>• Reverse engineer, decompile, or disassemble our software</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Payment Terms */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-purple-400" />
            Payment Terms
          </h2>
          
          <div className="space-y-6">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Billing and Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-300 space-y-2">
                  <li>• Subscription fees are billed in advance on a monthly or annual basis</li>
                  <li>• All fees are non-refundable except as required by law</li>
                  <li>• We may change our pricing with 30 days' notice</li>
                  <li>• Late payments may result in service suspension</li>
                  <li>• You are responsible for all applicable taxes</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Refunds and Cancellations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  You may cancel your subscription at any time. Cancellations take effect at the end of 
                  your current billing period. We do not provide refunds for partial months of service.
                </p>
                <p className="text-gray-300">
                  For annual subscriptions, you may request a pro-rated refund within 30 days of your 
                  initial purchase if you have not used more than 20% of your included usage limits.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Intellectual Property */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Our Rights</h3>
                  <p className="text-gray-300 text-sm">
                    All rights, title, and interest in the Voxtro platform, including all intellectual 
                    property rights, remain our exclusive property. You may not copy, modify, distribute, 
                    sell, or lease any part of our services.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Your Content</h3>
                  <p className="text-gray-300 text-sm">
                    You retain ownership of any content you provide to our services. By using our services, 
                    you grant us a license to use your content solely for the purpose of providing services 
                    to you.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">AI Training Data</h3>
                  <p className="text-gray-300 text-sm">
                    We do not use your data, conversations, or content to train our AI models or improve 
                    our services for other customers. Your data remains private and confidential.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Privacy and Data */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Privacy and Data Protection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                Your privacy is important to us. Our collection and use of personal information is governed 
                by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <p className="text-gray-300 mb-4">
                We implement appropriate technical and organizational measures to ensure a level of security 
                appropriate to the risk, including encryption, access controls, and regular security audits.
              </p>
              <p className="text-gray-300">
                You are responsible for ensuring that any personal data you provide or process through our 
                services complies with applicable privacy laws and regulations.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Service Level Agreement */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Service Level Agreement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Uptime Commitment</h3>
                  <p className="text-gray-300 text-sm">
                    We strive to maintain 99.9% uptime for our services. In the event of service 
                    interruptions, we will work to restore service as quickly as possible.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Support Response Times</h3>
                  <p className="text-gray-300 text-sm">
                    We aim to respond to support requests within 24 hours for standard plans and 
                    4 hours for enterprise plans during business hours.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Maintenance</h3>
                  <p className="text-gray-300 text-sm">
                    We may perform scheduled maintenance with advance notice. Emergency maintenance 
                    may be performed without notice when necessary to protect service security or integrity.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            Limitation of Liability
          </h2>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Disclaimer of Warranties</h3>
                  <p className="text-gray-300 text-sm">
                    Our services are provided "as is" and "as available" without warranties of any kind, 
                    either express or implied, including but not limited to implied warranties of 
                    merchantability, fitness for a particular purpose, or non-infringement.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Limitation of Damages</h3>
                  <p className="text-gray-300 text-sm">
                    To the maximum extent permitted by law, our total liability for any claims arising 
                    out of or relating to these Terms or our services shall not exceed the amount you 
                    paid us in the 12 months preceding the claim.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">AI Service Limitations</h3>
                  <p className="text-gray-300 text-sm">
                    AI-generated responses may not always be accurate, appropriate, or complete. You are 
                    responsible for reviewing and monitoring AI interactions with your customers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Termination */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Termination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Termination by You</h3>
                  <p className="text-gray-300 text-sm">
                    You may terminate your account at any time by contacting us or using the account 
                    settings in your dashboard. Termination will be effective at the end of your current 
                    billing period.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Termination by Us</h3>
                  <p className="text-gray-300 text-sm">
                    We may suspend or terminate your account immediately if you violate these Terms, 
                    fail to pay fees when due, or if we reasonably believe such action is necessary 
                    to protect our services or other users.
                  </p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Effect of Termination</h3>
                  <p className="text-gray-300 text-sm">
                    Upon termination, your right to use our services will cease immediately. We may 
                    delete your data after a reasonable grace period, but are not obligated to do so.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Governing Law */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Governing Law and Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                These Terms are governed by the laws of the State of California, without regard to 
                conflict of law principles. Any disputes arising from these Terms or our services 
                will be resolved through binding arbitration in San Francisco, California.
              </p>
              <p className="text-gray-300">
                You agree to resolve any disputes individually and waive any right to participate in 
                class action lawsuits or class-wide arbitration.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Changes to Terms */}
        <section className="mb-12">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Changes to Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                We reserve the right to modify these Terms at any time. We will notify you of material 
                changes by email or through our services at least 30 days before they take effect. 
                Your continued use of our services after the changes take effect constitutes acceptance 
                of the new Terms.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Contact Information */}
        <section>
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="space-y-2 text-gray-300">
                <div><strong>Email:</strong> legal@voxtro.com</div>
                <div><strong>Mail:</strong> Voxtro Legal Team, 123 Innovation Drive, San Francisco, CA 94105</div>
                <div><strong>Phone:</strong> +1 (555) 123-4567</div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;