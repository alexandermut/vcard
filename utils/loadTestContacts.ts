export interface TestContact {
    id: string;
    text: string;
    expected: Record<string, any>;
}

export const getTestContacts = async (): Promise<TestContact[]> => {
    // Use Vite's import.meta.glob to find the files
    const modules = import.meta.glob('../data/realContacts.js');
    const exampleModules = import.meta.glob('../data/realContacts.example.js');

    try {
        // Try to load realContacts.js first
        if (modules['../data/realContacts.js']) {
            const mod = await modules['../data/realContacts.js']() as { difficultContacts: TestContact[] };
            return mod.difficultContacts || [];
        }
    } catch (e) {
        console.warn("Could not load realContacts.js", e);
    }

    // Fallback to example
    try {
        if (exampleModules['../data/realContacts.example.js']) {
            const mod = await exampleModules['../data/realContacts.example.js']() as { difficultContacts: TestContact[] };
            return mod.difficultContacts || [];
        }
    } catch (e) {
        console.warn("Could not load realContacts.example.js", e);
    }

    return [];
};
