import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import ImageUploader from '../../components/ImageUploader';
import { 
  gamificationApi, 
  questsApi, 
  attractionsApi, 
  GameSettings, 
  Quest, 
  QuestTask, 
  CreateQuestData,
  Attraction
} from '../../services/api';
import { 
  Loader2, 
  Plus, 
  Save, 
  Trash2, 
  Sparkles, 
  FlaskConical, 
  ArrowRight, 
  Settings, 
  Trophy,
  Edit2,
  X,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  GripVertical
} from 'lucide-react';
import QRCode from 'react-qr-code';

type TabType = 'settings' | 'quests';

const defaultRule = { pattern: '', targetRoute: '', rewardXp: 0, confetti: undefined as boolean | undefined, note: '', enabled: true };

const defaultTask: Omit<QuestTask, '_id'> = {
  title: '',
  description: '',
  locationId: undefined,
  qrCodeData: '',
};

const defaultQuestForm: CreateQuestData = {
  title: '',
  slug: '',
  description: '',
  image: '',
  badgeImage: '',
  reward: '',
  totalExp: 100,
  isActive: true,
  startDate: undefined,
  endDate: undefined,
  tasks: [{ ...defaultTask }],
};

const AdminGameSettings: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('settings');

  // Settings state
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testPayload, setTestPayload] = useState('');
  const [simulation, setSimulation] = useState<{
    matched: boolean;
    message: string;
    xpAwarded: number;
    nextRoute: string | null;
    confetti: boolean;
  } | null>(null);

  // Quests state
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoadingQuests, setIsLoadingQuests] = useState(false);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [questForm, setQuestForm] = useState<CreateQuestData>({ ...defaultQuestForm });
  const [isSavingQuest, setIsSavingQuest] = useState(false);
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(0);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const res = await gamificationApi.getSettings();
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  // Fetch quests when tab changes
  useEffect(() => {
    if (activeTab === 'quests') {
      fetchQuests();
      fetchAttractions();
    }
  }, [activeTab]);

  const fetchQuests = async () => {
    setIsLoadingQuests(true);
    const res = await questsApi.getAllAdmin();
    if (res.data?.quests) {
      setQuests(res.data.quests);
    }
    setIsLoadingQuests(false);
  };

  const fetchAttractions = async () => {
    const res = await attractionsApi.getAll();
    if (res.data?.attractions) {
      setAttractions(res.data.attractions);
    }
  };

  const showMessageFn = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggle = (key: keyof GameSettings) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: !(settings as any)[key] });
  };

  const updateField = (key: keyof GameSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateRule = (index: number, key: string, value: any) => {
    if (!settings) return;
    const next = [...settings.navigationRules];
    next[index] = { ...next[index], [key]: value } as any;
    setSettings({ ...settings, navigationRules: next });
  };

  const simulatePayload = () => {
    if (!settings || !testPayload.trim()) {
      setSimulation(null);
      return;
    }

    const payload = testPayload.trim();
    const rule = settings.navigationRules.find(r => r.enabled !== false && payload.includes(r.pattern));

    if (!rule) {
      setSimulation({
        matched: false,
        message: 'No matching rule. Will fall back to default route if set.',
        xpAwarded: settings.xpPerScan,
        nextRoute: settings.defaultNextRoute || null,
        confetti: settings.confettiEnabled,
      });
      return;
    }

    let nextRoute = rule.targetRoute || settings.defaultNextRoute || null;
    if (nextRoute && nextRoute.includes(':id') && payload.includes(':')) {
      const parts = payload.split(':');
      const id = parts[parts.length - 1];
      nextRoute = nextRoute.replace(':id', id);
    }

    setSimulation({
      matched: true,
      message: rule.note || 'Location discovered!',
      xpAwarded: rule.rewardXp ?? settings.xpPerScan ?? 0,
      nextRoute,
      confetti: rule.confetti ?? settings.confettiEnabled ?? false,
    });
  };

  // Simulation helper to mirror backend routing logic for rules

  const addRule = () => {
    if (!settings) return;
    setSettings({ ...settings, navigationRules: [...settings.navigationRules, { ...defaultRule }] });
  };

  const removeRule = (index: number) => {
    if (!settings) return;
    const next = [...settings.navigationRules];
    next.splice(index, 1);
    setSettings({ ...settings, navigationRules: next });
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const res = await gamificationApi.updateSettings(settings);
    if (res.data?.settings) {
      setSettings(res.data.settings);
      showMessageFn('success', 'Settings saved');
    } else if (res.error) {
      showMessageFn('error', res.error);
    }
    setIsSaving(false);
  };

  // Quest handlers
  const handleOpenCreateQuest = () => {
    setEditingQuest(null);
    setQuestForm({ ...defaultQuestForm, tasks: [{ ...defaultTask }] });
    setExpandedTaskIndex(0);
    setShowQuestModal(true);
  };

  const handleOpenEditQuest = (quest: Quest) => {
    setEditingQuest(quest);
    setQuestForm({
      title: quest.title,
      slug: quest.slug,
      description: quest.description,
      image: quest.image,
      badgeImage: quest.badgeImage,
      reward: quest.reward,
      totalExp: quest.totalExp,
      isActive: quest.isActive,
      startDate: quest.startDate ? quest.startDate.split('T')[0] : undefined,
      endDate: quest.endDate ? quest.endDate.split('T')[0] : undefined,
      tasks: quest.tasks.map(t => ({
        title: t.title,
        description: t.description,
        locationId: t.locationId,
        qrCodeData: t.qrCodeData || '',
      })),
    });
    setExpandedTaskIndex(0);
    setShowQuestModal(true);
  };

  const handleCloseQuestModal = () => {
    setShowQuestModal(false);
    setEditingQuest(null);
    setQuestForm({ ...defaultQuestForm });
  };

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleBlur = () => {
    if (questForm.title && !questForm.slug) {
      setQuestForm(prev => ({
        ...prev,
        slug: generateSlugFromTitle(prev.title),
      }));
    }
  };

  const updateQuestForm = (key: keyof CreateQuestData, value: any) => {
    setQuestForm(prev => ({ ...prev, [key]: value }));
  };

  const addTask = () => {
    setQuestForm(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ...defaultTask }],
    }));
    setExpandedTaskIndex(questForm.tasks.length);
  };

  const removeTask = (index: number) => {
    if (questForm.tasks.length <= 1) return;
    setQuestForm(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }));
    if (expandedTaskIndex === index) {
      setExpandedTaskIndex(null);
    } else if (expandedTaskIndex !== null && expandedTaskIndex > index) {
      setExpandedTaskIndex(expandedTaskIndex - 1);
    }
  };

  const updateTask = (index: number, key: keyof QuestTask, value: any) => {
    setQuestForm(prev => ({
      ...prev,
      tasks: prev.tasks.map((t, i) => i === index ? { ...t, [key]: value } : t),
    }));
  };

  const handleSaveQuest = async () => {
    // Validation
    if (!questForm.title.trim()) {
      showMessageFn('error', 'Quest title is required');
      return;
    }
    if (!questForm.description.trim()) {
      showMessageFn('error', 'Quest description is required');
      return;
    }
    if (!questForm.image) {
      showMessageFn('error', 'Quest cover image is required');
      return;
    }
    if (!questForm.badgeImage) {
      showMessageFn('error', 'Badge image is required');
      return;
    }
    if (!questForm.reward.trim()) {
      showMessageFn('error', 'Reward description is required');
      return;
    }
    if (questForm.tasks.length === 0) {
      showMessageFn('error', 'At least one task is required');
      return;
    }
    for (const task of questForm.tasks) {
      if (!task.title.trim() || !task.description.trim()) {
        showMessageFn('error', 'All tasks must have a title and description');
        return;
      }
    }

    setIsSavingQuest(true);

    const dataToSend = {
      ...questForm,
      slug: questForm.slug || generateSlugFromTitle(questForm.title),
      startDate: questForm.startDate || undefined,
      endDate: questForm.endDate || undefined,
    };

    let res;
    if (editingQuest) {
      res = await questsApi.update(editingQuest._id, dataToSend);
    } else {
      res = await questsApi.create(dataToSend);
    }

    if (res.data?.quest) {
      showMessageFn('success', editingQuest ? 'Quest updated' : 'Quest created');
      handleCloseQuestModal();
      fetchQuests();
    } else if (res.error) {
      showMessageFn('error', res.error);
    }

    setIsSavingQuest(false);
  };

  const handleDeleteQuest = async (quest: Quest) => {
    if (!confirm(`Delete quest "${quest.title}"? This action cannot be undone.`)) return;

    const res = await questsApi.delete(quest._id);
    if (res.data) {
      showMessageFn('success', 'Quest deleted');
      fetchQuests();
    } else if (res.error) {
      showMessageFn('error', res.error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header showBack title="Game Settings" />
        <div className="flex items-center justify-center h-[60vh] text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header showBack title="Game Settings" />
      <div className="max-w-4xl mx-auto p-6 pt-24 space-y-6">
        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-gray-50'
            }`}
            aria-label="Settings tab"
            tabIndex={0}
          >
            <Settings size={18} />
            Settings
          </button>
          <button
            onClick={() => setActiveTab('quests')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'quests'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-gray-50'
            }`}
            aria-label="Quests tab"
            tabIndex={0}
          >
            <Trophy size={18} />
            Quests
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Confetti on completion</p>
              <p className="text-xs text-slate-500">Show celebration when quest tasks are completed.</p>
            </div>
            <button
              onClick={() => handleToggle('confettiEnabled')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${settings.confettiEnabled ? 'bg-sky-500 text-white' : 'bg-gray-100 text-slate-600'}`}
            >
              {settings.confettiEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col text-sm font-medium text-slate-800">
              XP per scan
              <input
                type="number"
                value={settings.xpPerScan}
                onChange={(e) => updateField('xpPerScan', Number(e.target.value))}
                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-800">
              Cooldown seconds
              <input
                type="number"
                value={settings.cooldownSeconds}
                onChange={(e) => updateField('cooldownSeconds', Number(e.target.value))}
                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
            <label className="flex flex-col text-sm font-medium text-slate-800">
              Default redirect
              <input
                type="text"
                value={settings.defaultNextRoute || ''}
                onChange={(e) => updateField('defaultNextRoute', e.target.value)}
                placeholder="e.g. /home or /quest/:id"
                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </label>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-900">QR navigation rules</p>
              <p className="text-xs text-slate-500">Match QR payload to auto-redirect and award XP.</p>
            </div>
            <button
              onClick={addRule}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold"
            >
              <Plus size={16} /> Add rule
            </button>
          </div>

          <div className="mb-5 grid gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-3">
            <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
              <Sparkles size={14} /> Quick tips
            </div>
            <p>Use broad patterns like <span className="font-semibold text-slate-800">ATTRACTION:</span> then set target <span className="font-semibold text-slate-800">/attraction/:id</span> to auto-fill the id.</p>
            <p>The <span className="font-semibold text-slate-800">Note</span> becomes the success message shown to the user.</p>
            <p>If no rule matches, the system falls back to <span className="font-semibold text-slate-800">Default redirect</span>.</p>
          </div>

          <div className="space-y-3">
            {settings.navigationRules.length === 0 && (
              <div className="text-sm text-slate-500">No rules yet. Add one to start.</div>
            )}
            {settings.navigationRules.map((rule, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-sm font-medium text-slate-800 flex flex-col">
                    Pattern (match substring)
                    <input
                      type="text"
                      value={rule.pattern}
                      onChange={(e) => updateRule(idx, 'pattern', e.target.value)}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-800 flex flex-col">
                    Target route
                    <input
                      type="text"
                      value={rule.targetRoute}
                      onChange={(e) => updateRule(idx, 'targetRoute', e.target.value)}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm font-medium text-slate-800 flex flex-col">
                    Reward XP
                    <input
                      type="number"
                      value={rule.rewardXp ?? 0}
                      onChange={(e) => updateRule(idx, 'rewardXp', Number(e.target.value))}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-800 flex flex-col">
                    Note
                    <input
                      type="text"
                      value={rule.note || ''}
                      onChange={(e) => updateRule(idx, 'note', e.target.value)}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateRule(idx, 'enabled', !(rule.enabled !== false))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${rule.enabled !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-slate-600'}`}
                    >
                      {rule.enabled !== false ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => updateRule(idx, 'confetti', rule.confetti === true ? false : true)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${rule.confetti ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-slate-600'}`}
                    >
                      {rule.confetti ? 'Confetti' : 'No confetti'}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => removeRule(idx)}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rule Simulator */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-sky-500" />
            <div>
              <p className="text-sm font-bold text-slate-900">Test a QR payload</p>
              <p className="text-xs text-slate-500">Runs the same matching logic used in the scanner.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              placeholder="e.g. ATTRACTION:6937e5686a4dae3bc4249de0"
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
            <button
              onClick={simulatePayload}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center gap-2"
            >
              <ArrowRight size={16} /> Simulate
            </button>
          </div>

          {simulation && (
            <div className={`rounded-xl border p-4 text-sm ${simulation.matched ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900">{simulation.matched ? 'Rule matched' : 'No rule matched'}</span>
                {simulation.confetti && <span className="flex items-center gap-1 text-sky-600 text-xs font-semibold"><Sparkles size={14} /> Confetti</span>}
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Message</p>
                  <p className="font-semibold text-slate-900">{simulation.message}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">XP Awarded</p>
                  <p className="font-semibold text-slate-900">{simulation.xpAwarded}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Next Route</p>
                  <p className="font-semibold text-slate-900">{simulation.nextRoute || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={18} />}
            Save settings
          </button>
        </div>
          </>
        )}

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-lg font-bold text-slate-900">Quest Management</p>
                  <p className="text-sm text-slate-500">Create and manage location-based quests.</p>
                </div>
                <button
                  onClick={handleOpenCreateQuest}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold"
                  aria-label="Create new quest"
                  tabIndex={0}
                >
                  <Plus size={16} /> New Quest
                </button>
              </div>

              {isLoadingQuests ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading quests...
                </div>
              ) : quests.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No quests yet</p>
                  <p className="text-sm">Create your first quest to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {quests.map((quest) => (
                    <div
                      key={quest._id}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={quest.image}
                          alt={quest.title}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/100/100'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-slate-900 truncate">{quest.title}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              quest.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {quest.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {quest.tasks.length} tasks
                            </span>
                            <span className="flex items-center gap-1">
                              <Trophy size={12} />
                              {quest.totalExp} XP
                            </span>
                            {quest.startDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {formatDate(quest.startDate)} - {formatDate(quest.endDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenEditQuest(quest)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-slate-600 transition-colors"
                            aria-label={`Edit ${quest.title}`}
                            tabIndex={0}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuest(quest)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            aria-label={`Delete ${quest.title}`}
                            tabIndex={0}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quest Modal */}
      {showQuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingQuest ? 'Edit Quest' : 'Create Quest'}
              </h2>
              <button
                onClick={handleCloseQuestModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-slate-500"
                aria-label="Close modal"
                tabIndex={0}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Basic Info</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    Title *
                    <input
                      type="text"
                      value={questForm.title}
                      onChange={(e) => updateQuestForm('title', e.target.value)}
                      onBlur={handleTitleBlur}
                      placeholder="e.g. Waterfall Chaser"
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    Slug (URL-friendly)
                    <input
                      type="text"
                      value={questForm.slug || ''}
                      onChange={(e) => updateQuestForm('slug', e.target.value)}
                      placeholder="Auto-generated from title"
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                </div>

                <label className="flex flex-col text-sm font-medium text-slate-800">
                  Description *
                  <textarea
                    value={questForm.description}
                    onChange={(e) => updateQuestForm('description', e.target.value)}
                    placeholder="Describe what this quest is about..."
                    rows={3}
                    className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    Reward *
                    <input
                      type="text"
                      value={questForm.reward}
                      onChange={(e) => updateQuestForm('reward', e.target.value)}
                      placeholder="e.g. Master Explorer Badge + 10% Discount"
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    Total XP
                    <input
                      type="number"
                      value={questForm.totalExp}
                      onChange={(e) => updateQuestForm('totalExp', Number(e.target.value))}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    Start Date (optional)
                    <input
                      type="date"
                      value={questForm.startDate || ''}
                      onChange={(e) => updateQuestForm('startDate', e.target.value || undefined)}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-800">
                    End Date (optional)
                    <input
                      type="date"
                      value={questForm.endDate || ''}
                      onChange={(e) => updateQuestForm('endDate', e.target.value || undefined)}
                      className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Active</p>
                    <p className="text-xs text-slate-500">Quest is visible and can be started by users</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateQuestForm('isActive', !questForm.isActive)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      questForm.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-slate-600'
                    }`}
                    aria-label="Toggle active status"
                    tabIndex={0}
                  >
                    {questForm.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Images</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-2">Cover Image *</p>
                    <ImageUploader
                      folder="quests"
                      maxFiles={1}
                      existingImages={questForm.image ? [questForm.image] : []}
                      onUploadComplete={(urls) => updateQuestForm('image', urls[0] || '')}
                      onError={(err) => showMessageFn('error', err)}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 mb-2">Badge Image *</p>
                    <ImageUploader
                      folder="badges"
                      maxFiles={1}
                      existingImages={questForm.badgeImage ? [questForm.badgeImage] : []}
                      onUploadComplete={(urls) => updateQuestForm('badgeImage', urls[0] || '')}
                      onError={(err) => showMessageFn('error', err)}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Tasks ({questForm.tasks.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addTask}
                    className="flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                    aria-label="Add task"
                    tabIndex={0}
                  >
                    <Plus size={16} /> Add Task
                  </button>
                </div>

                <div className="space-y-3">
                  {questForm.tasks.map((task, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedTaskIndex(expandedTaskIndex === index ? null : index)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        aria-label={`Toggle task ${index + 1}`}
                        tabIndex={0}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical size={16} className="text-slate-400" />
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">
                            {task.title || `Task ${index + 1}`}
                          </span>
                        </div>
                        {expandedTaskIndex === index ? (
                          <ChevronUp size={18} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={18} className="text-slate-400" />
                        )}
                      </button>

                      {expandedTaskIndex === index && (
                        <div className="p-4 space-y-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex flex-col text-sm font-medium text-slate-800">
                              Task Title *
                              <input
                                type="text"
                                value={task.title}
                                onChange={(e) => updateTask(index, 'title', e.target.value)}
                                placeholder="e.g. Visit Maria Cristina Falls"
                                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              />
                            </label>
                            <label className="flex flex-col text-sm font-medium text-slate-800">
                              Linked Attraction
                              <select
                                value={task.locationId || ''}
                                onChange={(e) => updateTask(index, 'locationId', e.target.value || undefined)}
                                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                <option value="">None</option>
                                {attractions.map((a) => (
                                  <option key={a._id} value={a._id}>{a.name}</option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <label className="flex flex-col text-sm font-medium text-slate-800">
                            Description *
                            <input
                              type="text"
                              value={task.description}
                              onChange={(e) => updateTask(index, 'description', e.target.value)}
                              placeholder="e.g. Scan the QR code at the entrance"
                              className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                          </label>

                          <div>
                            <label className="flex flex-col text-sm font-medium text-slate-800">
                              QR Code Data
                              <input
                                type="text"
                                value={task.qrCodeData || ''}
                                onChange={(e) => updateTask(index, 'qrCodeData', e.target.value)}
                                placeholder="e.g. ATTRACTION:123 or custom code"
                                className="mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              />
                            </label>
                            {task.qrCodeData && (
                              <div className="mt-3 flex items-start gap-4 p-3 bg-gray-50 rounded-xl">
                                <div className="bg-white p-2 rounded-lg border border-gray-200">
                                  <QRCode value={task.qrCodeData} size={80} level="M" />
                                </div>
                                <div className="text-xs text-slate-500">
                                  <p className="font-medium text-slate-700 mb-1">QR Preview</p>
                                  <p>This QR code must be printed and placed at the task location. When scanned, it will mark this task as complete.</p>
                                  <code className="block mt-2 bg-white px-2 py-1 rounded border border-gray-200 text-slate-700">
                                    {task.qrCodeData}
                                  </code>
                                </div>
                              </div>
                            )}
                          </div>

                          {questForm.tasks.length > 1 && (
                            <div className="flex justify-end pt-2 border-t border-gray-100">
                              <button
                                type="button"
                                onClick={() => removeTask(index)}
                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                aria-label="Remove task"
                                tabIndex={0}
                              >
                                <Trash2 size={14} /> Remove Task
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseQuestModal}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-gray-100"
                aria-label="Cancel"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuest}
                disabled={isSavingQuest}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60"
                aria-label="Save quest"
                tabIndex={0}
              >
                {isSavingQuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                {editingQuest ? 'Update Quest' : 'Create Quest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGameSettings;
