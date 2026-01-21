import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BriefcaseIcon, MapPin, Clock, Users, Code, Zap, Coffee, Brain, Briefcase, Heart } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const Careers = () => {
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
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold text-white mb-6 font-montserrat">
            Join Our Team
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Help us build the future of AI-powered customer support. We're looking for passionate individuals 
            who want to make a real impact on how businesses interact with their customers.
          </p>
        </div>

        {/* Why Work at Voxtro */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Why Work at Voxtro?</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join a team that's passionate about innovation, growth, and making a difference.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Brain className="h-6 w-6 text-pink-400" />
                  Cutting-Edge Technology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Work with the latest AI technologies and help shape the future of conversational AI. 
                  From large language models to advanced NLP techniques, you'll be at the forefront of innovation.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-6 w-6 text-blue-400" />
                  Collaborative Culture
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Join a diverse, inclusive team where every voice matters. We believe the best ideas come 
                  from collaboration and different perspectives working together.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Heart className="h-6 w-6 text-red-400" />
                  Impact & Purpose
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Your work directly impacts thousands of businesses and millions of their customers. 
                  See the real-world effects of your contributions every day.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-green-400" />
                  Growth Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Fast-growing company means fast-growing careers. We invest in our people with 
                  learning budgets, mentorship programs, and clear paths for advancement.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Open Positions */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Open Positions</h2>
            <p className="text-xl text-gray-400">
              Find your next career opportunity with us.
            </p>
          </div>

          <div className="space-y-6">
            {/* Engineering */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Code className="h-6 w-6 text-pink-400" />
                Engineering
              </h3>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">Senior Full-Stack Engineer</CardTitle>
                        <CardDescription className="text-gray-400">
                          Build and scale our core platform architecture
                        </CardDescription>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500">New</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / San Francisco
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      We're looking for an experienced engineer to help build scalable systems that power 
                      AI agents for thousands of customers worldwide.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">AI/ML Engineer</CardTitle>
                        <CardDescription className="text-gray-400">
                          Develop next-generation AI conversation models
                        </CardDescription>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500">Featured</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / New York
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Join our AI team to research and implement cutting-edge machine learning techniques 
                      for conversational AI and natural language understanding.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Frontend Engineer</CardTitle>
                    <CardDescription className="text-gray-400">
                      Create beautiful, intuitive user experiences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / London
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Build responsive, accessible web applications using React, TypeScript, and modern 
                      frontend technologies to power our customer dashboard.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">DevOps Engineer</CardTitle>
                    <CardDescription className="text-gray-400">
                      Scale infrastructure for global AI workloads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / Austin
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Build and maintain cloud infrastructure, CI/CD pipelines, and monitoring systems 
                      that support millions of AI interactions daily.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Product & Design */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-blue-400" />
                Product & Design
              </h3>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Senior Product Manager</CardTitle>
                    <CardDescription className="text-gray-400">
                      Drive product strategy and roadmap
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / Seattle
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Lead product development for our AI agent platform, working closely with 
                      engineering, design, and customers to deliver impactful features.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">UX/UI Designer</CardTitle>
                    <CardDescription className="text-gray-400">
                      Design intuitive interfaces for complex AI systems
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / Los Angeles
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Create user-centered designs that make complex AI functionality accessible 
                      to users of all technical backgrounds.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Business */}
            <div>
              <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-green-400" />
                Business
              </h3>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Customer Success Manager</CardTitle>
                    <CardDescription className="text-gray-400">
                      Help customers achieve success with AI agents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / Chicago
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Work directly with our customers to ensure they're getting maximum value 
                      from their AI agents and achieving their support goals.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>

                <Card className="bg-background shadow-lg shadow-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Sales Development Representative</CardTitle>
                    <CardDescription className="text-gray-400">
                      Generate and qualify leads for our sales team
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Remote / Miami
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Full-time
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Help businesses discover how AI can transform their customer support. 
                      Perfect for someone passionate about AI and customer success.
                    </p>
                    <Button className="w-full">Apply Now</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Benefits & Perks</h2>
            <p className="text-xl text-gray-400">
              We take care of our team so they can do their best work.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-4">Health & Wellness</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Comprehensive health insurance</li>
                  <li>• Dental and vision coverage</li>
                  <li>• Mental health support</li>
                  <li>• Fitness stipend</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-4">Work-Life Balance</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Flexible working hours</li>
                  <li>• Remote-first culture</li>
                  <li>• Unlimited PTO policy</li>
                  <li>• Quarterly company retreats</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-4">Growth & Learning</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• $2,000 annual learning budget</li>
                  <li>• Conference attendance</li>
                  <li>• Internal mentorship program</li>
                  <li>• Equity participation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Apply */}
        <section className="text-center">
          <Card className="bg-background shadow-lg shadow-pink-500/20 p-12">
            <h3 className="text-3xl font-bold text-white mb-4">Don't See a Perfect Fit?</h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              We're always interested in hearing from talented individuals. 
              Send us your resume and tell us how you'd like to contribute to our mission.
            </p>
            <div className="flex justify-center space-x-4">
              <Button size="lg">Send General Application</Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/contact">Get in Touch</Link>
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;