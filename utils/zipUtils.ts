import JSZip from 'jszip';
import { HistoryItem } from '../types';
import { generateCSV } from './csvUtils';
import { generateJSON, restoreJSON } from './jsonUtils';
import { getTimestamp, parseVCardString, generateContactFilename } from './vcardUtils';
import { base64ToBlob } from './imageUtils';

export const generateBackupZip = async (history: HistoryItem[]): Promise<Blob> => {
    const zip = new JSZip();
    const timestamp = getTimestamp();

    // 1. Generate JSON Backup (Lightweight - No Base64 Images)
    const jsonContent = await generateJSON(history, true); // excludeImages = true
    zip.file(`kontakte_backup_${timestamp}.json`, jsonContent);

    // 2. Generate CSV Export (Excel/Outlook)
    const csvContent = generateCSV(history);
    zip.file(`kontakte_export_${timestamp}.csv`, csvContent);

    // 3. Generate vCard Export (Mobile/Contacts App)
    const vcardContent = history.map(item => item.vcard).join('\n');
    zip.file(`kontakte_all_${timestamp}.vcf`, vcardContent);

    // 4. Export Images (ID-based naming)
    const imgFolder = zip.folder("images");
    if (imgFolder) {
        history.forEach(item => {
            if (item.images && item.images.length > 0) {
                item.images.forEach((img, index) => {
                    try {
                        let blob: Blob | null = null;
                        if (typeof img === 'string' && img.startsWith('data:')) {
                            blob = base64ToBlob(img);
                        } else if (img instanceof Blob) {
                            blob = img;
                        }

                        if (blob) {
                            const suffix = index === 0 ? 'front' : index === 1 ? 'back' : `img${index + 1}`;
                            // Assume JPEG for now as most scans are
                            const ext = blob.type === 'image/png' ? 'png' : 'jpg';
                            // Use ID for robust matching
                            imgFolder.file(`${item.id}_${suffix}.${ext}`, blob);
                        }
                    } catch (e) {
                        console.warn(`Failed to export image for ${item.name}`, e);
                    }
                });
            }
        });
    }

    // Generate ZIP Blob
    return await zip.generateAsync({ type: 'blob' });
};

export const restoreBackupZip = async (file: File): Promise<number> => {
    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);

        // Prioritize JSON backup for full restoration
        const files = loadedZip.files || {};
        const jsonFile = Object.values(files).find(f => f.name.endsWith('.json') && !f.dir);

        if (jsonFile) {
            const content = await jsonFile.async('string');
            const data = JSON.parse(content);

            // We need to manually handle the restore here to link images
            // We can't use restoreJSON directly because it expects Base64 in the JSON
            // So we iterate and reconstruct the HistoryItems

            if (!data.contacts || !Array.isArray(data.contacts)) {
                // Try legacy restore if format is old
                return await restoreJSON(content);
            }

            const { addHistoryItem } = await import('./db'); // Dynamic import to avoid circular deps if any
            let count = 0;

            for (const contact of data.contacts) {
                if (!contact.rawVCard || !contact.timestamp) continue;

                let images: Blob[] = [];

                // 1. Try to load images from Base64 (Legacy Backup)
                if (contact.images && contact.images.length > 0) {
                    // Convert base64 strings to Blobs
                    images = contact.images.map((b64: string) => base64ToBlob(b64));
                }

                // 2. Try to load images from ZIP folder (New ID-based Backup)
                if (contact.imageRefs && Array.isArray(contact.imageRefs)) {
                    const zipImages = await Promise.all(contact.imageRefs.map(async (ref: string) => {
                        try {
                            // Try exact match first
                            let imgFile = loadedZip.file(`images/${ref}`);

                            // If not found, try to find by ID prefix (robustness)
                            if (!imgFile) {
                                const id = contact.id;
                                // Look for files starting with ID in images/
                                // We try to match the suffix if possible to avoid swapping front/back
                                const suffix = ref.split('_').pop(); // e.g. "front.jpg" or "front"
                                const match = Object.values(files).find(f => {
                                    return f.name.includes(`images/${id}_`) && (suffix ? f.name.includes(suffix) : true);
                                });
                                if (match) imgFile = match;
                            }

                            if (imgFile) {
                                return await imgFile.async('blob');
                            }
                        } catch (e) {
                            console.warn(`Failed to load image ${ref} from ZIP`, e);
                        }
                        return null;
                    }));

                    const foundImages = zipImages.filter(i => i !== null) as Blob[];
                    if (foundImages.length > 0) {
                        images = foundImages;
                    }
                }

                const item: HistoryItem = {
                    id: contact.id || crypto.randomUUID(),
                    timestamp: contact.timestamp,
                    name: contact.name || 'Unknown',
                    org: contact.organization,
                    vcard: contact.rawVCard,
                    images: images,
                    keywords: []
                };

                await addHistoryItem(item);
                count++;
            }
            return count;
        }

        // Fallback: Check for vCard file
        const vcardFile = Object.values(files).find(f => f.name.endsWith('.vcf') && !f.dir);
        if (vcardFile) {
            throw new Error("ZIP enthält nur vCards. Bitte nutze den vCard-Import.");
        }

        // Fallback: Check for CSV file
        const csvFile = Object.values(files).find(f => f.name.endsWith('.csv') && !f.dir);
        if (csvFile) {
            throw new Error("ZIP enthält nur CSV. Bitte nutze den CSV-Import.");
        }

        throw new Error("Keine gültige Backup-Datei im ZIP gefunden.");

    } catch (e) {
        console.error("ZIP Restore failed", e);
        throw e;
    }
};

export const downloadZip = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
