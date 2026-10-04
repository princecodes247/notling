import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserSession } from '~/server/auth';
import {
  checkWorkspaceSubdomain,
  updateWorkspaceSubdomain,
  getWorkspaceCustomDomains,
  addWorkspaceCustomDomain,
  removeWorkspaceCustomDomain,
  setPrimaryCustomDomain,
  updateCustomDomainHomeDoc,
  verifyCustomDomain,
} from '~/server/domains';
import { getPageTree, type PageTreeNode } from '~/server/pages';
import {
  Globe,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Loader2,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
} from 'lucide-react';

interface WorkspaceDomainsSectionProps {
  session: UserSession | null | undefined;
  isWorkspaceOwner: boolean;
}

export function WorkspaceDomainsSection({ session, isWorkspaceOwner }: WorkspaceDomainsSectionProps) {
  const queryClient = useQueryClient();
  const workspaceId = session?.workspaceId;

  // --- Subdomain State ---
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainCheck, setSubdomainCheck] = useState<{
    isAvailable: boolean;
    candidateSubdomain: string;
    cleanSubdomain: string;
    error?: string;
  } | null>(null);
  const [subdomainSaved, setSubdomainSaved] = useState(false);
  const [selectedHomeDocId, setSelectedHomeDocId] = useState<string>('');
  const [copiedSubdomain, setCopiedSubdomain] = useState(false);

  // Sync initial subdomain & home doc
  useEffect(() => {
    if (session) {
      setSubdomainInput(session.workspaceSlug || '');
      setSelectedHomeDocId(session.workspacePublicHomeDocId || '');
    }
  }, [session]);

  // Live Check Subdomain
  useEffect(() => {
    let active = true;
    const clean = subdomainInput.trim().toLowerCase();
    if (!clean || !workspaceId || !isWorkspaceOwner) return;

    const timer = setTimeout(async () => {
      try {
        const res = await checkWorkspaceSubdomain({
          data: { subdomain: clean, excludeWorkspaceId: workspaceId },
        });
        if (active) {
          setSubdomainCheck(res);
        }
      } catch (err) {
        console.error(err);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [subdomainInput, workspaceId, isWorkspaceOwner]);

  // Fetch Public Pages for Home Doc Picker
  const { data: pageTree = [] } = useQuery({
    queryKey: ['pageTree', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getPageTree({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  // Flatten public pages from tree
  const flattenPages = (nodes: PageTreeNode[]): Array<{ id: string; title: string; icon?: string | null }> => {
    const list: Array<{ id: string; title: string; icon?: string | null }> = [];
    const traverse = (items: PageTreeNode[]) => {
      for (const item of items) {
        list.push({ id: item.id, title: item.title, icon: item.icon });
        if (item.children?.length) traverse(item.children);
      }
    };
    traverse(nodes);
    return list;
  };

  const availablePages = flattenPages(pageTree);

  // Update Subdomain Mutation
  const updateSubdomainMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return;
      return await updateWorkspaceSubdomain({
        data: {
          workspaceId,
          subdomain: subdomainInput.trim(),
          publicHomeDocId: selectedHomeDocId || null,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        setSubdomainSaved(true);
        queryClient.invalidateQueries({ queryKey: ['session'] });
        setTimeout(() => setSubdomainSaved(false), 2000);
      }
    },
  });

  // --- Custom Domains State ---
  const { data: customDomains = [], isLoading: isLoadingDomains } = useQuery({
    queryKey: ['customDomains', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getWorkspaceCustomDomains({ data: workspaceId });
    },
    enabled: !!workspaceId,
  });

  const [isAddDomainModalOpen, setIsAddDomainModalOpen] = useState(false);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainHomeDocId, setNewDomainHomeDocId] = useState('');
  const [addDomainError, setAddDomainError] = useState<string | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
  const [copiedTargetDomainId, setCopiedTargetDomainId] = useState<string | null>(null);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<{ id: string; message: string; success: boolean } | null>(null);

  // Add Custom Domain Mutation
  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) return;
      return await addWorkspaceCustomDomain({
        data: {
          workspaceId,
          domain: newDomainInput.trim(),
          publicHomeDocId: newDomainHomeDocId || null,
        },
      });
    },
    onSuccess: (res) => {
      if (res?.success) {
        queryClient.invalidateQueries({ queryKey: ['customDomains', workspaceId] });
        setIsAddDomainModalOpen(false);
        setNewDomainInput('');
        setNewDomainHomeDocId('');
        setAddDomainError(null);
      } else {
        setAddDomainError(res?.error || 'Failed to add custom domain.');
      }
    },
  });

  // Remove Custom Domain Mutation
  const removeDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return await removeWorkspaceCustomDomain({ data: { domainId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDomains', workspaceId] });
    },
  });

  // Set Primary Domain Mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (domainId: string) => {
      return await setPrimaryCustomDomain({ data: { domainId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDomains', workspaceId] });
    },
  });

  // Update Custom Domain Home Doc
  const updateHomeDocMutation = useMutation({
    mutationFn: async ({ domainId, docId }: { domainId: string; docId: string | null }) => {
      return await updateCustomDomainHomeDoc({ data: { domainId, publicHomeDocId: docId } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customDomains', workspaceId] });
    },
  });

  // Verify Custom Domain Mutation
  const verifyDomainMutation = useMutation({
    mutationFn: async ({ domainId, simulate }: { domainId: string; simulate?: boolean }) => {
      setVerifyingDomainId(domainId);
      setVerifyFeedback(null);
      return await verifyCustomDomain({ data: { domainId, simulate } });
    },
    onSuccess: (res, vars) => {
      setVerifyingDomainId(null);
      queryClient.invalidateQueries({ queryKey: ['customDomains', workspaceId] });
      if (res) {
        setVerifyFeedback({
          id: vars.domainId,
          message: res.message,
          success: res.success,
        });
      }
    },
    onError: (err: any) => {
      setVerifyingDomainId(null);
      setVerifyFeedback({
        id: '',
        message: err.message || 'Verification request failed.',
        success: false,
      });
    },
  });

  // Subdomain URL calculation
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const portPart = typeof window !== 'undefined' && window.location.port ? `:${window.location.port}` : '';
  const currentSubdomain = session?.workspaceSlug || 'workspace';
  
  const baseDomain =
    (typeof window !== 'undefined' && (import.meta.env.VITE_APP_DOMAIN as string)) ||
    (typeof window !== 'undefined' && !isDev && window.location.hostname !== 'localhost'
      ? window.location.hostname.replace(/^www\./, '')
      : 'notling.app');

  const subdomainUrl = isDev
    ? `http://${currentSubdomain}.localhost${portPart}`
    : `https://${currentSubdomain}.${baseDomain}`;

  const handleCopySubdomain = () => {
    navigator.clipboard.writeText(subdomainUrl);
    setCopiedSubdomain(true);
    setTimeout(() => setCopiedSubdomain(false), 2000);
  };

  const handleCopyTarget = (text: string, domainId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTargetDomainId(domainId);
    setTimeout(() => setCopiedTargetDomainId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Workspace Subdomain Section */}
      <div className="p-6 rounded-xl border border-neutral-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">
              Workspace Subdomain
            </h2>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>

        <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
          Your workspace and published public pages are accessible under this unique subdomain. Your subdomain is unified with your workspace slug.
        </p>

        {/* Live URL Preview Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-zinc-800/40 border border-neutral-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-2 min-w-0 font-mono text-xs text-neutral-800 dark:text-zinc-200">
            <LinkIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">{subdomainUrl}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySubdomain}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-neutral-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 hover:bg-neutral-100 dark:hover:bg-zinc-700 text-neutral-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {copiedSubdomain ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSubdomain ? 'Copied' : 'Copy URL'}</span>
            </button>
            <a
              href={subdomainUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-neutral-950 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs no-underline"
            >
              <span>Visit ↗</span>
            </a>
          </div>
        </div>

        {/* Edit Subdomain Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
              Workspace Slug
            </label>
            <div className="flex items-center rounded-lg border border-neutral-200 dark:border-zinc-700/80 bg-neutral-50 dark:bg-zinc-900 overflow-hidden focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-zinc-400">
              <input
                type="text"
                value={subdomainInput}
                onChange={(e) => isWorkspaceOwner && setSubdomainInput(e.target.value)}
                disabled={!isWorkspaceOwner}
                placeholder="acme"
                className="flex-1 px-3 py-2 text-xs font-mono text-neutral-900 dark:text-zinc-100 bg-transparent focus:outline-none disabled:cursor-not-allowed"
              />
              <span className="px-2.5 py-2 text-[11px] text-neutral-400 dark:text-zinc-500 font-mono border-l border-neutral-200 dark:border-zinc-700/80 bg-neutral-100/60 dark:bg-zinc-800/50">
                .{baseDomain}
              </span>
            </div>

            {isWorkspaceOwner && subdomainCheck && subdomainInput !== session?.workspaceSlug && (
              <div className="text-[10px] mt-1.5 font-medium">
                {subdomainCheck.isAvailable ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Subdomain is available!
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {subdomainCheck.error || `Taken — suggested: "${subdomainCheck.candidateSubdomain}"`}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
              Default Public Homepage
            </label>
            <select
              value={selectedHomeDocId}
              onChange={(e) => setSelectedHomeDocId(e.target.value)}
              disabled={!isWorkspaceOwner}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-zinc-700/80 text-xs text-neutral-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-zinc-400 disabled:cursor-not-allowed"
            >
              <option value="">Overview of all public documents</option>
              {availablePages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.icon || '📄'} {page.title || 'Untitled'}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">
              The document displayed when a visitor lands on the root (/) of your subdomain.
            </p>
          </div>
        </div>

        {isWorkspaceOwner && (
          <div className="flex items-center justify-end pt-2 border-t border-neutral-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => updateSubdomainMutation.mutate()}
              disabled={updateSubdomainMutation.isPending || !!(subdomainCheck && !subdomainCheck.isAvailable)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 disabled:opacity-50 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              {subdomainSaved ? <Check className="w-3.5 h-3.5" /> : null}
              <span>
                {subdomainSaved
                  ? 'Saved'
                  : updateSubdomainMutation.isPending
                    ? 'Saving...'
                    : 'Save Subdomain'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Custom Domains (Multiple Domains Supported) */}
      <div className="p-6 rounded-xl border border-neutral-200/90 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-500 dark:text-zinc-400" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-zinc-100">
              Custom Domains ({customDomains.length})
            </h2>
          </div>
          {isWorkspaceOwner && (
            <button
              type="button"
              onClick={() => {
                setAddDomainError(null);
                setNewDomainInput('');
                setIsAddDomainModalOpen(true);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-zinc-700/80 hover:bg-neutral-50 dark:hover:bg-zinc-800 text-neutral-800 dark:text-zinc-200 font-medium cursor-pointer transition-colors active:scale-95 flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Custom Domain</span>
            </button>
          )}
        </div>

        <p className="text-xs text-neutral-500 dark:text-zinc-400 leading-relaxed">
          Connect your own branded domain (e.g. <code>docs.company.com</code> or <code>notes.startup.io</code>).
          You can connect multiple domains to this workspace.
        </p>

        {/* Custom Domains List */}
        {isLoadingDomains ? (
          <div className="py-8 flex items-center justify-center text-xs text-neutral-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading connected domains...</span>
          </div>
        ) : customDomains.length > 0 ? (
          <div className="flex flex-col gap-3">
            {customDomains.map((item) => {
              const isExpanded = expandedDomainId === item.id;
              const isVerifying = verifyingDomainId === item.id;
              const feedback = verifyFeedback?.id === item.id ? verifyFeedback : null;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-neutral-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 overflow-hidden shadow-2xs"
                >
                  {/* Domain Row Header */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/40 dark:bg-zinc-800/20">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-neutral-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-900 dark:text-zinc-100 font-mono truncate">
                            {item.domain}
                          </span>
                          {item.isPrimary && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" /> Primary
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> SSL Active &amp; Verified
                            </span>
                          ) : item.status === 'invalid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                              <AlertCircle className="w-3 h-3" /> DNS Action Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              <Clock className="w-3 h-3" /> Pending DNS Verification
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={`https://${item.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 text-[11px] font-medium text-stone-600 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded hover:bg-neutral-200/60 dark:hover:bg-zinc-800 transition-colors inline-flex items-center gap-1"
                        title="Visit Domain"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setExpandedDomainId(isExpanded ? null : item.id)}
                        className="px-2.5 py-1 text-[11px] font-medium rounded border border-neutral-200 dark:border-zinc-700 text-neutral-700 dark:text-zinc-300 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>DNS Details</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isWorkspaceOwner && (
                        <button
                          type="button"
                          onClick={() => removeDomainMutation.mutate(item.id)}
                          disabled={removeDomainMutation.isPending}
                          className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded DNS Configuration Instructions */}
                  {isExpanded && (
                    <div className="p-4 border-t border-neutral-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex flex-col gap-4 text-xs">
                      <div>
                        <h4 className="text-[11px] font-semibold text-neutral-800 dark:text-zinc-200 mb-1">
                          DNS Configuration Record
                        </h4>
                        <p className="text-[11px] text-neutral-500 dark:text-zinc-400">
                          Add the following DNS record at your domain provider (e.g. Cloudflare, GoDaddy, Namecheap, Route53):
                        </p>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-zinc-800">
                        <table className="w-full text-left text-[11px] divide-y divide-neutral-200 dark:divide-zinc-800">
                          <thead className="bg-neutral-50 dark:bg-zinc-800/50 text-neutral-500 dark:text-zinc-400 font-medium">
                            <tr>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Host / Name</th>
                              <th className="px-3 py-2">Target / Value</th>
                              <th className="px-3 py-2">TTL</th>
                              <th className="px-3 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800/60 font-mono">
                            <tr className="bg-white dark:bg-zinc-900">
                              <td className="px-3 py-2 font-bold text-neutral-900 dark:text-white">
                                {item.dnsRecordType || 'CNAME'}
                              </td>
                              <td className="px-3 py-2 text-neutral-800 dark:text-zinc-200">
                                {item.domain.split('.')[0]}
                              </td>
                              <td className="px-3 py-2 text-neutral-800 dark:text-zinc-200">
                                {item.dnsTarget || 'cname.notling.app'}
                              </td>
                              <td className="px-3 py-2 text-neutral-500">Automatic / 3600</td>
                              <td className="px-3 py-2 text-right font-sans">
                                <button
                                  type="button"
                                  onClick={() => handleCopyTarget(item.dnsTarget || 'cname.notling.app', item.id)}
                                  className="px-2 py-0.5 rounded text-[10px] border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-700 dark:text-zinc-300 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedTargetDomainId === item.id ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  <span>{copiedTargetDomainId === item.id ? 'Copied' : 'Copy'}</span>
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Home Doc Override for this specific custom domain */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-[11px] font-medium text-neutral-700 dark:text-zinc-300">
                            Domain Homepage Document:
                          </span>
                          <select
                            value={item.publicHomeDocId || ''}
                            onChange={(e) =>
                              updateHomeDocMutation.mutate({
                                domainId: item.id,
                                docId: e.target.value || null,
                              })
                            }
                            disabled={!isWorkspaceOwner}
                            className="px-2 py-1 rounded border border-neutral-200 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-800"
                          >
                            <option value="">Default (Workspace Homepage)</option>
                            {availablePages.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.icon || '📄'} {p.title || 'Untitled'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {!item.isPrimary && isWorkspaceOwner && (
                          <button
                            type="button"
                            onClick={() => setPrimaryMutation.mutate(item.id)}
                            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Star className="w-3 h-3" />
                            <span>Set as primary domain</span>
                          </button>
                        )}
                      </div>

                      {/* Diagnostic / Error Output */}
                      {item.errorMessage && (
                        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.errorMessage}</span>
                        </div>
                      )}

                      {feedback && (
                        <div
                          className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${feedback.success
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300'
                            }`}
                        >
                          {feedback.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          <span>{feedback.message}</span>
                        </div>
                      )}

                      {/* Verification Buttons */}
                      {isWorkspaceOwner && (
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                          {/* Dev mode simulation button for instant local testing */}
                          <button
                            type="button"
                            onClick={() => verifyDomainMutation.mutate({ domainId: item.id, simulate: true })}
                            disabled={isVerifying}
                            className="px-2.5 py-1 text-[10px] rounded border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-neutral-600 dark:text-zinc-400 transition-colors cursor-pointer"
                            title="Instantly mark domain verified for local development testing"
                          >
                            Simulate Verify (Dev Mode)
                          </button>

                          <button
                            type="button"
                            onClick={() => verifyDomainMutation.mutate({ domainId: item.id })}
                            disabled={isVerifying}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-neutral-950 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Checking DNS...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                Verify DNS Records
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-neutral-200 dark:border-zinc-800 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-zinc-800 flex items-center justify-center">
              <Globe className="w-5 h-5 text-neutral-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                No custom domains connected
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-zinc-400 mt-0.5">
                Connect your brand's domain (e.g. <code>docs.company.com</code>) to host your workspace public knowledge base.
              </div>
            </div>
            {isWorkspaceOwner && (
              <button
                type="button"
                onClick={() => setIsAddDomainModalOpen(true)}
                className="mt-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-neutral-950 shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Domain</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Domain Modal */}
      {isAddDomainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#18181b] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 dark:border-zinc-800 flex flex-col gap-5 relative text-neutral-900 dark:text-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-neutral-700 dark:text-zinc-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Connect Custom Domain
                </h3>
                <p className="text-xs text-neutral-500 dark:text-zinc-400 mt-0.5">
                  Point your own domain to this Notling workspace.
                </p>
              </div>
            </div>

            {addDomainError && (
              <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                {addDomainError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newDomainInput.trim()) {
                  addDomainMutation.mutate();
                }
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  required
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="docs.yourcompany.com"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-zinc-700 text-neutral-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-zinc-400"
                />
                <p className="text-[10px] text-neutral-400 dark:text-zinc-500 mt-1">
                  Enter a subdomain or root domain (without http://). Example: docs.acme.com
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-zinc-300 mb-1">
                  Default Landing Document (Optional)
                </label>
                <select
                  value={newDomainHomeDocId}
                  onChange={(e) => setNewDomainHomeDocId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-zinc-700 text-xs text-neutral-900 dark:text-zinc-100 bg-white dark:bg-zinc-900"
                >
                  <option value="">Default (Workspace Homepage)</option>
                  {availablePages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.icon || '📄'} {p.title || 'Untitled'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-zinc-850 border border-neutral-200/80 dark:border-zinc-800 text-[11px] text-neutral-600 dark:text-zinc-400 leading-relaxed">
                After adding your domain, you'll be shown the exact CNAME DNS records to add at your domain provider.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddDomainModalOpen(false)}
                  disabled={addDomainMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-zinc-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDomainInput.trim() || addDomainMutation.isPending}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-black hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-950 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {addDomainMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Add Domain'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
