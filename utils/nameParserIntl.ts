import { Namefully, Title } from 'namefully';

export interface ParsedName {
    prefix?: string;
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
}

export const parseComplexName = (text: string): ParsedName | null => {
    try {
        // Configure to handle common suffixes and order
        const name = new Namefully(text, {
            title: Title.US // Handle US titles/suffixes better
        });

        return {
            prefix: name.prefix,
            first: name.first,
            middle: name.middle,
            last: name.last,
            suffix: name.suffix
        };
    } catch (e) {
        // Namefully throws if it can't parse
        // console.warn("namefully parse failed", e);
        return null;
    }
};
