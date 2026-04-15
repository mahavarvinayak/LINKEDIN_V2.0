"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";

export default function Paywall({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);

  const handlePlanClick = () => {
    setToast("Payment coming soon!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center border-b border-gray-100">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            You&apos;ve used your free credits
          </h2>
          <p className="text-gray-500 text-lg">
            Upgrade to keep growing your LinkedIn presence.
          </p>
        </div>

        <div className="p-8 bg-gray-50 flex flex-col md:flex-row gap-6 justify-center">
          {/* Starter Plan */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Starter</h3>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">₹499<span className="text-sm font-normal text-gray-500">/month</span></p>
            <p className="text-sm text-gray-500 mb-6">Perfect for individuals starting out.</p>
            
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Unlimited text posts
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                30 image ideas/month
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Scheduling reminders
              </li>
            </ul>

            <button
              onClick={handlePlanClick}
              className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
            >
              Get Starter
            </button>
          </div>

          {/* Pro Plan */}
          <div className="flex-1 bg-white rounded-2xl border-2 border-blue-600 p-6 shadow-md relative flex flex-col">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3">
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-blue-600 mb-1">Pro</h3>
            <p className="text-3xl font-extrabold text-gray-900 mb-1">₹999<span className="text-sm font-normal text-gray-500">/month</span></p>
            <p className="text-sm text-gray-500 mb-6">For serious creators and founders.</p>
            
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Everything in Starter
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                100 image ideas/month
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Weekly analytics report
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                Priority generation
              </li>
            </ul>

            <button
              onClick={handlePlanClick}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
            >
              Get Pro
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-green-400" />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
