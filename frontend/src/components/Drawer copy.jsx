import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function SimpleDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="">
      {/* Button to open drawer */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
      >
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
        View Response
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-80 sm:w-96 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Drawer Title</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-slate-100"
          >
            <XMarkIcon className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-slate-600">
            This is a simple right-side drawer built using Tailwind CSS.
          </p>
          <p className="text-slate-600">
            You can put anything here — forms, text, or details.
          </p>
        </div>
      </div>
    </div>
  );
}
