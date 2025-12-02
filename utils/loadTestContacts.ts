export interface TestContact {
    id: string;
    text: string;
    expected: Record<string, any>;
}

export const getTestContacts = async (): Promise<TestContact[]> => {
    // Use Vite's import.meta.glob to find the files
    const syntheticModules = import.meta.glob('../data/syntheticEdgeCases.js');
    const realModules = import.meta.glob('../data/realContacts.js');
    const exampleModules = import.meta.glob('../data/realContacts.example.js');

    let syntheticContacts: TestContact[] = [];
    let realContacts: TestContact[] = [];

    // 1. Load Synthetic Edge Cases (Always)
    try {
        if (syntheticModules['../data/syntheticEdgeCases.js']) {
            const mod = await syntheticModules['../data/syntheticEdgeCases.js']() as { syntheticEdgeCases: TestContact[] };
            syntheticContacts = mod.syntheticEdgeCases || [];
        }
    } catch (e) {
        console.warn("Could not load syntheticEdgeCases.js", e);
    }

    // 2. Load Real Contacts (Local override) or Fallback to Example
    try {
        if (realModules['../data/realContacts.js']) {
            const mod = await realModules['../data/realContacts.js']() as { difficultContacts: TestContact[] };
            realContacts = mod.difficultContacts || [];
        } else if (exampleModules['../data/realContacts.example.js']) {
            // Fallback to example if real is missing (optional, but good for dev)
            const mod = await exampleModules['../data/realContacts.example.js']() as { difficultContacts: TestContact[] };
            realContacts = mod.difficultContacts || [];
        }
    } catch (e) {
        console.warn("Could not load realContacts.js or example", e);
    }

    // Merge: Synthetic first, then Real
    return [...syntheticContacts, ...realContacts];
};
