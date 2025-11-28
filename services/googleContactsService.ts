
export interface GoogleContact {
    resourceName: string;
    etag: string;
    names?: { familyName?: string; givenName?: string; displayName?: string }[];
    photos?: { url: string; default?: boolean }[];
    emailAddresses?: { value: string; type?: string }[];
    phoneNumbers?: { value: string; type?: string }[];
    organizations?: { name?: string; title?: string }[];
    addresses?: {
        streetAddress?: string;
        postalCode?: string;
        city?: string;
        country?: string;
        type?: string;
        formattedValue?: string;
    }[];
    urls?: { value: string; type?: string }[];
    biographies?: { value: string; contentType?: string }[]; // Notes often here or in 'clientData' but 'biographies' is common for 'About'
}

export interface GoogleConnectionsResponse {
    connections: GoogleContact[];
    nextPageToken?: string;
    totalPeople?: number;
}

export const fetchGoogleContacts = async (accessToken: string, pageToken?: string, signal?: AbortSignal): Promise<GoogleConnectionsResponse> => {
    const fields = 'names,photos,emailAddresses,phoneNumbers,organizations,addresses,urls,biographies';
    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.append('personFields', fields);
    url.searchParams.append('pageSize', '1000');
    url.searchParams.append('sortOrder', 'FIRST_NAME_ASCENDING');
    if (pageToken) {
        url.searchParams.append('pageToken', pageToken);
    }

    console.log(`Fetching contacts from: ${url.toString()}`);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            signal // Pass the signal to fetch
        });

        if (!response.ok) {
            let errorMsg = `Google API Error: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                console.error('Google API Error Body:', errorBody);
                if (errorBody.error && errorBody.error.message) {
                    errorMsg += ` - ${errorBody.error.message}`;
                }
            } catch (e) {
                console.error('Could not parse error body', e);
            }
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        console.error("Fetch error in googleContactsService:", error);
        throw error;
    }
};

export const searchGoogleContacts = async (accessToken: string, query: string): Promise<GoogleContact[]> => {
    if (!query || query.length < 3) return [];

    const fields = 'names,photos,emailAddresses,phoneNumbers,organizations,addresses,urls,biographies';
    const url = new URL('https://people.googleapis.com/v1/people:searchContacts');
    url.searchParams.append('query', query);
    url.searchParams.append('readMask', fields);
    url.searchParams.append('pageSize', '30');

    console.log(`Searching Google Contacts: ${query}`);

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`Search failed: ${response.status}`);
            return [];
        }

        const data = await response.json();
        // The search endpoint returns { results: [ { person: ... } ] }
        return data.results ? data.results.map((r: any) => r.person) : [];
    } catch (error) {
        console.error("Search error in googleContactsService:", error);
        return [];
    }
};

export const createGoogleContact = async (accessToken: string, contact: Partial<GoogleContact>): Promise<GoogleContact> => {
    const url = 'https://people.googleapis.com/v1/people:createContact';

    console.log('Creating contact in Google:', contact);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(contact)
        });

        if (!response.ok) {
            let errorMsg = `Google API Error: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                console.error('Google API Error Body:', errorBody);
                if (errorBody.error && errorBody.error.message) {
                    errorMsg += ` - ${errorBody.error.message}`;
                }
            } catch (e) {
                console.error('Could not parse error body', e);
            }
            throw new Error(errorMsg);
        }

        return await response.json();
    } catch (error) {
        console.error("Create error in googleContactsService:", error);
        throw error;
    }
};
