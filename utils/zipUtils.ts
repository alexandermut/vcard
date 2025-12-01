import JSZip from 'jszip';
import { HistoryItem } from '../types';
import { generateCSV } from './csvUtils';
import { generateJSON, restoreJSON } from './jsonUtils';
import { getTimestamp, parseVCardString, generateContactFilename } from './vcardUtils';
import { base64ToBlob } from './imageUtils';

export const generateBackupZip = async (history: HistoryItem[]): Promise<Blob> => {
    const zip = new JSZip();
    const timestamp = getTimestamp();

    // 1. Generate JSON Backup (Complete Data)
    const jsonContent = await generateJSON(history);
    zip.file(`kontakte_backup_${timestamp}.json`, jsonContent);

    // 2. Generate CSV Export (Excel/Outlook)
    const csvContent = generateCSV(history);
    zip.file(`kontakte_export_${timestamp}.csv`, csvContent);

    // 3. Generate vCard Export (Mobile/Contacts App)
    const vcardContent = history.map(item => item.vcard).join('\n');
    zip.file(`kontakte_all_${timestamp}.vcf`, vcardContent);

    // 4. Export Images
    const imgFolder = zip.folder("images");
    if (imgFolder) {
        history.forEach(item => {
            if (item.images && item.images.length > 0) {
                // Parse vCard to get a nice filename
                const parsed = parseVCardString(item.vcard);
                const baseName = generateContactFilename(parsed.data);

                item.images.forEach((img, index) => {
                    try {
                        let blob: Blob | null = null;
                        if (typeof img === 'string' && img.startsWith('data:')) {
                            blob = base64ToBlob(img);
                        } else if (img instanceof Blob) {
                            blob = img;
                        }

                        if (blob) {
                            const suffix = index === 0 ? 'Front' : index === 1 ? 'Back' : `Img${index + 1}`;
                            // Assume JPEG for now as most scans are
                            const ext = blob.type === 'image/png' ? 'png' : 'jpg';
                            imgFolder.file(`${baseName}_${suffix}.${ext}`, blob);
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
        const jsonFile = Object.values(loadedZip.files).find(f => f.name.endsWith('.json') && !f.dir);

        if (jsonFile) {
            const content = await jsonFile.async('string');
            return await restoreJSON(content);
        }

        // Fallback: Check for vCard file
        const vcardFile = Object.values(loadedZip.files).find(f => f.name.endsWith('.vcf') && !f.dir);
        if (vcardFile) {
            throw new Error("ZIP enthält nur vCards. Bitte nutze den vCard-Import.");
        }

        // Fallback: Check for CSV file
        const csvFile = Object.values(loadedZip.files).find(f => f.name.endsWith('.csv') && !f.dir);
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
