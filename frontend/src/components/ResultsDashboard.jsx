import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Home, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { API } from '@/App';
import { toast } from 'sonner';

const ResultsDashboard = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const [interviewRes, analysisRes, responsesRes] = await Promise.all([
        axios.get(`${API}/interviews/${interviewId}`, { withCredentials: true }),
        axios.get(`${API}/interviews/${interviewId}/analysis`, { withCredentials: true }),
        axios.get(`${API}/interviews/${interviewId}/responses`, { withCredentials: true })
      ]);

      setInterview(interviewRes.data);
      setAnalysis(analysisRes.data);
      setResponses(responsesRes.data);
    } catch (error) {
      toast.error('Failed to load results');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score, isStress = false) => {
    if (isStress) {
      if (score < 30) return 'Low';
      if (score < 60) return 'Moderate';
      return 'High';
    } else {
      if (score >= 70) return 'Excellent';
      if (score >= 40) return 'Good';
      return 'Needs Improvement';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const overallStress = analysis?.overall_stress || 0;
  const overallConfidence = analysis?.overall_confidence || 0;
  const detailedResponses = analysis?.detailed_metrics?.responses || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate('/dashboard')}
                data-testid="back-to-dashboard-button"
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Interview Results
                </h1>
                <p className="text-sm text-slate-600">{interview?.category_name}</p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/dashboard')}
              data-testid="home-button"
              variant="outline"
              size="sm"
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Overall Scores */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Stress Score */}
            <Card className="glass-card border-0 shadow-2xl animate-scale-in" data-testid="overall-stress-card">
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Overall Stress Level</CardTitle>
                <CardDescription>Average stress during interview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#f1f5f9"
                        strokeWidth="16"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#fb923c"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${(overallStress / 100) * 502.4} 502.4`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-orange-600" data-testid="overall-stress-value">
                          {overallStress.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {getScoreLabel(overallStress, true)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-slate-600">
                  {overallStress < 50 ? (
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  )}
                  <span className="text-sm">
                    {overallStress < 50 ? 'Good stress management' : 'Room for improvement'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Confidence Score */}
            <Card className="glass-card border-0 shadow-2xl animate-scale-in" data-testid="overall-confidence-card" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-xl text-slate-900">Overall Confidence</CardTitle>
                <CardDescription>Average confidence during interview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#f1f5f9"
                        strokeWidth="16"
                        fill="none"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="#3b82f6"
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={`${(overallConfidence / 100) * 502.4} 502.4`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-blue-600" data-testid="overall-confidence-value">
                          {overallConfidence.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {getScoreLabel(overallConfidence)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center space-x-2 text-slate-600">
                  {overallConfidence >= 70 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm">
                    {overallConfidence >= 70 ? 'Strong performance' : 'Keep practicing'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question-by-Question Analysis */}
          <Card className="glass-card border-0 shadow-xl" data-testid="detailed-analysis-card">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3 text-teal-600" />
                Question-by-Question Analysis
              </CardTitle>
              <CardDescription>Detailed breakdown of your performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {detailedResponses.map((response, index) => (
                  <div
                    key={index}
                    data-testid={`response-analysis-${index}`}
                    className="p-6 rounded-xl bg-white/60 border border-slate-100 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="flex-shrink-0 w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <h4 className="text-slate-900 font-medium">{response.question}</h4>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Stress</span>
                          <span className="font-semibold text-orange-600" data-testid={`stress-value-${index}`}>
                            {response.stress.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={response.stress} className="h-2" data-testid={`stress-bar-${index}`} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Confidence</span>
                          <span className="font-semibold text-blue-600" data-testid={`confidence-value-${index}`}>
                            {response.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={response.confidence} className="h-2" data-testid={`confidence-bar-${index}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="glass-card border-0 shadow-xl" data-testid="recommendations-card">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900">Recommendations</CardTitle>
              <CardDescription>Tips to improve your interview performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overallStress > 60 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Manage Stress</h4>
                    <p className="text-sm text-orange-800">
                      Your stress levels were elevated. Try deep breathing exercises and practice mock interviews more frequently.
                    </p>
                  </div>
                )}
                {overallConfidence < 50 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Build Confidence</h4>
                    <p className="text-sm text-blue-800">
                      Practice answering common questions out loud and record yourself to identify areas for improvement.
                    </p>
                  </div>
                )}
                {overallConfidence >= 70 && overallStress < 40 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Excellent Performance!</h4>
                    <p className="text-sm text-green-800">
                      You demonstrated great confidence with low stress levels. Keep up the great work!
                    </p>
                  </div>
                )}
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <h4 className="font-semibold text-teal-900 mb-2">General Tips</h4>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>• Review the STAR method for behavioral questions</li>
                    <li>• Practice maintaining eye contact with the camera</li>
                    <li>• Prepare specific examples from your experience</li>
                    <li>• Take a moment to think before answering</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 pt-6">
            <Button
              onClick={() => navigate('/interview/setup')}
              data-testid="practice-again-button"
              size="lg"
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-10 py-6 rounded-full text-lg font-semibold shadow-xl transition-all hover:scale-105"
            >
              Practice Again
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              data-testid="view-history-button"
              variant="outline"
              size="lg"
              className="px-10 py-6 rounded-full text-lg font-semibold border-2 border-teal-600 text-teal-600 hover:bg-teal-50 transition-all hover:scale-105"
            >
              View History
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDashboard;
