import React from 'react';

export function ProductSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-[#FAF7F2] border border-[#30251F]/10 rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[4/3] bg-[#F0E8DD]" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-2/3 bg-[#F0E8DD] rounded" />
            <div className="h-6 w-4/5 bg-[#F0E8DD] rounded" />
            <div className="pt-3 border-t border-[#30251F]/8 flex items-center justify-between">
              <div className="h-5 w-16 bg-[#F0E8DD] rounded" />
              <div className="h-8 w-24 bg-[#F0E8DD] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
