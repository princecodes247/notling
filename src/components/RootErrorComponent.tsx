interface RootErrorComponentProps {
  error?: any;
  reset?: () => void;
}

export function RootErrorComponent({ error, reset }: RootErrorComponentProps) {
  const isProd = import.meta.env.PROD || process.env.NODE_ENV === 'production';

  return (
    <div className="h-screen w-screen bg-[#eef2f6] dark:bg-zinc-900 flex flex-col items-center justify-center text-neutral-600 dark:text-zinc-400 gap-3 p-4 select-none">
      <div className="flex flex-col items-center text-center max-w-md w-full gap-2">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
          Something went wrong
        </h2>

        {/* In development, show error details to assist debugging */}
        {!isProd && error?.message && (
          <div className="w-full text-left mt-2">
            <p className="text-xs font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-900/50 break-words whitespace-pre-wrap max-h-48 overflow-auto">
              {String(error.message || error)}
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          {reset && (
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
            >
              Try again
            </button>
          )}
          <a
            href="/"
            className="text-xs text-neutral-900 dark:text-white underline hover:opacity-80 transition-opacity"
          >
            Return to Workspace
          </a>
        </div>
      </div>
    </div>
  );
}

export default RootErrorComponent;
