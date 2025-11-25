import { useState } from 'react';
import { HistoryItem } from '../types';
import { generateContent } from '../services/aiService';
import { LLMConfig } from '../hooks/useLLMConfig';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const useChat = (history: HistoryItem[], apiKey: string, llmConfig: LLMConfig) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const sendMessage = async (content: string) => {
        const newMessages = [...messages, { role: 'user', content } as Message];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Simplify history to save tokens
            const simplifiedHistory = history.map(item => ({
                name: item.name,
                org: item.org,
                vcard: item.vcard
            }));

            const systemPrompt = `
        You are a helpful assistant for a vCard contact database.
        You have access to the following contacts:
        ${JSON.stringify(simplifiedHistory)}

        Answer the user's question based ONLY on this data.
        If you find matching contacts, provide their details clearly.
        If the answer is not in the data, say so.
        Keep answers concise.
      `;

            const response = await generateContent(
                apiKey,
                systemPrompt + "\n\nUser Question: " + content,
                undefined, // image
                llmConfig
            );

            setMessages([...newMessages, { role: 'assistant', content: response }]);
        } catch (error: any) {
            console.error("Chat Error:", error);
            const errorMessage = error.message || "Unknown error";
            setMessages([...newMessages, { role: 'assistant', content: `Error: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([]);
    };

    return {
        messages,
        sendMessage,
        isLoading,
        clearChat
    };
};
