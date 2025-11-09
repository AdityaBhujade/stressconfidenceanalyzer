import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { API } from '@/App';
import { toast } from 'sonner';

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchQuestions(selectedCategory.id);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`, { withCredentials: true });
      setCategories(res.data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (categoryId) => {
    try {
      const res = await axios.get(`${API}/questions/${categoryId}`, { withCredentials: true });
      setQuestions(res.data);
    } catch (error) {
      toast.error('Failed to load questions');
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      const res = await axios.post(
        `${API}/questions`,
        { category_id: selectedCategory.id, text: newQuestion },
        { withCredentials: true }
      );
      setQuestions([...questions, res.data]);
      setNewQuestion('');
      toast.success('Question added');
    } catch (error) {
      toast.error('Failed to add question');
    }
  };

  const handleStartInterview = async () => {
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    setStarting(true);
    try {
      const res = await axios.post(
        `${API}/interviews`,
        { category_id: selectedCategory.id },
        { withCredentials: true }
      );
      navigate(`/interview/${res.data.id}`);
    } catch (error) {
      toast.error('Failed to start interview');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate('/dashboard')}
              data-testid="back-to-dashboard-button"
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Interview Setup
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Category Selection */}
          {!selectedCategory ? (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">Choose Interview Type</h2>
                <p className="text-slate-600">Select the category that matches your interview</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    data-testid={`category-card-${category.id}`}
                    className="glass-card border-0 cursor-pointer hover:shadow-2xl transition-all hover:scale-105"
                    onClick={() => setSelectedCategory(category)}
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-teal-600">{category.name}</CardTitle>
                      <CardDescription className="text-slate-600">{category.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Selected Category */}
              <Card className="glass-card border-0 shadow-xl" data-testid="selected-category-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl text-teal-600">{selectedCategory.name}</CardTitle>
                      <CardDescription className="mt-2">{selectedCategory.description}</CardDescription>
                    </div>
                    <Button
                      onClick={() => setSelectedCategory(null)}
                      data-testid="change-category-button"
                      variant="outline"
                      size="sm"
                    >
                      Change
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Questions List */}
              <Card className="glass-card border-0 shadow-xl" data-testid="questions-list-card">
                <CardHeader>
                  <CardTitle className="text-xl">Interview Questions ({questions.length})</CardTitle>
                  <CardDescription>Review and add custom questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    {questions.map((question, index) => (
                      <div
                        key={question.id}
                        data-testid={`question-item-${index}`}
                        className="flex items-start space-x-3 p-4 rounded-lg bg-white/60 border border-slate-100"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <p className="flex-1 text-slate-700 pt-1">{question.text}</p>
                        {question.is_custom && (
                          <span className="flex-shrink-0 px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium">
                            Custom
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Question */}
                  <div className="space-y-3">
                    <Label htmlFor="new-question" className="text-slate-700 font-medium">
                      Add Custom Question
                    </Label>
                    <div className="flex space-x-3">
                      <Input
                        id="new-question"
                        data-testid="new-question-input"
                        placeholder="Enter your custom question..."
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                        className="flex-1 bg-white border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                      />
                      <Button
                        onClick={handleAddQuestion}
                        data-testid="add-question-button"
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Start Interview Button */}
              <div className="flex justify-center pt-6">
                <Button
                  onClick={handleStartInterview}
                  data-testid="start-interview-button"
                  disabled={starting || questions.length === 0}
                  size="lg"
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-12 py-7 rounded-full text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? 'Starting...' : 'Start Interview'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
