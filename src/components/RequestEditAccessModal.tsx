import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Edit02Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Mail01Icon,
  AlertCircleIcon,
  SentIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { Modal } from './Modal';
import {
  getUserPageAccessRequestFn,
  requestPageEditAccessFn,
  cancelPageAccessRequestFn,
} from '~/server/pages';

interface RequestEditAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle?: string;
  userEmail?: string | null;
  isLoggedIn?: boolean;
}

export const RequestEditAccessModal: React.FC<RequestEditAccessModalProps> = ({
  isOpen,
  onClose,
  pageId,
  pageTitle = 'Untitled Document',
  userEmail,
  isLoggedIn = false,
}) => {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [guestEmail, setGuestEmail] = useState(userEmail || '');
  const [guestName, setGuestName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: existingRequest, isLoading: isLoadingRequest } = useQuery({
    queryKey: ['userAccessRequest', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      return await getUserPageAccessRequestFn({ data: pageId });
    },
    enabled: isOpen && !!pageId,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      return await requestPageEditAccessFn({
        data: {
          pageId,
          note,
          email: isLoggedIn ? undefined : guestEmail,
          name: isLoggedIn ? undefined : guestName,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        setSuccessMsg(res.message || 'Edit access request submitted successfully!');
        setNote('');
        queryClient.invalidateQueries({ queryKey: ['userAccessRequest', pageId] });
        queryClient.invalidateQueries({ queryKey: ['pendingAccessRequests', pageId] });
      } else {
        setErrorMsg(res?.error || 'Failed to submit access request.');
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'An error occurred while submitting your request.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await cancelPageAccessRequestFn({ data: requestId });
    },
    onSuccess: () => {
      setSuccessMsg('Access request withdrawn.');
      queryClient.invalidateQueries({ queryKey: ['userAccessRequest', pageId] });
      queryClient.invalidateQueries({ queryKey: ['pendingAccessRequests', pageId] });
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestMutation.mutate();
  };

  const isPending = existingRequest?.status === 'pending';
  const isApproved = existingRequest?.status === 'approved';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Edit Access"
      subtitle={`Ask the document owner for editing permissions on "${pageTitle}"`}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
          {!isPending && !isApproved && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={requestMutation.isPending || (!isLoggedIn && !guestEmail.trim())}
              className="h-9 px-5 rounded-lg bg-brand-bg hover:bg-brand-hover text-brand-fg text-xs font-semibold tracking-tight shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HugeiconsIcon icon={SentIcon} size={14} />
              <span>{requestMutation.isPending ? 'Sending...' : 'Send Request'}</span>
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-stone-900 dark:text-stone-100 select-none">
        {isLoadingRequest ? (
          <div className="py-8 text-center text-xs text-stone-400 dark:text-zinc-500 flex items-center justify-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-stone-500 border-t-transparent animate-spin" />
            <span>Checking access status...</span>
          </div>
        ) : isPending ? (
          <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/80 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 shrink-0">
                <HugeiconsIcon icon={Clock01Icon} size={18} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Edit Request Pending Approval
                </span>
                <p className="text-[11.5px] text-amber-700 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                  You requested edit access for <span className="font-medium text-amber-900 dark:text-amber-100">"{pageTitle}"</span>.
                  The document owner has been notified and can approve your request.
                </p>
                {existingRequest.note && (
                  <div className="mt-2.5 p-2.5 rounded-md bg-white/70 dark:bg-black/30 border border-amber-200/60 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 font-mono italic">
                    "{existingRequest.note}"
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex justify-end">
              <button
                type="button"
                onClick={() => cancelMutation.mutate(existingRequest.id)}
                disabled={cancelMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-800 dark:text-amber-200 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={13} />
                <span>{cancelMutation.isPending ? 'Withdrawing...' : 'Withdraw Request'}</span>
              </button>
            </div>
          </div>
        ) : isApproved ? (
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/90 dark:border-emerald-800/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 shrink-0">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                Access Granted!
              </span>
              <p className="text-[11.5px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                Your edit access request has been approved. Refresh or re-open the page to start editing.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 flex items-center gap-3">
              <div className="p-2 rounded-md bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
                <HugeiconsIcon icon={Edit02Icon} size={16} />
              </div>
              <div className="flex flex-col text-xs">
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  Currently: View Only
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Submitting a request will notify the owner to upgrade your permissions to Editor.
                </span>
              </div>
            </div>

            {!isLoggedIn && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                  Your Contact Info <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center bg-white dark:bg-[#222226] border border-stone-300/80 dark:border-stone-700 rounded-lg px-3 h-9">
                    <HugeiconsIcon icon={Mail01Icon} size={14} className="text-stone-400 shrink-0 mr-2" />
                    <input
                      type="email"
                      required
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="Your email address"
                      className="w-full text-xs font-medium bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none placeholder:text-stone-400"
                    />
                  </div>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full h-9 px-3 text-xs font-medium bg-white dark:bg-[#222226] border border-stone-300/80 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none placeholder:text-stone-400"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                <span>Message to Owner (Optional)</span>
                <span className="text-[10.5px] font-normal text-stone-400">Include details about your request</span>
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Hi! I'd like edit access to add the project notes and update section 3..."
                className="w-full p-3 text-xs font-medium bg-white dark:bg-[#222226] border border-stone-300/80 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-stone-800 dark:focus:border-stone-400 transition-colors resize-none"
              />
            </div>
          </form>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={15} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <HugeiconsIcon icon={AlertCircleIcon} size={15} className="text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </Modal>
  );
};
