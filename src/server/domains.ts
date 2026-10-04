import { createServerFn } from '@tanstack/react-start';

export const resolveWorkspaceHost = createServerFn({ method: 'GET' })
  .validator((input?: { host?: string }) => input)
  .handler(async ({ data }) => {
    const { resolveWorkspaceByHost } = await import('./domains.db');
    return resolveWorkspaceByHost(data?.host);
  });

export const checkWorkspaceSubdomain = createServerFn({ method: 'POST' })
  .validator((input: { subdomain: string; excludeWorkspaceId?: string }) => input)
  .handler(async ({ data }) => {
    const { checkWorkspaceSubdomainImpl } = await import('./domains.db');
    return checkWorkspaceSubdomainImpl(data);
  });

export const updateWorkspaceSubdomain = createServerFn({ method: 'POST' })
  .validator((input: { workspaceId: string; subdomain?: string; publicHomeDocId?: string | null }) => input)
  .handler(async ({ data }) => {
    const { updateWorkspaceSubdomainImpl } = await import('./domains.db');
    return updateWorkspaceSubdomainImpl(data);
  });

export const getWorkspaceCustomDomains = createServerFn({ method: 'GET' })
  .validator((workspaceId: string) => workspaceId)
  .handler(async ({ data }) => {
    const { getWorkspaceCustomDomainsImpl } = await import('./domains.db');
    return getWorkspaceCustomDomainsImpl(data);
  });

export const addWorkspaceCustomDomain = createServerFn({ method: 'POST' })
  .validator((input: { workspaceId: string; domain: string; publicHomeDocId?: string | null }) => input)
  .handler(async ({ data }) => {
    const { addWorkspaceCustomDomainImpl } = await import('./domains.db');
    return addWorkspaceCustomDomainImpl(data);
  });

export const removeWorkspaceCustomDomain = createServerFn({ method: 'POST' })
  .validator((input: { domainId: string }) => input)
  .handler(async ({ data }) => {
    const { removeWorkspaceCustomDomainImpl } = await import('./domains.db');
    return removeWorkspaceCustomDomainImpl(data);
  });

export const setPrimaryCustomDomain = createServerFn({ method: 'POST' })
  .validator((input: { domainId: string }) => input)
  .handler(async ({ data }) => {
    const { setPrimaryCustomDomainImpl } = await import('./domains.db');
    return setPrimaryCustomDomainImpl(data);
  });

export const updateCustomDomainHomeDoc = createServerFn({ method: 'POST' })
  .validator((input: { domainId: string; publicHomeDocId?: string | null }) => input)
  .handler(async ({ data }) => {
    const { updateCustomDomainHomeDocImpl } = await import('./domains.db');
    return updateCustomDomainHomeDocImpl(data);
  });

export const verifyCustomDomain = createServerFn({ method: 'POST' })
  .validator((input: { domainId: string; simulate?: boolean }) => input)
  .handler(async ({ data }) => {
    const { verifyCustomDomainImpl } = await import('./domains.db');
    return verifyCustomDomainImpl(data);
  });
