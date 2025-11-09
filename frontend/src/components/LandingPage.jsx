import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Video, BarChart3, Shield, Sparkles } from 'lucide-react';
import { API } from '@/App';
import { toast } from 'sonner';

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAuth = async () => {
      // Check for session_id in URL fragment
      const hash = location.hash;
      const sessionIdMatch = hash.match(/session_id=([^&]+)/);

      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        setIsProcessing(true);

        try {
          await axios.post(
            `${API}/auth/session`,
            { session_id: sessionId },
            { withCredentials: true }
          );

          // Clean URL
          window.history.replaceState({}, document.title, '/dashboard');
          navigate('/dashboard', { replace: true });
        } catch (error) {
          toast.error('Authentication failed');
          setIsProcessing(false);
          setIsLoading(false);
        }
        return;
      }

      // Check if already authenticated
      try {
        await axios.get(`${API}/auth/me`, { withCredentials: true });
        navigate('/dashboard', { replace: true });
      } catch (error) {
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [navigate, location]);

  const handleLogin = () => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  if (isLoading || isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-teal-600 mx-auto"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative">
        {/* Header */}
        <header className="container mx-auto px-6 py-8">
          <nav className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <Video className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                InterviewAI
              </span>
            </div>
            <Button
              onClick={handleLogin}
              data-testid="login-button"
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-6 rounded-full text-base font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              Sign In
            </Button>
          </nav>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <div className="space-y-8 animate-fade-in">
                <div className="inline-flex items-center space-x-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>AI-Powered Interview Analysis</span>
                </div>

                <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                  Master Your
                  <span className="block mt-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Interview Confidence
                  </span>
                </h1>

                <p className="text-xl text-slate-600 leading-relaxed">
                  Analyze your stress levels and confidence in real-time during practice interviews.
                  Get detailed insights to improve your performance.
                </p>

                <Button
                  onClick={handleLogin}
                  data-testid="get-started-button"
                  size="lg"
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-10 py-7 rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
                >
                  Start Your Free Practice
                </Button>
              </div>

              {/* Right Content - Feature Cards */}
              <div className="space-y-6 animate-slide-in-right">
                <div className="glass-card rounded-2xl p-8 hover:shadow-2xl transition-all hover:scale-105">
                  <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <Video className="w-7 h-7 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Video & Audio Recording</h3>
                  <p className="text-slate-600">
                    Practice with real interview conditions using camera and microphone for authentic experience.
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-8 hover:shadow-2xl transition-all hover:scale-105">
                  <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-7 h-7 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Detailed Analytics</h3>
                  <p className="text-slate-600">
                    Comprehensive stress and confidence metrics for every question and overall performance.
                  </p>
                </div>

                <div className="glass-card rounded-2xl p-8 hover:shadow-2xl transition-all hover:scale-105">
                  <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <Shield className="w-7 h-7 text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Multiple Categories</h3>
                  <p className="text-slate-600">
                    Choose from Technical, HR, or Behavioral interviews with pre-loaded questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
                Why Choose InterviewAI?
              </h2>
              <p className="text-xl text-slate-600">
                Everything you need to ace your next interview
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <span className="text-3xl font-bold text-white">📊</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Real-time Analysis</h3>
                <p className="text-slate-600">
                  Get instant feedback on your stress levels and confidence during the interview.
                </p>
              </div>

              <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <span className="text-3xl font-bold text-white">🎯</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Custom Questions</h3>
                <p className="text-slate-600">
                  Add your own questions alongside our pre-populated interview questions.
                </p>
              </div>

              <div className="text-center space-y-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <span className="text-3xl font-bold text-white">📈</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Track Progress</h3>
                <p className="text-slate-600">
                  View detailed dashboards and track your improvement over multiple sessions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
