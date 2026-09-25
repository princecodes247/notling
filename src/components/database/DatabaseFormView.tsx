import React, { useState } from 'react';
import type { DatabaseProperty, DatabaseForm } from '~/db/schema';
import { PropertyTypeIcon } from './PropertyTypeIcon';
import { Copy, Check, ExternalLink, Globe, Lock, Send, Sparkles, Settings2 } from 'lucide-react';

interface DatabaseFormViewProps {
  form?: DatabaseForm;
  properties: DatabaseProperty[];
  onUpdateFormSettings: (formId: string, updates: any) => void;
  onSubmitTestForm: (properties: Record<string, any>, title?: string) => Promise<void>;
  readOnly?: boolean;
}

export function DatabaseFormView({
  form,
  properties,
  onUpdateFormSettings,
  onSubmitTestForm,
  readOnly = false,
}: DatabaseFormViewProps) {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  // Form customization values
  const settings = form?.settings || {};
  const [formTitle, setFormTitle] = useState(form?.title || 'Submit Entry');
  const [formDesc, setFormDesc] = useState(form?.description || 'Please fill out all required fields below.');
  const [submitBtnText, setSubmitBtnText] = useState(settings.submitButtonText || 'Submit Response');
  const [successMsg, setSuccessMsg] = useState(settings.successMessage || 'Thank you! Your response has been recorded.');
  const [headerColor, setHeaderColor] = useState(settings.headerColor || 'from-indigo-600 to-purple-600');
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? true);

  const publicUrl = form ? `${window.location.origin}/share/form/${form.shareToken}` : '';

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
      title: formTitle,
      description: formDesc,
      isPublic,
      settings: {
        ...settings,
        submitButtonText: submitBtnText,
        successMessage: successMsg,
        headerColor,
      },
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <span>Form View & Share</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isPublic ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                {isPublic ? 'Public Active' : 'Private'}
              </span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Collect submissions directly into this database using your shareable form link.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white dark:bg-neutral-700 shadow-xs text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'}`}
              >
                Form Preview
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-white dark:bg-neutral-700 shadow-xs text-neutral-900 dark:text-neutral-100' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'}`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Config</span>
              </button>
            </div>
          )}

          {form && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Form URL'}</span>
            </button>
          )}

          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Open Standalone Form Page"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {activeTab === 'settings' && !readOnly ? (
        /* Settings Form Tab */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-5 shadow-sm">
          <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-800 pb-3">
            Form Customization & Settings
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Form Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Submit Button Label
              </label>
              <input
                type="text"
                value={submitBtnText}
                onChange={(e) => setSubmitBtnText(e.target.value)}
                className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Form Description
            </label>
            <textarea
              rows={2}
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Success Message after Submission
            </label>
            <input
              type="text"
              value={successMsg}
              onChange={(e) => setSuccessMsg(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Header Gradient Preset
            </label>
            <select
              value={headerColor}
              onChange={(e) => setHeaderColor(e.target.value)}
              className="w-full px-3 py-2 text-xs border rounded-lg bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700"
            >
              <option value="from-indigo-600 to-purple-600">Indigo to Purple</option>
              <option value="from-blue-600 to-cyan-600">Blue to Cyan</option>
              <option value="from-emerald-600 to-teal-600">Emerald to Teal</option>
              <option value="from-rose-600 to-orange-500">Rose to Orange</option>
              <option value="from-neutral-800 to-neutral-950">Midnight Dark</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isPublicToggle"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPublicToggle" className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              Enable Public Access (Anyone with the share link can submit answers)
            </label>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Save Form Settings
            </button>
          </div>
        </div>
      ) : (
        /* Form Live Preview */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xl max-w-2xl mx-auto">
          {/* Form Header Banner */}
          <div className={`p-8 bg-gradient-to-r ${headerColor} text-white space-y-2`}>
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Database Form</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{formTitle}</h2>
            <p className="text-sm text-white/90 leading-relaxed">{formDesc}</p>
          </div>

          {/* Form Body */}
          <div className="p-8">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Response Submitted!</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">{successMsg}</p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({});
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Submit Another Entry
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                {properties.map((prop) => (
                  <div key={prop.id} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{prop.name}</span>
                      {prop.type === 'title' && <span className="text-red-500">*</span>}
                    </label>

                    <FormFieldInput
                      prop={prop}
                      value={formData[prop.id]}
                      onChange={(val) => setFormData((prev) => ({ ...prev, [prop.id]: val }))}
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting...' : submitBtnText}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FormFieldInput({ prop, value, onChange }: { prop: DatabaseProperty; value: any; onChange: (val: any) => void }) {
  switch (prop.type) {
    case 'title':
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required={prop.type === 'title'}
          placeholder={`Enter ${prop.name.toLowerCase()}...`}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
          placeholder="0"
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">Yes</span>
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );

    case 'select':
    case 'status':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        >
          <option value="">Select option...</option>
          {prop.options?.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      );

    case 'multi_select': {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {prop.options?.map((opt) => {
            const isChecked = selected.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const next = isChecked ? selected.filter((id) => id !== opt.id) : [...selected, opt.id];
                  onChange(next);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${isChecked ? 'ring-2 ring-blue-500 font-semibold' : 'opacity-70 hover:opacity-100'}`}
                style={{
                  backgroundColor: `${opt.color}25`,
                  color: opt.color,
                  border: `1px solid ${opt.color}50`,
                }}
              >
                {isChecked ? `✓ ${opt.name}` : opt.name}
              </button>
            );
          })}
        </div>
      );
    }

    case 'url':
      return (
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-neutral-800 transition-colors"
        />
      );
  }
}
