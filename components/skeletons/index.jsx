export const HeaderSkeleton = () => {
    return (
        <div className="border-b border-gray-200 w-full">
            <div className="w-full mx-auto h-[60px] items-center px-4 gap-2 flex justify-between">
                {/* Emoji and Title Skeleton */}
                <div className="flex items-center gap-5">
                    {/* Emoji box skeleton */}
                    <div className="h-[32px] w-[32px] rounded-[8px] bg-gray-200 animate-pulse"></div>
                    
                    <div className="flex flex-col gap-1 justify-center mt-1">
                        {/* Title text skeleton */}
                        <div className="h-[20px] w-[150px] bg-gray-200 rounded animate-pulse"></div>
                        {/* Subtitle text skeleton */}
                        <div className="h-[12px] w-[200px] bg-gray-200 rounded animate-pulse mt-1"></div>
                    </div>
                </div>

                {/* Other Options Skeleton */}
                <div className="flex items-center gap-3">
                    <div className="h-[24px] w-[24px] bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-[24px] w-[24px] bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-[34px] w-[70px] bg-gray-200 rounded-[8px] animate-pulse"></div>
                    <div className="h-[24px] w-[24px] bg-gray-200 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};
