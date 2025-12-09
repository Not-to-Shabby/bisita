import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trophy, 
  MapPin, 
  CheckCircle2, 
  Circle, 
  QrCode, 
  Share2,
  Clock,
  Award
} from 'lucide-react';
import BottomNav from '../components/BottomNav';

// Mock Data for the Quest
const QUEST_DATA = {
  id: 'waterfall-chaser',
  title: 'Waterfall Chaser',
  description: 'Discover the majestic waterfalls of Iligan City. Visit all 3 featured falls to earn the "Master Explorer" badge and a 10% discount voucher at local souvenir shops.',
  image: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=2070&auto=format&fit=crop',
  badgeImage: 'https://cdn-icons-png.flaticon.com/512/625/625393.png', // Placeholder badge
  totalExp: 500,
  tasks: [
    {
      id: 'task-1',
      title: 'Visit Maria Cristina Falls',
      description: 'Scan the QR code at the entrance of the nature park.',
      location: 'Maria Cristina Falls',
      isCompleted: true,
      coordinates: { lat: 8.1833, lng: 124.1917 }
    },
    {
      id: 'task-2',
      title: 'Visit Tinago Falls',
      description: 'Find the marker near the lagoon and scan it.',
      location: 'Tinago Falls',
      isCompleted: false,
      coordinates: { lat: 8.1589, lng: 124.1844 }
    },
    {
      id: 'task-3',
      title: 'Visit Mimbalot Falls',
      description: 'Check in at the Mimbalot Falls viewing deck.',
      location: 'Mimbalot Falls',
      isCompleted: false,
      coordinates: { lat: 8.1750, lng: 124.1650 }
    }
  ],
  rewards: [
    'Master Explorer Badge',
    '500 XP',
    '10% Discount Voucher'
  ]
};

const QuestDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quest, setQuest] = useState(QUEST_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [id]);

  const completedTasks = quest.tasks.filter(t => t.isCompleted).length;
  const totalTasks = quest.tasks.length;
  const progress = (completedTasks / totalTasks) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80">
        <img 
          src={quest.image} 
          alt={quest.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        <div className="absolute top-0 left-0 right-0 p-6 pt-12 flex justify-between items-center text-white">
          <button 
            onClick={() => navigate(-1)} 
            className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <button className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/30 transition-colors">
            <Share2 size={24} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Active Quest
            </span>
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium">
              <Clock size={12} />
              <span>Limited Time</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">{quest.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-200">
            <div className="flex items-center gap-1">
              <Trophy size={16} className="text-yellow-400" />
              <span>{quest.totalExp} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{quest.tasks.length} Locations</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 relative z-10">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-sm text-gray-500 font-medium">Quest Progress</p>
              <p className="text-2xl font-bold text-slate-900">{Math.round(progress)}% <span className="text-sm font-normal text-gray-400">Complete</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-sky-600">{completedTasks}/{totalTasks} Tasks</p>
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-2">About this Quest</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {quest.description}
          </p>
        </div>

        {/* Tasks Timeline */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Mission</h2>
          <div className="space-y-6 relative before:absolute before:left-[19px] before:top-2 before:bottom-4 before:w-0.5 before:bg-gray-200">
            {quest.tasks.map((task, index) => (
              <div key={task.id} className="relative pl-12">
                {/* Status Icon */}
                <div className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-50 ${
                  task.isCompleted 
                    ? 'bg-green-500 text-white shadow-green-200 shadow-lg' 
                    : 'bg-white text-gray-300 border-gray-200'
                }`}>
                  {task.isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>

                {/* Content */}
                <div className={`bg-white p-4 rounded-xl border ${task.isCompleted ? 'border-green-100 bg-green-50/30' : 'border-gray-100 shadow-sm'}`}>
                  <h3 className={`font-bold ${task.isCompleted ? 'text-green-800' : 'text-slate-900'}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 mb-3">{task.description}</p>
                  
                  {!task.isCompleted && (
                    <button 
                      onClick={() => navigate('/scan-qr')}
                      className="flex items-center gap-2 bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors w-full justify-center"
                    >
                      <QrCode size={16} />
                      Scan to Complete
                    </button>
                  )}
                  
                  {task.isCompleted && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-bold">
                      <CheckCircle2 size={14} />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rewards */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Rewards</h2>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md shrink-0">
              <Trophy size={40} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-lg">Master Explorer</h3>
              <ul className="mt-2 space-y-1">
                {quest.rewards.map((reward, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                    <Award size={12} />
                    {reward}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default QuestDetail;
