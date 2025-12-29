import React, { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from 'react-markdown';

export default function SimpleDrawer({ streamingText, title, content, streaming }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div>
            <button
                onClick={() => setIsOpen(true)}
                className="flex-1 flex items-center justify-center mx-auto mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
                {streaming && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                )}
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
                className={`fixed top-0 right-0 w-80 sm:w-156 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">AI Analysis Result</h2>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100"
                    >
                        <XMarkIcon className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="mb-8 max-w-4xl mx-auto">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                                    {streaming && (
                                        <div className="flex items-center gap-2 text-indigo-600 text-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
                                            <span>Streaming...</span>
                                            <span className="text-xs text-slate-500">({streamingText.length} chars)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-6 max-h-130 overflow-y-auto custom-scrollbar">
                                <div className="prose prose-slate max-w-none">
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                    {streaming && (
                                        <span className="inline-block w-1 h-4 bg-indigo-500 animate-pulse ml-1" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}