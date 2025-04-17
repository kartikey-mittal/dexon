import React, { useEffect, useState } from 'react';
import { Bell, Heart, TrendingUp, Send, MapPin, Calendar, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { Alert, MoodLog } from '../../types';
import { useAuthStore } from '../../store/authStore';

const ParentDashboard = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [currentMoodIntensity, setCurrentMoodIntensity] = useState<number>(0);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childLocation, setChildLocation] = useState<[number, number] | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const loadData = async () => {
      // Get alerts with new coordinate structure
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (alertsData) {
        setAlerts(alertsData);
        // Extract location from the most recent SOS alert
        const sosAlert = alertsData.find(alert => alert.type === 'sos' && alert.latitude && alert.longitude);
        if (sosAlert) {
          setChildLocation([sosAlert.latitude, sosAlert.longitude]);
        }
      }

      // Get mood logs
      const { data: moodLogsData } = await supabase
        .from('mood_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(24);

      if (moodLogsData) {
        const processedLogs = moodLogsData.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp).getTime(),
          intensity: log.sentiment
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setMoodLogs(processedLogs);
        
        if (processedLogs.length > 0) {
          const latest = processedLogs[processedLogs.length - 1];
          setCurrentMood(latest.mood);
          setCurrentMoodIntensity(latest.sentiment);
        }
      }
    };

    loadData();

    // Real-time subscriptions
    const alertsSubscription = supabase
      .channel('alerts')
      .on('INSERT', (payload) => {
        const newAlert = payload.new as Alert;
        setAlerts((current) => [newAlert, ...current]);
        
        if (newAlert.type === 'sos' && newAlert.latitude && newAlert.longitude) {
          setChildLocation([newAlert.latitude, newAlert.longitude]);
        }
      })
      .subscribe();

    const moodLogsSubscription = supabase
      .channel('mood_logs')
      .on('INSERT', (payload) => {
        const newMoodLog = payload.new as MoodLog;
        setMoodLogs((current) => {
          const newLogs = [...current.slice(-23), {
            ...newMoodLog,
            timestamp: new Date(newMoodLog.timestamp).getTime(),
            intensity: newMoodLog.sentiment
          }];
          return newLogs.sort((a, b) => a.timestamp - b.timestamp);
        });
        setCurrentMood(newMoodLog.mood);
        setCurrentMoodIntensity(newMoodLog.sentiment);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsSubscription);
      supabase.removeChannel(moodLogsSubscription);
    };
  }, []);

  const getMoodColor = (mood: string, intensity: number) => {
    const baseColors = {
      happy: {
        low: 'bg-green-50 text-green-600 border-green-200',
        medium: 'bg-green-100 text-green-700 border-green-300',
        high: 'bg-green-200 text-green-800 border-green-500'
      },
      sad: {
        low: 'bg-blue-50 text-blue-600 border-blue-200',
        medium: 'bg-blue-100 text-blue-700 border-blue-300',
        high: 'bg-blue-200 text-blue-800 border-blue-500'
      },
      angry: {
        low: 'bg-red-50 text-red-600 border-red-200',
        medium: 'bg-red-100 text-red-700 border-red-300',
        high: 'bg-red-200 text-red-800 border-red-500'
      },
      scared: {
        low: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        high: 'bg-yellow-200 text-yellow-800 border-yellow-500'
      },
      neutral: {
        low: 'bg-gray-50 text-gray-600 border-gray-200',
        medium: 'bg-gray-100 text-gray-700 border-gray-300',
        high: 'bg-gray-200 text-gray-800 border-gray-500'
      }
    };

    const intensityLevel = intensity < 0.4 ? 'low' : intensity < 0.7 ? 'medium' : 'high';
    return baseColors[mood.toLowerCase() as keyof typeof baseColors]?.[intensityLevel] || baseColors.neutral.medium;
  };

  const getAlertColor = (alert: Alert) => {
    if (alert.type === 'sos') {
      return 'bg-red-100 border-red-500 text-red-800';
    }
    
    const intensity = alert.details?.intensity || 0;
    if (intensity > 0.7) {
      return 'bg-red-50 border-red-400 text-red-700';
    } else if (intensity > 0.4) {
      return 'bg-yellow-50 border-yellow-400 text-yellow-700';
    }
    return 'bg-blue-50 border-blue-400 text-blue-700';
  };

  const getMoodEmoji = (mood: string) => {
    const emojis: { [key: string]: string } = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      neutral: '😐',
      scared: '😨'
    };
    return emojis[mood.toLowerCase()] || '😐';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  };

  const customIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const sendMessage = async () => {
    if (!selectedChild || !newMessage.trim()) return;

    try {
      await supabase.from('messages').insert([
        {
          parent_id: user?.id,
          child_id: selectedChild,
          content: newMessage,
          created_at: new Date().toISOString(),
        },
      ]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Current Mood Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Heart className="w-8 h-8 text-red-500" />
                <h2 className="text-2xl font-bold ml-4">Current Mood</h2>
              </div>
              <div className="text-4xl">{getMoodEmoji(currentMood)}</div>
            </div>
            {currentMood && (
              <div className={`p-6 rounded-xl ${getMoodColor(currentMood, currentMoodIntensity)}`}>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold capitalize">{currentMood}</p>
                  <div className="flex items-center text-sm opacity-75">
                    <Clock className="w-4 h-4 mr-2" />
                    {formatTime(moodLogs[moodLogs.length - 1]?.timestamp)}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-current rounded-full h-2 transition-all duration-500"
                      style={{ width: `${currentMoodIntensity * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-1">Intensity: {Math.round(currentMoodIntensity * 100)}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Emotion Trend Graph */}
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <h2 className="text-2xl font-bold ml-4">Emotion Trend</h2>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Calendar className="w-4 h-4 mr-2" />
                Last 24 hours
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodLogs}>
                  <defs>
                    <linearGradient id="colorIntensity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="timestamp"
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    stroke="#666"
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                    stroke="#666"
                    tick={{ fill: '#666', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${Math.round(value * 100)}%`, 'Intensity']}
                    labelFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  />
                  <Line
                    type="monotone"
                    dataKey="intensity"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', r: 4 }}
                    activeDot={{ r: 6 }}
                    fillOpacity={1}
                    fill="url(#colorIntensity)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Message Input */}
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform">
            <h2 className="text-2xl font-bold mb-6">Send Message</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Location Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <MapPin className="w-8 h-8 text-green-500" />
                <h2 className="text-2xl font-bold ml-4">Child's Location</h2>
              </div>
            </div>
            <div className="h-80 rounded-xl overflow-hidden">
              {childLocation ? (
                <MapContainer
                  center={childLocation}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <Marker position={childLocation} icon={customIcon}>
                    <Popup>
                      Last known location
                      <br />
                      {formatTime(alerts[0]?.timestamp || '')}
                    </Popup>
                  </Marker>
                </MapContainer>
              ) : (
                <div className="h-full bg-gray-100 rounded-xl flex items-center justify-center">
                  <p className="text-gray-500">No location data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerts Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8 transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-yellow-500" />
                <h2 className="text-2xl font-bold ml-4">Recent Alerts</h2>
              </div>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-6 rounded-xl transition-all hover:scale-[1.02] ${getAlertColor(alert)}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          alert.type === 'sos' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {alert.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-700 mt-3">
                        {alert.details.message}
                      </p>
                      {alert.latitude && alert.longitude && (
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4 mr-2" />
                          ({alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)})
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium">
                        {formatTime(alert.timestamp)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(alert.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;