import init, { parse_vcard, load_street_index } from '../src/wasm/core';
import { getCachedFST, cacheFST } from './fstCache';

let isInitialized = false;
let fstLoaded = false;

export async function initRustParser() {
    if (!isInitialized) {
        await init();
        isInitialized = true;
        console.log("🦀 Rust Parser Initialized");

        // Load FST in background (don't block)
        loadStreetFST().catch(err => {
            console.warn("⚠️  FST loading failed, will use fallback:", err);
        });
    }
}

async function loadStreetFST() {
    if (fstLoaded) return;

    console.log("📥 Loading Street FST...");

    // 1. Check IndexedDB cache
    const cached = await getCachedFST();
    if (cached) {
        console.log("✅ FST found in cache");
        await initFST(cached);
        return;
    }

    // 2. Fetch from server
    console.log("🌐 Fetching FST from server...");
    const response = await fetch('/streets.fst');
    if (!response.ok) {
        throw new Error(`FST fetch failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log(`📦 FST downloaded: ${(bytes.length / 1024 / 1024).toFixed(2)} MB`);

    // 3. Initialize Rust
    await initFST(bytes);

    // 4. Cache for next time (async, don't block)
    cacheFST(bytes).catch(err => {
        console.warn("Failed to cache FST:", err);
    });
}

async function initFST(bytes: Uint8Array) {
    // Guard against duplicate initialization
    if (fstLoaded) {
        console.warn("⚠️  FST already loaded, skipping re-initialization");
        return;
    }

    try {
        load_street_index(bytes);
        fstLoaded = true;
        console.log("✅ Street FST loaded! Token-based matching enabled. 🎯");
    } catch (err) {
        console.error("❌ FST initialization failed:", err);
        throw err;
    }
}

// Interfaces matching Rust structs
export interface Scored<T> {
    value: T;
    score: number;
    label?: string; // Option<String> -> string | undefined
    debug_info: string;
}

export interface RustAddress {
    street?: string;
    city?: string;
    zip?: string;
    country?: string;
    region?: string;
    raw: string;
}

export interface RustVCardResult {
    fn_name?: Scored<string>;
    adr: Scored<RustAddress>[];
    tel: Scored<string>[];
    email: Scored<string>[];
    title: Scored<string>[];
    org: Scored<string>[];
    urls: Scored<string>[];
}

export async function parseWithRust(text: string): Promise<RustVCardResult> {
    console.log("🦀 parseWithRust called with text length:", text.length);
    await initRustParser();
    try {
        // WASM parse_vcard returns a JS Object matching the struct
        // We cast it to our interface
        const result = parse_vcard(text) as RustVCardResult;
        console.log("🦀 Rust Parser Result:", result);
        console.log("🦀 Address found:", result.adr);
        return result;
    } catch (e) {
        console.error("❌ Rust Parsing Failed:", e);
        throw e;
    }
}

export function rustToVCardString(data: RustVCardResult): string {
    const lines: string[] = [];
    lines.push("BEGIN:VCARD");
    lines.push("VERSION:3.0");

    // NAME (N and FN)
    // Rust logic tries to extract "First Last". 
    // We should split it for N property if possible, but fn_name is usually full.
    // Simple heuristic: Last word is family name.
    const fn = data.fn_name?.value || "";
    if (fn) {
        lines.push(`FN:${fn}`);
        const parts = fn.trim().split(/\s+/);
        if (parts.length > 1) {
            const last = parts.pop();
            const first = parts.join(" ");
            lines.push(`N:${last};${first};;;`);
        } else {
            lines.push(`N:${fn};;;;;`);
        }
    } else {
        lines.push("N:;;;;");
    }

    // TITLE
    for (const item of data.title || []) {
        if (item.value) lines.push(`TITLE:${item.value}`);
    }

    // ORG
    for (const item of data.org || []) {
        if (item.value) lines.push(`ORG:${item.value}`);
    }

    // TEL
    for (const item of data.tel || []) {
        // Map Rust Label (WORK, CELL, FAX, HOME) to VCard TYPE
        // Rust uses: "WORK", "CELL", "FAX", "HOME"
        // VCard uses: "WORK", "CELL", "FAX", "HOME", "VOICE"
        // We can just use the label if present.
        let type = "VOICE";
        if (item.label) {
            type = item.label;
        }
        lines.push(`TEL;TYPE=${type}:${item.value}`);
    }

    // EMAIL
    for (const item of data.email || []) {
        lines.push(`EMAIL;TYPE=INTERNET:${item.value}`);
    }

    // URL
    for (const item of data.urls || []) {
        lines.push(`URL:${item.value}`);
    }

    // ADR
    for (const item of data.adr || []) {
        const a = item.value;
        // ADR: P.O. Box; Extended; Street; City; Region; Zip; Country
        const street = a.street || "";
        const city = a.city || "";
        const zip = a.zip || "";
        const region = a.region || "";
        const country = a.country || "";

        // Combine raw if individual fields missing? 
        // Rust parser tries to fill fields.
        lines.push(`ADR;TYPE=WORK:;;${street};${city};${region};${zip};${country}`);
    }

    // NOTE (Debug Info?)
    // Could add debug info as NOTE
    // lines.push(`NOTE: Parsed by Rust Core`);

    lines.push("END:VCARD");
    return lines.join("\n");
}
