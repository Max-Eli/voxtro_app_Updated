import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageSquare, Users, Building2, Globe, MessageCircleQuestion, CheckCircle, HelpCircle, Briefcase } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Contact = () => {
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
            Contact Us
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have questions about Voxtro? Want to see a demo? Looking to partner with us? 
            We'd love to hear from you.
          </p>
        </div>

        {/* Contact Methods */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-pink-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Sales Inquiries</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Interested in Voxtro for your business?
                </p>
                <Button className="w-full">
                  Talk to Sales
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <HelpCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">Support</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Need help with your account or product?
                </p>
                <Button className="w-full" asChild>
                  <Link to="/support">Get Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Form and Info */}
        <section className="grid lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Send us a message</h2>
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Get in Touch</CardTitle>
                <CardDescription className="text-gray-400">
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-gray-300">First Name *</Label>
                      <Input 
                        id="firstName" 
                        required
                        className="bg-gray-800 border-gray-700 text-white" 
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-gray-300">Last Name *</Label>
                      <Input 
                        id="lastName" 
                        required
                        className="bg-gray-800 border-gray-700 text-white" 
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-gray-300">Work Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required
                      className="bg-gray-800 border-gray-700 text-white" 
                      placeholder="john@company.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="company" className="text-gray-300">Company</Label>
                    <Input 
                      id="company" 
                      className="bg-gray-800 border-gray-700 text-white" 
                      placeholder="Acme Inc."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone" className="text-gray-300">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      className="bg-gray-800 border-gray-700 text-white" 
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <Label htmlFor="inquiry" className="text-gray-300">Inquiry Type *</Label>
                    <Select required>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select inquiry type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales & Pricing</SelectItem>
                        <SelectItem value="demo">Request a Demo</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="message" className="text-gray-300">Message *</Label>
                    <Textarea 
                      id="message" 
                      required
                      className="bg-gray-800 border-gray-700 text-white min-h-[120px]" 
                      placeholder="Tell us about your needs, questions, or how we can help..."
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    * Required fields
                  </div>
                  
                  <Button className="w-full" size="lg">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-8">Contact Information</h2>
            <div className="space-y-8">
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <Mail className="h-8 w-8 text-pink-400 mt-1" />
                    <div>
                      <h3 className="text-white text-lg font-semibold mb-2">Email Us</h3>
                      <div className="text-gray-300">
                        <div>
                          <span className="font-medium">General inquiries:</span> info@voxtro.io
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Quick answers to common questions</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">How quickly can I get started?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  You can create and deploy your first AI agent in under 30 minutes. 
                  Sign up, configure your agent, and embed it on your website with just a few clicks.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Do you offer custom integrations?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Yes! We can build custom integrations for Enterprise customers. 
                  Contact our sales team to discuss your specific requirements.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">What's your uptime guarantee?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We maintain 99.9% uptime SLA for all paid plans, with 99.99% uptime SLA 
                  available for Enterprise customers.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white">Can I try Voxtro before purchasing?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Absolutely! We offer a free trial with no credit card required. 
                  You can also schedule a personalized demo with our team.
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

export default Contact;