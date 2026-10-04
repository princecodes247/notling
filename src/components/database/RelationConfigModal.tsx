import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDatabasesInWorkspace } from '~/server/databases';
import type { Database, DatabaseProperty, RelationConfig } from '~/db/schema';
import {
  ArrowRightLeft,
  X,
  Search,
  Database as DatabaseIcon,
  Check,
  ChevronRight,
  Sliders,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RelationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentDatabaseId: string;
  currentDatabaseTitle: string;
  existingProperty?: DatabaseProperty | null;
  onSave: (config: {
    name: string;
    targetDatabaseId: string;
    targetDatabaseTitle?: string;
    twoWay: boolean;
    twoWayPropertyName?: string;
    limit: 'single' | 'multiple';
  }) => void;
}

export function RelationConfigModal({
  isOpen,
  onClose,
  workspaceId,
  currentDatabaseId,
  currentDatabaseTitle,
  existingProperty,
  onSave,
}: RelationConfigModalProps) {
  const existingConfig = (existingProperty?.config as RelationConfig) || {};

  const [propertyName, setPropertyName] = useState(existingProperty?.name || '');
  const [selectedDbId, setSelectedDbId] = useState<string>(
    existingConfig.targetDatabaseId || ''
  );
  const [twoWay, setTwoWay] = useState<boolean>(existingConfig.twoWay || false);
  const [twoWayPropName, setTwoWayPropName] = useState<string>(
    existingConfig.twoWayPropertyName || currentDatabaseTitle || 'Related'
  );
  const [limit, setLimit] = useState<'single' | 'multiple'>(
    existingConfig.limit || 'multiple'
  );
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch all databases in the workspace (cached for 5 min for instant open)
  const { data: workspaceDatabases = [], isLoading } = useQuery({
    queryKey: ['workspaceDatabases', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getDatabasesInWorkspace({ data: workspaceId });
    },
    enabled: isOpen && !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isOpen) {
      const cfg = (existingProperty?.config as RelationConfig) || {};
      const initialTargetDbId = cfg.targetDatabaseId || '';
      setSelectedDbId(initialTargetDbId);
      setPropertyName(existingProperty?.name || (initialTargetDbId ? '' : ''));
      setTwoWay(cfg.twoWay || false);
      setTwoWayPropName(cfg.twoWayPropertyName || currentDatabaseTitle || 'Related');
      setLimit(cfg.limit || 'multiple');
      setSearchFilter('');
    }
  }, [isOpen, existingProperty, currentDatabaseTitle]);

  const filteredDatabases = useMemo(() => {
    if (!searchFilter.trim()) return workspaceDatabases;
    const q = searchFilter.toLowerCase().trim();
    return workspaceDatabases.filter(
      (d) =>
        (d.title || 'Untitled Database').toLowerCase().includes(q)
    );
  }, [workspaceDatabases, searchFilter]);

  const selectedDatabase = useMemo(() => {
    return workspaceDatabases.find((d) => d.id === selectedDbId);
  }, [workspaceDatabases, selectedDbId]);

  // Auto-set property name when selecting target database if property name is empty or default
  const handleSelectDatabase = (db: Database) => {
    setSelectedDbId(db.id);
    if (!propertyName || propertyName === 'Relation' || propertyName === 'Property') {
      setPropertyName(db.title || 'Related Database');
    }
    if (!twoWayPropName) {
      setTwoWayPropName(currentDatabaseTitle || 'Related');
    }
  };

  const handleSave = () => {
    if (!selectedDbId) return;
    const finalName = propertyName.trim() || selectedDatabase?.title || 'Relation';
    onSave({
      name: finalName,
      targetDatabaseId: selectedDbId,
      targetDatabaseTitle: selectedDatabase?.title || 'Untitled Database',
      twoWay,
      twoWayPropertyName: twoWay ? twoWayPropName.trim() || currentDatabaseTitle : undefined,
      limit,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-[#18181b] border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-stone-200/80 dark:border-zinc-800 flex items-center justify-between bg-stone-50/50 dark:bg-zinc-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[#1f4d3d] dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
                  {existingProperty ? 'Edit Relation' : 'Create Relation'}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-zinc-400">
                  Link records between this database and another database
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 no-scrollbar flex-1">
            {/* Property Name Input */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Property Name
              </label>
              <input
                type="text"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Projects, Tasks, Customer..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1f4d3d]"
              />
            </div>

            {/* Target Database Selection */}
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                Connect to Database
              </label>

              {/* Search Bar */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search databases..."
                  className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d]"
                />
              </div>

              {/* Database List */}
              <div className="max-h-48 overflow-y-auto border border-stone-200 dark:border-zinc-800 rounded-xl divide-y divide-stone-100 dark:divide-zinc-800/80 bg-white dark:bg-zinc-900/60 no-scrollbar">
                {isLoading ? (
                  <div className="py-6 text-center text-xs text-stone-400 animate-pulse">
                    Loading databases...
                  </div>
                ) : filteredDatabases.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-400 italic">
                    No databases found in workspace
                  </div>
                ) : (
                  filteredDatabases.map((db) => {
                    const isSelected = db.id === selectedDbId;
                    const isSelf = db.id === currentDatabaseId;
                    return (
                      <button
                        key={db.id}
                        type="button"
                        onClick={() => handleSelectDatabase(db)}
                        className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-[#1f4d3d] dark:text-emerald-300 font-semibold'
                            : 'hover:bg-stone-50 dark:hover:bg-zinc-800/60 text-stone-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base shrink-0 select-none">
                            {db.icon || '📄'}
                          </span>
                          <div className="truncate">
                            <span className="block truncate font-medium">
                              {db.title || 'Untitled Database'}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-normal">
                                (This database • Self-relation)
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#1f4d3d] dark:bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Relation Options (Only active if a database is selected) */}
            {selectedDbId && (
              <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-800 space-y-4 animate-in fade-in duration-150">
                {/* Two-Way Relation Toggle */}
                <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-zinc-900 border border-stone-200/70 dark:border-zinc-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-stone-800 dark:text-zinc-200">
                        Show on {selectedDatabase?.title || 'Target Database'}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-zinc-400">
                        Create a reciprocal property to sync changes both ways
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTwoWay(!twoWay)}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        twoWay ? 'bg-[#1f4d3d] dark:bg-emerald-600' : 'bg-stone-300 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          twoWay ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {twoWay && (
                    <div className="pt-2 border-t border-stone-200/60 dark:border-zinc-800/80">
                      <label className="block text-[10px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Property name on {selectedDatabase?.title || 'target database'}
                      </label>
                      <input
                        type="text"
                        value={twoWayPropName}
                        onChange={(e) => setTwoWayPropName(e.target.value)}
                        placeholder={`e.g. ${currentDatabaseTitle}`}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#1f4d3d]"
                      />
                    </div>
                  )}
                </div>

                {/* Limit Selection */}
                <div>
                  <label className="block text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Limit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLimit('multiple')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        limit === 'multiple'
                          ? 'border-[#1f4d3d] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-[#1f4d3d] dark:text-emerald-400 font-semibold'
                          : 'border-stone-200 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700 text-stone-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-0.5">No limit</div>
                      <div className="text-[10px] text-stone-500 dark:text-zinc-400 font-normal">
                        Link multiple records
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLimit('single')}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        limit === 'single'
                          ? 'border-[#1f4d3d] dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-[#1f4d3d] dark:text-emerald-400 font-semibold'
                          : 'border-stone-200 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700 text-stone-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="font-semibold text-xs mb-0.5">1 record</div>
                      <div className="text-[10px] text-stone-500 dark:text-zinc-400 font-normal">
                        Link only 1 record
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/40 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-stone-600 dark:text-zinc-300 hover:bg-stone-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedDbId}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#1f4d3d] hover:bg-[#183e31] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.96] shadow-xs cursor-pointer"
            >
              {existingProperty ? 'Save changes' : 'Add relation'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
