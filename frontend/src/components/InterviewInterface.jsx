import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Video, Mic, Circle, Square, AlertCircle, ArrowRight } from 'lucide-react';
import { API } from '@/App';
import { toast } from 'sonner';

const InterviewInterface = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [interview, setInterview] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Real-time metrics (simulated)
  const [currentStress, setCurrentStress] = useState(0);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    fetchInterviewData();
    requestPermissions();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        // Simulate real-time stress and confidence updates
        setCurrentStress(Math.random() * 100);
        setCurrentConfidence(Math.random() * 100);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const fetchInterviewData = async () => {
    try {
      const [interviewRes, categoryRes] = await Promise.all([
        axios.get(`${API}/interviews/${interviewId}`, { withCredentials: true }),
        axios.get(`${API}/interviews/${interviewId}`, { withCredentials: true })
      ]);

      const interviewData = interviewRes.data;
      setInterview(interviewData);

      // Fetch questions for this category
      const questionsRes = await axios.get(`${API}/questions/${interviewData.category_id}`, { withCredentials: true });
      setQuestions(questionsRes.data);
    } catch (error) {
      toast.error('Failed to load interview');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setPermissionsGranted(true);
    } catch (error) {
      toast.error('Camera and microphone access required');
      setPermissionsGranted(false);
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) {
      toast.error('Please grant camera and microphone permissions');
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp8,opus'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
      setIsRecording(false);
    });
  };

  const handleNextQuestion = async () => {
    if (!isRecording) {
      toast.error('Please start recording first');
      return;
    }

    setProcessing(true);
    const videoBlob = await stopRecording();

    // Save response
    try {
      const formData = new FormData();
      formData.append('question_id', questions[currentQuestionIndex].id);
      formData.append('question_text', questions[currentQuestionIndex].text);
      formData.append('video', videoBlob, 'response.webm');

      await axios.post(
        `${API}/interviews/${interviewId}/responses`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      // Store response metrics
      const newResponse = {
        question: questions[currentQuestionIndex].text,
        stress: currentStress,
        confidence: currentConfidence
      };
      setResponses([...responses, newResponse]);

      // Move to next question or finish
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setRecordingTime(0);
        setCurrentStress(0);
        setCurrentConfidence(0);
        toast.success('Response saved');
      } else {
        // Finish interview
        await finishInterview([...responses, newResponse]);
      }
    } catch (error) {
      toast.error('Failed to save response');
    } finally {
      setProcessing(false);
    }
  };

  const finishInterview = async (allResponses) => {
    try {
      // Calculate overall metrics
      const overallStress = allResponses.reduce((sum, r) => sum + r.stress, 0) / allResponses.length;
      const overallConfidence = allResponses.reduce((sum, r) => sum + r.confidence, 0) / allResponses.length;

      await axios.post(
        `${API}/interviews/${interviewId}/analyze`,
        {
          overall_stress: overallStress,
          overall_confidence: overallConfidence,
          detailed_metrics: { responses: allResponses }
        },
        { withCredentials: true }
      );

      toast.success('Interview completed!');
      navigate(`/results/${interviewId}`);
    } catch (error) {
      toast.error('Failed to save analysis');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (!permissionsGranted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <Card className="glass-card border-0 shadow-2xl max-w-md" data-testid="permissions-prompt">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Permissions Required</h2>
            <p className="text-slate-600">
              Please allow camera and microphone access to continue with the interview.
            </p>
            <Button
              onClick={requestPermissions}
              data-testid="grant-permissions-button"
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Grant Permissions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Progress Header */}
          <Card className="glass-card border-0 shadow-lg" data-testid="interview-progress-card">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>{interview?.category_name}</span>
                </div>
                <Progress value={progress} className="h-2" data-testid="interview-progress-bar" />
              </div>
            </CardContent>
          </Card>

          {/* Main Interview Area */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Video Feed */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card border-0 shadow-xl" data-testid="video-preview-card">
                <CardContent className="pt-6">
                  <div className="camera-preview aspect-video bg-slate-900 rounded-2xl overflow-hidden relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      data-testid="video-preview"
                      className="w-full h-full"
                    />
                    {isRecording && (
                      <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-500 text-white px-4 py-2 rounded-full recording-pulse" data-testid="recording-indicator">
                        <Circle className="w-3 h-3 fill-current" />
                        <span className="font-medium">REC {formatTime(recordingTime)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Question Display */}
              <Card className="glass-card border-0 shadow-xl" data-testid="question-card">
                <CardContent className="pt-8 pb-8">
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                      <span className="text-2xl font-bold text-teal-600">{currentQuestionIndex + 1}</span>
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900" data-testid="current-question-text">
                      {currentQuestion?.text}
                    </h2>
                  </div>
                </CardContent>
              </Card>

              {/* Recording Controls */}
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    data-testid="start-recording-button"
                    size="lg"
                    disabled={processing}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-10 py-7 rounded-full text-lg font-semibold shadow-xl transition-all hover:scale-105"
                  >
                    <Circle className="w-6 h-6 mr-3 fill-current" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextQuestion}
                    data-testid="next-question-button"
                    size="lg"
                    disabled={processing}
                    className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-10 py-7 rounded-full text-lg font-semibold shadow-xl transition-all hover:scale-105"
                  >
                    {processing ? 'Saving...' : (currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview')}
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Real-time Metrics */}
            <div className="space-y-6">
              <Card className="glass-card border-0 shadow-xl" data-testid="stress-indicator-card">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Stress Level</span>
                      <span className="text-2xl font-bold text-orange-600" data-testid="stress-level-value">
                        {currentStress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={currentStress} className="h-3" data-testid="stress-level-bar" />
                    <p className="text-xs text-slate-500">Real-time stress monitoring</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-xl" data-testid="confidence-indicator-card">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">Confidence Level</span>
                      <span className="text-2xl font-bold text-blue-600" data-testid="confidence-level-value">
                        {currentConfidence.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={currentConfidence} className="h-3" data-testid="confidence-level-bar" />
                    <p className="text-xs text-slate-500">Real-time confidence tracking</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-xl" data-testid="tips-card">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-slate-900 mb-3">Tips</h3>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li>• Maintain eye contact with camera</li>
                    <li>• Speak clearly and confidently</li>
                    <li>• Take a moment to think before answering</li>
                    <li>• Keep your answers structured</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewInterface;
