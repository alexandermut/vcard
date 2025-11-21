import { useState, useEffect } from 'react';

export type LLMProvider = 'google' | 'custom';

export interface LLMConfig {
    provider: LLMProvider;
    customBaseUrl: string;
    customApiKey: string;
    customModel: string;
}

const DEFAULT_CONFIG: LLMConfig = {
    provider: 'google',
    customBaseUrl: 'http://localhost:11434/v1',
    customApiKey: '',
    customModel: 'llama3',
};

export const useLLMConfig = () => {
    const [config, setConfig] = useState<LLMConfig>(() => {
        const saved = localStorage.getItem('llm_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure provider defaults to 'google' if not set
                return {
                    ...DEFAULT_CONFIG,
                    ...parsed,
                    provider: parsed.provider || 'google',
                };
            } catch (e) {
                return DEFAULT_CONFIG;
            }
        }
        return DEFAULT_CONFIG;
    });

    useEffect(() => {
        localStorage.setItem('llm_config', JSON.stringify(config));
    }, [config]);

    const setProvider = (provider: LLMProvider) => {
        setConfig(prev => ({ ...prev, provider }));
    };

    const setCustomConfig = (custom: Partial<Pick<LLMConfig, 'customBaseUrl' | 'customApiKey' | 'customModel'>>) => {
        setConfig(prev => ({
            ...prev,
            ...custom,
        }));
    };

    const resetToGoogle = () => {
        setConfig(DEFAULT_CONFIG);
    };

    const setOllamaDefaults = () => {
        setConfig(prev => ({
            ...prev,
            provider: 'custom',
            customBaseUrl: 'http://localhost:11434/v1',
            customApiKey: '',
            customModel: 'llama3',
        }));
    };

    return {
        config,
        setProvider,
        setCustomConfig,
        resetToGoogle,
        setOllamaDefaults,
    };
};
