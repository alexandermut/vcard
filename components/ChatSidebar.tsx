import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Trash2, MessageSquare, Database } from 'lucide-react';
import { HistoryItem } from '../types';
import { useChat } from '../hooks/useChat';
import { LLMConfig } from '../hooks/useLLMConfig';
import { translations } from '../utils/translations';

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    history: HistoryItem[];
    apiKey: string;
    llmConfig: LLMConfig;
    lang: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose, history, apiKey, llmConfig, lang }) => {
    const { messages, sendMessage, isLoading, clearChat } = useChat(history, apiKey, llmConfig);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const t = translations[lang as keyof typeof translations];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                        <Bot size={20} className="text-blue-600 dark:text-blue-400" />
                        <h3>Chat with Data</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={clearChat} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500" title="Clear Chat">
                            <Trash2 size={18} />
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center p-8">
                            <Database size={48} className="mb-4 opacity-20" />
                            <p className="font-medium">Ask questions about your data!</p>
                            <p className="text-xs mt-2">"Who works at Google?"</p>
                            <p className="text-xs">"What notes do I have about meetings?"</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[90%] rounded-2xl p-3 text-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                                }`}>
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..."
                            className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white placeholder-slate-400"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-xl transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
