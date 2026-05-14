import { Plus } from "lucide-react";
import PresetDropdown from "./preset/PresetDropdown";

const PageTabBar = ({
  pages,
  activePageId,
  onTabClick,
  onCreateCustomPage,
  onCreatePreset,
  onCreateSummaryPage,
  onCreateFromPreset,
  onOpenManagePresets,
}) => {
  return (
    <div className="sticky top-0 z-10 flex min-w-0 items-center gap-2 bg-white px-4 py-2 text-[12px] leading-[16px]">
      <div className="min-w-0 max-w-full overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-2">
          {pages.map((page) => {
            const pid = String(page._id ?? page.id ?? "");
            const active = String(activePageId ?? "");
            const isActive = pid !== "" && pid === active;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => onTabClick(pid)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-[12px] leading-[16px] transition-colors ${
                  isActive
                    ? "bg-[#EFEEFC] font-medium text-[#1C1C92]"
                    : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-600"
                }`}
              >
                {page.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0">
        <PresetDropdown
          onCreateCustomPage={onCreateCustomPage}
          onCreatePreset={onCreatePreset}
          onCreateSummaryPage={onCreateSummaryPage}
          onCreateFromPreset={onCreateFromPreset}
          onOpenManagePresets={onOpenManagePresets}
        >
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFEEFC] text-[12px] leading-[16px] text-[#1C1C92] transition-colors hover:opacity-90"
            aria-label="Create page"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
        </PresetDropdown>
      </div>
    </div>
  );
};

export default PageTabBar;
