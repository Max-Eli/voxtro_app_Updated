import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Lightbulb, Target, Award, Globe, Heart, Zap } from 'lucide-react';
import voxtroLogo from '@/assets/voxtro-logo.png';
import Footer from '@/components/Footer';

const About = () => {
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
        {/* Hero Section */}
        <section className="text-center mb-20">
          <h1 className="text-6xl font-bold text-white mb-6 font-montserrat">
            About Voxtro
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            We're on a mission to revolutionize customer support through intelligent AI agents that understand, 
            engage, and solve problems just like the best human agents—but available 24/7.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="grid lg:grid-cols-2 gap-16 mb-20">
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-2xl">
                <Target className="h-8 w-8 text-pink-400" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                To empower businesses of all sizes with AI-powered customer support that's indistinguishable 
                from human interaction. We believe every customer deserves instant, accurate, and empathetic 
                support, regardless of the time of day or complexity of their inquiry.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-2xl">
                <Zap className="h-8 w-8 text-blue-400" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">
                A world where exceptional customer support is accessible to every business, where AI agents 
                seamlessly integrate with existing workflows, and where customers receive instant, 
                personalized assistance that exceeds their expectations.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Our Story */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Our Story</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Founded in 2024, Voxtro emerged from a simple observation: great customer support 
              shouldn't be a luxury reserved for enterprise companies.
            </p>
          </div>
          
          <Card className="bg-background shadow-lg shadow-pink-500/20">
            <CardContent className="p-12">
              <div className="prose prose-lg prose-invert max-w-none">
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Our founders, experienced engineers and customer success leaders, witnessed firsthand 
                  how small and medium-sized businesses struggled to provide consistent, high-quality 
                  customer support due to resource constraints and the complexity of existing solutions.
                </p>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  We set out to build something different—a platform that could democratize access to 
                  intelligent customer support. By leveraging the latest advances in AI and natural 
                  language processing, we created agents that don't just answer questions, but understand 
                  context, access real-time data, and take meaningful actions.
                </p>
                <p className="text-gray-300 text-lg leading-relaxed">
                  Today, Voxtro powers customer support for thousands of businesses worldwide, from 
                  startups to enterprise companies, helping them deliver exceptional customer experiences 
                  while reducing operational overhead and improving team productivity.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Values */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Our Values</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              The principles that guide everything we do at Voxtro.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Customer-Centric</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Every decision we make starts with our customers. We build features that solve real 
                  problems and create genuine value for businesses and their customers.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Innovation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We push the boundaries of what's possible with AI, constantly exploring new ways to 
                  make customer support more intelligent, efficient, and human-like.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We believe in open communication, clear pricing, and honest relationships with our 
                  customers, partners, and team members.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We're committed to delivering exceptional quality in our product, our service, and 
                  our customer relationships. Excellence is not negotiable.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Accessibility</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Advanced AI should be accessible to businesses of all sizes. We work to make our 
                  platform easy to use, affordable, and scalable.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardHeader>
                <CardTitle className="text-white text-xl">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  We take data security and privacy seriously, implementing industry-leading practices 
                  to protect our customers' information and maintain their trust.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Team Leadership */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-6">Leadership Team</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Meet the leaders driving Voxtro's mission forward.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">AS</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Alex Smith</h3>
                <p className="text-pink-400 mb-4">CEO & Co-Founder</p>
                <p className="text-gray-300 text-sm">
                  Former VP of Engineering at a leading customer support platform. 
                  Passionate about making AI accessible to every business.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">MJ</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Maria Johnson</h3>
                <p className="text-blue-400 mb-4">CTO & Co-Founder</p>
                <p className="text-gray-300 text-sm">
                  AI researcher with 15+ years in machine learning and natural language processing. 
                  Former principal scientist at a major tech company.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-lg shadow-pink-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">DL</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">David Lee</h3>
                <p className="text-green-400 mb-4">VP of Customer Success</p>
                <p className="text-gray-300 text-sm">
                  Customer success leader who has helped scale support operations 
                  for multiple high-growth SaaS companies.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Join Us */}
        <section className="text-center">
          <Card className="bg-background shadow-lg shadow-pink-500/20 p-12">
            <Users className="h-16 w-16 text-pink-400 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-white mb-4">Join Our Mission</h3>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              We're always looking for talented individuals who share our passion for innovation 
              and customer success. Come help us build the future of customer support.
            </p>
            <div className="flex justify-center space-x-4">
              <Button size="lg" asChild>
                <Link to="/careers">View Open Positions</Link>
              </Button>
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

export default About;