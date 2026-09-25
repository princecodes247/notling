import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicFormByToken, submitPublicForm } from '~/server/databases';
import { Route as rootRoute } from './__root';
import { PropertyTypeIcon } from '~/components/database/PropertyTypeIcon';
import { Check, Send, Sparkles, AlertCircle } from 'lucide-react';
import type { DatabaseProperty } from '~/db/schema';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/share/form/$shareToken',
  loader: async ({ params }) => {
    try {
      return await getPublicFormByToken({ data: params.shareToken });
    } catch {
      return null;
    }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.form?.title || loaderData?.database?.title || 'Submit Form';
    return {
      meta: [
        { title: `${title} — Notling Forms` },
        { name: 'description', content: loaderData?.form?.description || 'Form submission' },
      ],
    };
  },
  component: PublicFormRouteComponent,
});

function PublicFormRouteComponent() {
  const { shareToken } = Route.useParams();
  const initialData = Route.useLoaderData();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['publicForm', shareToken],
    queryFn: async () => {
      if (!shareToken) return null;
      return await getPublicFormByToken({ data: shareToken });
    },
    initialData,
  });

  if (!data || !data.form) {
    return (
      <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#121214] text-stone-900 dark:text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Form Not Found</h2>
          <p className="text-xs text-stone-500 dark:text-zinc-400">
            This form link is invalid, private, or has been removed by the workspace owner.
          </p>
        </div>
      </div>
    );
  }

  const { form, database, properties } = data;
  const settings = form.settings || {};
  const headerColor = settings.headerColor || 'from-[#1f4d3d] to-[#123026]';
  const submitBtnText = settings.submitButtonText || 'Submit Response';
  const successMsg = settings.successMessage || 'Thank you! Your response has been recorded.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const titleProp = properties.find((p) => p.type === 'title');
      const titleVal = titleProp ? formData[titleProp.id] : undefined;

      await submitPublicForm({
        data: {
          shareToken,
          properties: formData,
          title: titleVal,
        },
      });

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#121214] text-stone-900 dark:text-zinc-100 flex flex-col justify-between p-4 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6 my-auto">
        <div className="bg-white dark:bg-[#18181b] border border-stone-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
          {/* Header Banner */}
          <div className={`p-8 bg-gradient-to-r ${headerColor} text-white space-y-2`}>
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Notling Form</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{form.title || database.title}</h1>
            {form.description && (
              <p className="text-sm text-white/90 leading-relaxed">{form.description}</p>
            )}
          </div>

          {/* Form Content */}
          <div className="p-8">
            {submitted ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-[#1f4d3d] dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-stone-900 dark:text-zinc-100">Response Submitted!</h2>
                <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm mx-auto">{successMsg}</p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({});
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-stone-100 dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 hover:bg-stone-200 dark:hover:bg-zinc-700 transition-colors text-stone-800 dark:text-zinc-200 cursor-pointer"
                >
                  Submit Another Response
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs">
                    {errorMsg}
                  </div>
                )}

                {properties.map((prop) => (
                  <div key={prop.id} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-stone-400" />
                      <span>{prop.name}</span>
                      {prop.type === 'title' && <span className="text-rose-500">*</span>}
                    </label>

                    <PublicInput
                      prop={prop}
                      value={formData[prop.id]}
                      onChange={(val) => setFormData((prev) => ({ ...prev, [prop.id]: val }))}
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-stone-200/80 dark:border-zinc-800/80 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#1f4d3d] text-white hover:bg-[#183e31] shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting...' : submitBtnText}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="text-center text-[11px] text-stone-400 dark:text-zinc-500 py-4">
        Powered by <span className="font-semibold text-stone-700 dark:text-zinc-300">Notling Workspaces</span>
      </footer>
    </div>
  );
}

function PublicInput({ prop, value, onChange }: { prop: DatabaseProperty; value: any; onChange: (val: any) => void }) {
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
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
          placeholder="0"
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 text-[#1f4d3d] focus:ring-[#1f4d3d]"
          />
          <span className="text-xs text-stone-600 dark:text-zinc-400">Yes</span>
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );

    case 'select':
    case 'status':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
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
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${isChecked ? 'ring-2 ring-[#1f4d3d] font-semibold' : 'opacity-70 hover:opacity-100'}`}
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
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3.5 py-2 text-xs border rounded-xl bg-stone-50/60 dark:bg-zinc-900/60 border-stone-300 dark:border-zinc-700 text-stone-900 dark:text-zinc-100 focus:ring-2 focus:ring-[#1f4d3d] focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
        />
      );
  }
}
