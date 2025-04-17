import React, { useState, useEffect } from 'react';
import { Mic, AlertTriangle, Home, MessageSquare, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { analyzeSpeech } from '../../lib/gemini';

const ChildDashboard = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) return;

    // Load initial messages
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('child_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) setMessages(data);
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('INSERT', (payload) => {
        if (payload.new.child_id === user.id) {
          setMessages((current) => [payload.new, ...current]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const analyzeTranscript = async (text: string) => {
    const result = await analyzeSpeech(text);
    if (result) {
      setAnalysis(result);
      
      // Send analysis to Supabase
      if (user) {
        await supabase.from('mood_logs').insert([{
          child_id: user.id,
          transcript: text,
          sentiment: result.sentiment.intensity,
          mood: result.sentiment.emotion,
          timestamp: new Date().toISOString()
        }]);

        // Send alert if concerning content is detected
        if (result.contentFlags.profanity || result.contentFlags.harmful || result.contentFlags.threatening) {
          await supabase.from('alerts').insert([{
            child_id: user.id,
            type: 'mood',
            details: {
              message: `Concerning content detected: ${result.summary}`,
              flags: result.contentFlags
            },
            timestamp: new Date().toISOString()
          }]);
        }
      }
    }
  };

  const startRecording = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        setAnalysis(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        
        setTranscript(transcript);
        analyzeTranscript(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser.');
    }
  };

  const sendSOS = async () => {
    if (!user) return;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const alert = {
        child_id: user.id,
        type: 'sos',
        details: {
          message: 'Emergency SOS signal',
        },
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: new Date().toISOString()
      };

      await supabase.from('alerts').insert([alert]);
    } catch (error) {
      console.error('Error sending SOS:', error);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-20 bg-white shadow-lg flex flex-col items-center py-8">
        <div className="space-y-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`p-3 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-400 hover:text-purple-600'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`p-3 rounded-xl transition-all ${
              activeTab === 'messages'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-400 hover:text-purple-600'
            }`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`p-3 rounded-xl transition-all ${
              activeTab === 'settings'
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-400 hover:text-purple-600'
            }`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 relative">
        {/* Header */}
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
            {user?.name?.[0]?.toUpperCase() || '👋'}
          </div>
          <h1 className="text-3xl font-bold text-purple-600 ml-4">
            Hi {user?.name}! 
          </h1>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Speech Button */}
              <button
                onClick={startRecording}
                className={`relative flex items-center justify-center p-12 rounded-2xl transition-all transform hover:scale-105 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                }`}
              >
                <div className={`absolute inset-0 rounded-2xl ${
                  isRecording ? 'animate-ping bg-red-400 opacity-75' : ''
                }`}></div>
                <Mic className="w-16 h-16 text-white" />
                <span className="ml-4 text-2xl font-bold text-white">
                  {isRecording ? 'Recording...' : 'Press to Speak'}
                </span>
              </button>

              {/* SOS Button */}
              <button
                onClick={sendSOS}
                className="relative flex items-center justify-center p-12 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                <AlertTriangle className="w-16 h-16 text-white" />
                <span className="ml-4 text-2xl font-bold text-white">SOS</span>
              </button>
            </div>

            {/* Analysis Results */}
            {transcript && (
              <div className="space-y-6 bg-white rounded-2xl p-8 shadow-lg">
                <div className="p-6 bg-gray-50 rounded-xl">
                  <h2 className="text-xl font-semibold mb-4">Your Words:</h2>
                  <p className="text-gray-700">{transcript}</p>
                </div>

                {analysis && (
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Analysis:</h2>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium text-gray-900">Emotion:</h3>
                        <p className="text-gray-700">
                          {analysis.sentiment.emotion} (Intensity: {Math.round(analysis.sentiment.intensity * 100)}%)
                        </p>
                      </div>
                      {(analysis.contentFlags.profanity || analysis.contentFlags.harmful || analysis.contentFlags.threatening) && (
                        <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <p className="text-red-700 font-medium">Content Warning</p>
                          <p className="text-red-600">{analysis.summary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Messages from Parent</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto mb-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-purple-900">
                        From Parent
                      </p>
                      <p className="text-gray-700 mt-1">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-semibold mb-6">Settings</h2>
            <p className="text-gray-600">Settings panel coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildDashboard;