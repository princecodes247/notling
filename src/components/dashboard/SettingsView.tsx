import React, { useState } from 'react';
import { Shield, Database, Users, Sparkles, Check, Globe, Sliders } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [workspaceName, setWorkspaceName] = useState('Terrace');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 w-full h-full bg-white flex flex-col overflow-y-auto select-none font-sans p-6 sm:p-10">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        {/* Header */}
        <div className="pb-5 border-b border-neutral-100">
          <h1 className="text-2xl font-normal text-neutral-950 tracking-tight">Workspace Settings</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your workspace details, members, AI agent access, and database storage.
          </p>
        </div>

        {/* 1. General Profile & Workspace */}
        <div className="p-6 rounded-2xl border border-neutral-200/90 bg-white flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900">General Information</h2>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Primary Timezone
                </label>
                <select className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black bg-white">
                  <option>Eastern Time (US & Canada) - New York</option>
                  <option>Pacific Time (US & Canada) - Los Angeles</option>
                  <option>Central European Time - Berlin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-neutral-400">
                Changes apply immediately across all teammates
              </span>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-medium transition-colors cursor-pointer shadow-2xs"
              >
                {saved && <Check className="w-3.5 h-3.5 text-white" />}
                <span>{saved ? 'Saved' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* 2. Team Members */}
        <div className="p-6 rounded-2xl border border-neutral-200/90 bg-white flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <h2 className="text-sm font-semibold text-neutral-900">Members & Roles</h2>
            </div>
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-800 font-medium cursor-pointer"
            >
              + Invite Member
            </button>
          </div>

          <div className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-100 overflow-hidden">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"
                  alt="Scotty"
                  className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                />
                <div>
                  <div className="text-xs font-medium text-neutral-900">Scotty</div>
                  <div className="text-[10px] text-neutral-400">scotty@usedance.com</div>
                </div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                Workspace Owner
              </span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-neutral-900">Event Coordination Agent</div>
                  <div className="text-[10px] text-neutral-400">Autonomous planning & outreach</div>
                </div>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Autonomous Agent
              </span>
            </div>
          </div>
        </div>

        {/* 3. Storage & PostgreSQL Infrastructure */}
        <div className="p-6 rounded-2xl border border-neutral-200/90 bg-white flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900">Database Engine</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Engine</span>
              <div className="text-xs font-semibold text-neutral-900 mt-0.5">PostgreSQL 16</div>
              <span className="text-[10px] text-emerald-600 font-medium">● Connected (Port 5432)</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Search Index</span>
              <div className="text-xs font-semibold text-neutral-900 mt-0.5">GIN tsvector Index</div>
              <span className="text-[10px] text-neutral-500 font-medium">Sub-millisecond query</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold">Schema Status</span>
              <div className="text-xs font-semibold text-neutral-900 mt-0.5">Drizzle ORM v0.39</div>
              <span className="text-[10px] text-neutral-500 font-medium">Synchronized</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
