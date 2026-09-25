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
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 bg-red-950 text-red-400 border border-red-800 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Form Not Found</h2>
          <p className="text-xs text-neutral-400">
            This form link is invalid, private, or has been deleted by the owner.
          </p>
        </div>
      </div>
    );
  }

  const { form, database, properties } = data;
  const settings = form.settings || {};
  const headerColor = settings.headerColor || 'from-indigo-600 to-purple-600';
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between p-4 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6 my-auto">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Banner */}
          <div className={`p-8 bg-gradient-to-r ${headerColor} text-white space-y-2`}>
            <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Notling Workspace Form</span>
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
                <div className="w-14 h-14 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-neutral-100">Response Submitted!</h2>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">{successMsg}</p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({});
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors text-neutral-200"
                >
                  Submit Another Response
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs">
                    {errorMsg}
                  </div>
                )}

                {properties.map((prop) => (
                  <div key={prop.id} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                      <PropertyTypeIcon type={prop.type} className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{prop.name}</span>
                      {prop.type === 'title' && <span className="text-red-500">*</span>}
                    </label>

                    <PublicInput
                      prop={prop}
                      value={formData[prop.id]}
                      onChange={(val) => setFormData((prev) => ({ ...prev, [prop.id]: val }))}
                    />
                  </div>
                ))}

                <div className="pt-4 border-t border-neutral-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all disabled:opacity-50"
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
      <footer className="text-center text-[11px] text-neutral-600 py-4">
        Powered by <span className="font-semibold text-neutral-400">Notling Workspaces</span>
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
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : '')}
          placeholder="0"
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-neutral-400">Yes</span>
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );

    case 'select':
    case 'status':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
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
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="email@example.com"
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-xs border rounded-lg bg-neutral-800/80 border-neutral-700 text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 focus:outline-none transition-colors"
        />
      );
  }
}
