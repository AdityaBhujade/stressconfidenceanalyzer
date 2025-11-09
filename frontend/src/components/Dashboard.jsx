import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Plus, History, BarChart3, Clock, CheckCircle } from 'lucide-react';
import { API } from '@/App';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, interviewsRes] = await Promise.all([
        axios.get(`${API}/auth/me`, { withCredentials: true }),
        axios.get(`${API}/interviews`, { withCredentials: true })
      ]);
      setUser(userRes.data);
      setInterviews(interviewsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  const completedInterviews = interviews.filter(i => i.status === 'completed');
  const inProgressInterviews = interviews.filter(i => i.status === 'in_progress');
  const avgStress = completedInterviews.length > 0
    ? (completedInterviews.reduce((sum, i) => sum + (i.overall_stress_score || 0), 0) / completedInterviews.length).toFixed(1)
    : 0;
  const avgConfidence = completedInterviews.length > 0
    ? (completedInterviews.reduce((sum, i) => sum + (i.overall_confidence_score || 0), 0) / completedInterviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              InterviewAI
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-teal-200"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                data-testid="logout-button"
                variant="outline"
                size="sm"
                className="border-slate-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="glass-card border-0 hover:shadow-xl transition-shadow" data-testid="total-interviews-card">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-600">Total Interviews</CardDescription>
                <CardTitle className="text-4xl font-bold text-teal-600">{interviews.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-slate-500">
                  <History className="w-4 h-4 mr-2" />
                  All time
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 hover:shadow-xl transition-shadow" data-testid="completed-interviews-card">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-600">Completed</CardDescription>
                <CardTitle className="text-4xl font-bold text-green-600">{completedInterviews.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-slate-500">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finished sessions
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 hover:shadow-xl transition-shadow" data-testid="avg-stress-card">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-600">Avg. Stress</CardDescription>
                <CardTitle className="text-4xl font-bold text-orange-600">{avgStress}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-slate-500">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Lower is better
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 hover:shadow-xl transition-shadow" data-testid="avg-confidence-card">
              <CardHeader className="pb-3">
                <CardDescription className="text-slate-600">Avg. Confidence</CardDescription>
                <CardTitle className="text-4xl font-bold text-blue-600">{avgConfidence}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-slate-500">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Higher is better
                </div>
              </CardContent>
            </Card>
          </div>

          {/* New Interview Button */}
          <div className="flex justify-center py-8">
            <Button
              onClick={() => navigate('/interview/setup')}
              data-testid="start-new-interview-button"
              size="lg"
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-12 py-7 rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all hover:scale-105"
            >
              <Plus className="w-6 h-6 mr-3" />
              Start New Interview
            </Button>
          </div>

          {/* Interview History */}
          <Card className="glass-card border-0 shadow-xl" data-testid="interview-history">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-slate-900">Interview History</CardTitle>
              <CardDescription>Your recent interview sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg">No interviews yet</p>
                  <p className="text-slate-400 text-sm">Start your first interview to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => (
                    <div
                      key={interview.id}
                      data-testid={`interview-item-${interview.id}`}
                      className="flex items-center justify-between p-5 rounded-xl bg-white/60 hover:bg-white/80 border border-slate-100 transition-all hover:shadow-md cursor-pointer"
                      onClick={() => {
                        if (interview.status === 'completed') {
                          navigate(`/results/${interview.id}`);
                        } else {
                          navigate(`/interview/${interview.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          interview.status === 'completed' ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          {interview.status === 'completed' ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <Clock className="w-6 h-6 text-orange-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{interview.category_name}</h3>
                          <p className="text-sm text-slate-500">{formatDate(interview.started_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        {interview.status === 'completed' && (
                          <>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Stress</p>
                              <p className="text-lg font-bold text-orange-600">
                                {interview.overall_stress_score?.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">Confidence</p>
                              <p className="text-lg font-bold text-blue-600">
                                {interview.overall_confidence_score?.toFixed(1)}%
                              </p>
                            </div>
                          </>
                        )}
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                          interview.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {interview.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
