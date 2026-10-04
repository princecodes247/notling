import React, { useState, useEffect, useMemo } from 'react';
import type { DatabaseProperty, DatabaseForm } from '~/db/schema';
import {
  Copy,
  Check,
  ExternalLink,
  SlidersHorizontal,
  Globe,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DatabaseFormViewProps {
  form?: DatabaseForm;
  databaseTitle?: string;
  databaseIcon?: string;
  properties: DatabaseProperty[];
  onUpdateFormSettings: (formId: string, updates: any) => void;
  onSubmitTestForm: (properties: Record<string, any>, title?: string) => Promise<void>;
  readOnly?: boolean;
}

export function DatabaseFormView({
  form,
  databaseTitle,
  databaseIcon,
  properties,
  onUpdateFormSettings,
  onSubmitTestForm,
  readOnly = false,
}: DatabaseFormViewProps) {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const settings = form?.settings || {};

  const resolvedFormTitle = useMemo(() => {
    if (form?.title && form.title !== 'Untitled Database' && form.title !== 'Untitled Form') {
      return form.title;
    }
    return databaseTitle || form?.title || 'Untitled Form';
  }, [form?.title, databaseTitle]);

  const [formTitle, setFormTitle] = useState(resolvedFormTitle);
  const [formDesc, setFormDesc] = useState(form?.description || '');
  const [submitBtnText, setSubmitBtnText] = useState(settings.submitButtonText || 'Submit');
  const [successMsg, setSuccessMsg] = useState(
    settings.successMessage || 'Your response has been recorded.'
  );
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? true);

  useEffect(() => {
    setFormTitle(resolvedFormTitle);
  }, [resolvedFormTitle]);

  useEffect(() => {
    if (form?.description !== undefined) {
      setFormDesc(form.description || '');
    }
  }, [form?.description]);

  const publicUrl = form && typeof window !== 'undefined'
    ? `${window.location.origin}/share/form/${form.shareToken}`
    : '';

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const titleProp = properties.find((p) => p.type === 'title');
      const titleVal = titleProp ? formData[titleProp.id] : undefined;
      await onSubmitTestForm(formData, titleVal);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit form:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = () => {
    if (!form) return;
    onUpdateFormSettings(form.id, {
      title: formTitle.trim() || 'Untitled Form',
      description: formDesc.trim(),
      isPublic,
      settings: {
        ...settings,
        submitButtonText: submitBtnText.trim() || 'Submit',
        successMessage: successMsg.trim() || 'Your response has been recorded.',
      },
    });
    setIsSettingsOpen(false);
  };

  return (
    <div className="w-full max-w-3xl lg:max-w-4xl mx-auto py-8 px-4 sm:px-8 md:px-12 space-y-10 font-sans">
      {/* Top Form Header Actions Toolbar */}
      <div className="flex items-center justify-between gap-3 text-xs border-b border-stone-200/60 dark:border-zinc-800/80 pb-3 select-none">
        <div className="flex items-center gap-2 text-stone-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5 font-medium">
            {isPublic ? (
              <>
                <Globe className="w-3.5 h-3.5 text-[#1f4d3d] dark:text-emerald-400" />
                <span className="text-stone-700 dark:text-zinc-300">Public form</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Private form</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                isSettingsOpen
                  ? "bg-stone-100 dark:bg-zinc-800 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100"
                  : "bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-zinc-800"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          )}

          {publicUrl && (
            <>
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-stone-900 hover:bg-stone-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy link'}</span>
              </button>

              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-md border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-stone-600 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
                title="Open standalone public form"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && !readOnly && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-md bg-stone-50/70 dark:bg-zinc-900/50 border border-stone-200/70 dark:border-zinc-800/70 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600 dark:text-zinc-400">
                    Submit button label
                  </label>
                  <input
                    type="text"
                    value={submitBtnText}
                    onChange={(e) => setSubmitBtnText(e.target.value)}
                    placeholder="Submit"
                    className="w-full px-2.5 py-1 rounded bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-stone-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-stone-600 dark:text-zinc-400">
                    Success message
                  </label>
                  <input
                    type="text"
                    value={successMsg}
                    onChange={(e) => setSuccessMsg(e.target.value)}
                    placeholder="Your response has been recorded."
                    className="w-full px-2.5 py-1 rounded bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-stone-900 dark:focus:border-stone-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="formPublicToggle"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="bn-checkbox w-3.5 h-3.5 cursor-pointer"
                  />
                  <label
                    htmlFor="formPublicToggle"
                    className="text-xs font-medium text-stone-800 dark:text-zinc-200 cursor-pointer select-none"
                  >
                    Allow public submissions
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-stone-900 hover:bg-stone-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Document-style Form Area */}
      <div className="space-y-8">
        {/* Document Title & Description */}
        <div className="space-y-2">
          {databaseIcon && (
            <div className="text-4xl mb-1 select-none">
              {databaseIcon}
            </div>
          )}
          {!readOnly ? (
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              onBlur={handleSaveSettings}
              placeholder="Untitled Form"
              className="w-full text-3xl sm:text-4xl font-bold tracking-tight bg-transparent border-none focus:outline-none text-stone-900 dark:text-white placeholder:text-stone-300 dark:placeholder:text-zinc-600 px-0 py-0.5"
            />
          ) : (
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white">
              {formTitle || 'Untitled Form'}
            </h1>
          )}

          {!readOnly ? (
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              onBlur={handleSaveSettings}
              placeholder="Fill out this form to add a new record to the database."
              className="w-full text-sm text-stone-500 dark:text-zinc-400 bg-transparent border-none focus:outline-none placeholder:text-stone-400 dark:placeholder:text-zinc-600 px-0 resize-none leading-relaxed"
            />
          ) : (
            formDesc && (
              <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">
                {formDesc}
              </p>
            )
          )}
        </div>

        {/* Form Body */}
        {submitted ? (
          <div className="py-12 text-center space-y-3 max-w-sm mx-auto select-none border-t border-stone-200/60 dark:border-zinc-800/80 pt-8">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 text-[#1f4d3d] dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
              Response Submitted
            </h2>
            <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
              {successMsg}
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setFormData({});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-stone-100 dark:bg-zinc-800 hover:bg-stone-200 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Submit another response</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-8">
            {properties.map((prop) => {
              if (prop.type === 'created_at' || prop.type === 'relation') return null;

              return (
                <div key={prop.id} className="space-y-2.5">
                  <label className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <span>{prop.name}</span>
                    {prop.type === 'title' && <span className="text-rose-500 text-sm font-normal">*</span>}
                  </label>

                  <FormFieldInput
                    prop={prop}
                    value={formData[prop.id]}
                    onChange={(val) => setFormData((prev) => ({ ...prev, [prop.id]: val }))}
                  />
                </div>
              );
            })}

            <div className="pt-4 flex items-center justify-start">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-md text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-transparent dark:border-zinc-700 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
              >
                {submitting ? 'Submitting...' : submitBtnText}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FormFieldInput({
  prop,
  value,
  onChange,
}: {
  prop: DatabaseProperty;
  value: any;
  onChange: (val: any) => void;
}) {
  switch (prop.type) {
    case 'title':
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={prop.type === 'title'}
          placeholder="Your answer"
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
          placeholder="Your answer"
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors font-mono"
        />
      );

    case 'checkbox':
      return (
        <label className="flex items-center gap-3 cursor-pointer group select-none pt-0.5">
          <div
            onClick={() => onChange(!Boolean(value))}
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
              value
                ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white text-white dark:text-zinc-900"
                : "border-stone-400 dark:border-zinc-600 group-hover:border-stone-600 dark:group-hover:border-zinc-400"
            )}
          >
            {value && <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <span
            onClick={() => onChange(!Boolean(value))}
            className="text-sm text-stone-800 dark:text-zinc-200"
          >
            Yes
          </span>
        </label>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors cursor-pointer"
        />
      );

    case 'select':
    case 'status':
      return (
        <div className="space-y-2.5 pt-1">
          {prop.options?.map((opt) => {
            const isSelected = value === opt.id;
            return (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer group select-none"
                onClick={() => onChange(isSelected ? null : opt.id)}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                    isSelected
                      ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white"
                      : "border-stone-400 dark:border-zinc-600 group-hover:border-stone-600 dark:group-hover:border-zinc-400"
                  )}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-900" />}
                </div>
                <span className="text-sm text-stone-800 dark:text-zinc-200 group-hover:text-stone-950 dark:group-hover:text-white">
                  {opt.name}
                </span>
              </label>
            );
          })}
          {(!prop.options || prop.options.length === 0) && (
            <p className="text-xs text-stone-400 italic">No options defined</p>
          )}
        </div>
      );

    case 'multi_select': {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5 pt-1">
          {prop.options?.map((opt) => {
            const isChecked = selected.includes(opt.id);
            return (
              <label
                key={opt.id}
                className="flex items-center gap-3 cursor-pointer group select-none"
                onClick={() => {
                  const next = isChecked
                    ? selected.filter((id) => id !== opt.id)
                    : [...selected, opt.id];
                  onChange(next);
                }}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                    isChecked
                      ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white text-white dark:text-zinc-900"
                      : "border-stone-400 dark:border-zinc-600 group-hover:border-stone-600 dark:group-hover:border-zinc-400"
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="text-sm text-stone-800 dark:text-zinc-200 group-hover:text-stone-950 dark:group-hover:text-white">
                  {opt.name}
                </span>
              </label>
            );
          })}
          {(!prop.options || prop.options.length === 0) && (
            <p className="text-xs text-stone-400 italic">No options defined</p>
          )}
        </div>
      );
    }

    case 'url':
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://"
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your answer"
          className="w-full px-3.5 py-2.5 rounded-md bg-transparent border border-stone-300 dark:border-zinc-700/80 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm focus:outline-none focus:border-stone-900 dark:focus:border-zinc-300 transition-colors"
        />
      );
  }
}
