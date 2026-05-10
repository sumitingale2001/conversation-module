import Image from "next/image";

const EmptyState = ({ pageName: _pageName = "Summary" }) => {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <Image
        src="/instant-recording-placeholder.svg"
        alt=""
        width={119}
        height={91}
        unoptimized
        className="mb-6 h-auto w-[119px] max-w-full shrink-0"
      />
      <p className="max-w-md text-sm leading-relaxed text-gray-400">
        Lorem ipsum dolor sit amet consectetur. Vitae
      </p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-gray-400">
        gravida sed duis consectetur pharetra dignissim sem.
      </p>
    </div>
  );
};

export default EmptyState;
