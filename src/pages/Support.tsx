import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageCircle, Mail, Phone, Clock, HelpCircle, Book, Users } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import { useState } from 'react';
import { toast } from 'sonner';
import Footer from '@/components/Footer';
import { sendContactForm } from '@/integrations/api/endpoints/notifications';

const Support = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await sendContactForm({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        subject: formData.subject,
        message: formData.message
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ firstName: '', lastName: '', email: '', subject: '', message: '' });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
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
            Support Center
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Get help when you need it. Our support team is here to ensure your success with Voxtro.
          </p>
        </div>

        {/* Quick Help Options */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-1 gap-8 max-w-md mx-auto">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Book className="h-8 w-8 text-pink-400" />
                  <CardTitle className="text-white">Documentation</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Find answers in our comprehensive documentation and guides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">
                  Browse through detailed documentation, API references, and step-by-step tutorials.
                </p>
                <Button className="w-full" asChild>
                  <Link to="/docs">View Documentation</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Form */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold text-white mb-8">Get in Touch</h2>
              <Card className="bg-background shadow-lg shadow-pink-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Send us a message</CardTitle>
                  <CardDescription className="text-gray-400">
                    We'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                        <Input 
                          id="firstName" 
                          className="bg-gray-800 border-gray-700 text-white" 
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                        <Input 
                          id="lastName" 
                          className="bg-gray-800 border-gray-700 text-white" 
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email" className="text-gray-300">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        className="bg-gray-800 border-gray-700 text-white" 
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="subject" className="text-gray-300">Subject</Label>
                      <Input 
                        id="subject" 
                        className="bg-gray-800 border-gray-700 text-white" 
                        placeholder="How can we help?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="message" className="text-gray-300">Message</Label>
                      <Textarea 
                        id="message" 
                        className="bg-gray-800 border-gray-700 text-white min-h-[120px]" 
                        placeholder="Tell us about your issue or question..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Sending..." : "Send Message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-8">Contact Information</h2>
              <div className="space-y-6">
                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Mail className="h-6 w-6 text-pink-400" />
                      <div>
                        <h3 className="text-white font-semibold">Email Support</h3>
                        <p className="text-gray-400">info@voxtro.io</p>
                        <p className="text-gray-500 text-sm">We respond within 24 hours</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-pink-400" />
                  How do I get started?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Simply sign up for an account, create your first AI agent, and follow our quick start guide 
                  to configure and deploy your agent in minutes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-pink-400" />
                  What integrations are supported?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We support popular tools like Slack, Zendesk, Salesforce, Stripe, and many more. 
                  You can also connect custom APIs and webhooks.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-pink-400" />
                  Is my data secure?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Yes, we are SOC 2 Type II and GDPR compliant. All data is encrypted at rest and in transit, 
                  and we never use your data to train our models.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-pink-400" />
                  Can I customize the agent's behavior?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Absolutely! You can customize your agent's personality, knowledge base, response patterns, 
                  and configure when to escalate to human agents.
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

export default Support;