import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { gamificationApi, GameSettings } from '../../services/api';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';

const defaultRule = { pattern: '', targetRoute: '', rewardXp: 0, confetti: undefined as boolean | undefined, note: '', enabled: true };

const AdminGameSettings: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage('Settings saved');
      setTimeout(() => setMessage(null), 2000);
    } else if (res.error) {
      setMessage(res.error);
    }
    setIsSaving(false);
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
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
            {message}
          </div>
        )}

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
      </div>
    </div>
  );
};

export default AdminGameSettings;
