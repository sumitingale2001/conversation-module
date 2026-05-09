const StaleRefreshBanner = () => {
  return (
    <div className="mx-4 mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-xs font-medium text-amber-800">Transcript has changed.</p>
      <button
        type="button"
        disabled
        title="Refresh coming soon"
        className="rounded bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        Refresh
      </button>
    </div>
  );
};

export default StaleRefreshBanner;
