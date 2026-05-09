import { Plus } from "lucide-react";
import PresetDropdown from "./preset/PresetDropdown";

const PageTabBar = ({
  pages,
  activePageId,
  onTabClick,
  onCreateCustomPage,
  onCreateFromPreset,
  onOpenManagePresets,
}) => {
  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {pages.map((page) => {
              const isActive = page._id === activePageId;
              return (
                <button
                  key={page._id}
                  type="button"
                  onClick={() => onTabClick(page._id)}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-50 font-medium text-indigo-700"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  }`}
                >
                  {page.name}
                </button>
              );
            })}
          </div>
        </div>

        <PresetDropdown
          onCreateCustomPage={onCreateCustomPage}
          onCreateFromPreset={onCreateFromPreset}
          onOpenManagePresets={onOpenManagePresets}
        >
          <button
            type="button"
            className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="Create page"
          >
            <Plus className="h-4 w-4" />
          </button>
        </PresetDropdown>
      </div>
    </div>
  );
};

export default PageTabBar;
