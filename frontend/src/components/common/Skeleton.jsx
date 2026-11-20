import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
        <div className="w-16 h-5 bg-slate-200 rounded-full"></div>
      </div>
      <div className="w-3/4 h-4 bg-slate-200 rounded-md"></div>
      <div className="w-1/2 h-3 bg-slate-100 rounded-md"></div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      <td className="p-4"><div className="w-32 h-4 bg-slate-200 rounded"></div></td>
      <td className="p-4"><div className="w-16 h-4 bg-slate-100 rounded"></div></td>
      <td className="p-4"><div className="w-20 h-4 bg-slate-100 rounded"></div></td>
      <td className="p-4"><div className="w-14 h-5 bg-slate-200 rounded-full"></div></td>
      <td className="p-4 text-right"><div className="w-8 h-8 bg-slate-100 rounded-lg inline-block"></div></td>
    </tr>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex space-x-3 animate-pulse max-w-xl">
      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
      <div className="space-y-2 flex-1">
        <div className="w-24 h-4 bg-slate-200 rounded-md"></div>
        <div className="w-full h-16 bg-slate-100 rounded-2xl p-4"></div>
      </div>
    </div>
  );
}
