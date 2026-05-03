/**
 * Full main-area placeholder for /conversation/[id]/[slug] while conversation data loads.
 * Mirrors ConversationContent + RecordingExperience layout (toolbar, transcript, recording card).
 */
export const ConversationRouteSkeleton = ({ viewMode = "split" }) => {
    const showLeft = viewMode === "split" || viewMode === "left";
    const showRight = viewMode === "split" || viewMode === "right";

    return (
        <div className="w-full h-full flex overflow-hidden">
            {showLeft && (
                <div
                    className={`flex flex-col h-full transition-all duration-300 ${viewMode === "split" ? "w-1/2 border-r border-gray-200" : "w-full"}`}
                >
                    <div className="flex items-center justify-between px-5 py-2 shrink-0">
                        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                            <div className="h-4 w-4 rounded bg-gray-200 animate-pulse" />
                        </div>
                    </div>

                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex flex-col h-full w-full bg-gray-50/30">
                            <main
                                className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
                                style={{ minHeight: "300px" }}
                            >
                                {[0, 1, 2].map((i) => (
                                    <div
                                        key={i}
                                        className="rounded-lg border border-gray-100 bg-card p-4 shadow-sm"
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5 h-4 w-4 shrink-0 rounded bg-gray-200 animate-pulse" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-4 w-36 max-w-[90%] rounded bg-gray-200 animate-pulse" />
                                                <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
                                                <div className="h-3 w-[85%] rounded bg-gray-100 animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </main>

                            <div className="shrink-0 px-6 pb-6">
                                <div className="mx-auto w-full max-w-3xl space-y-4 rounded-xl bg-white p-5 shadow-md ring-1 ring-gray-200">
                                    <div className="flex justify-center">
                                        <div className="h-7 w-28 rounded bg-gray-200 animate-pulse" />
                                    </div>
                                    <div className="h-24 w-full rounded-lg bg-gray-100 animate-pulse" />
                                    <div className="flex items-center justify-between pt-1">
                                        <div className="h-8 w-14 rounded-md bg-gray-200 animate-pulse" />
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
                                            <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
                                            <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
                                        </div>
                                        <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRight && (
                <div
                    className={`flex flex-col h-full overflow-y-auto bg-gray-50 transition-all duration-300 ${viewMode === "split" ? "w-1/2" : "w-full"}`}
                >
                    <div className="m-6 flex max-h-[min(420px,45vh)] min-h-[200px] w-full max-w-4xl flex-col items-center justify-center gap-4 self-center rounded-xl border-2 border-dashed border-gray-200 bg-white p-8">
                        <div className="h-36 w-full max-w-lg rounded-lg bg-gray-100 animate-pulse" />
                        <div className="h-4 w-52 rounded bg-gray-200 animate-pulse" />
                        <div className="h-3 w-36 rounded bg-gray-100 animate-pulse" />
                    </div>
                </div>
            )}
        </div>
    );
};

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
