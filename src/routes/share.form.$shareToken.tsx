import React, { useState } from 'react';
import { createRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicFormByToken, submitPublicForm } from '~/server/databases';
import { Route as rootRoute } from './__root';
import { Check, AlertCircle, RotateCcw } from 'lucide-react';
import type { DatabaseProperty } from '~/db/schema';
import { cn } from '#/lib/utils';
import { motion } from 'motion/react';

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
    const rawFormTitle = loaderData?.form?.title;
    const rawDbTitle = loaderData?.database?.title;
    const title =
      rawFormTitle && rawFormTitle !== 'Untitled Database' && rawFormTitle !== 'Untitled Form'
        ? rawFormTitle
        : (rawDbTitle || rawFormTitle || 'Form');
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
      <div className="min-h-screen bg-white dark:bg-[#121214] text-stone-900 dark:text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-200/60 dark:border-rose-800/40">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">Form Not Found</h2>
          <p className="text-xs text-stone-500 dark:text-zinc-400 leading-relaxed">
            This form link is invalid, private, or has been removed by the workspace owner.
          </p>
        </div>
      </div>
    );
  }

  const { form, database, properties } = data;
  const settings = form.settings || {};
  const submitBtnText = settings.submitButtonText || 'Submit';
  const successMsg = settings.successMessage || 'Your response has been recorded.';

  const effectiveTitle =
    form.title && form.title !== 'Untitled Database' && form.title !== 'Untitled Form'
      ? form.title
      : (database.title || form.title || 'Form');

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
    <div className="min-h-screen bg-white dark:bg-[#121214] text-stone-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-stone-200 dark:selection:bg-zinc-800">
      {/* Main Form Body */}
      <main className="flex-1 w-full max-w-3xl lg:max-w-4xl mx-auto px-6 sm:px-10 md:px-12 py-12 sm:py-20 flex flex-col justify-between">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="my-auto py-12 text-left space-y-5 select-none"
          >
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-[#1f4d3d] dark:text-emerald-400 rounded-full flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
              <Check className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
                Thank you!
              </h2>
              <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed">
                {successMsg}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({});
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-800 dark:text-zinc-200 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Submit another response</span>
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Title & Description Header */}
            <div className="space-y-2">
              {database.icon && (
                <div className="text-4xl mb-3 select-none">
                  {database.icon}
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-white leading-tight">
                {effectiveTitle}
              </h1>
              {form.description && (
                <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {form.description}
                </p>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-8 pt-2">
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-md text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {properties.map((prop) => {
                if (prop.type === 'created_at') return null;

                return (
                  <div key={prop.id} className="space-y-2.5">
                    <label className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                      <span>{prop.name}</span>
                      {prop.type === 'title' && <span className="text-rose-500 text-sm font-normal">*</span>}
                    </label>

                    <PublicFieldInput
                      prop={prop}
                      value={formData[prop.id]}
                      onChange={(val) => setFormData((prev) => ({ ...prev, [prop.id]: val }))}
                    />
                  </div>
                );
              })}

              <div className="pt-2 space-y-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-md text-sm font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 border border-transparent dark:border-zinc-700 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {submitting ? 'Submitting...' : submitBtnText}
                </button>

                <div className="text-[11px] text-stone-400 dark:text-zinc-500 space-y-1">
                  <p>Never submit sensitive personal information, like passwords, through Notling Forms.</p>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="py-6 px-6 sm:px-10 md:px-12 text-left max-w-3xl lg:max-w-4xl mx-auto w-full text-xs text-stone-400 dark:text-zinc-600 select-none">
        Powered by <a href="/" className="font-semibold text-stone-600 dark:text-zinc-400 hover:underline">Notling</a>
      </footer>
    </div>
  );
}

function PublicFieldInput({
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
