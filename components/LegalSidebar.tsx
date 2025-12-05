import React, { useState, useEffect } from 'react';
import { X, Shield, Scale } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface LegalSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'imprint' | 'privacy' | 'licenses';
}

export const LegalSidebar: React.FC<LegalSidebarProps> = ({ isOpen, onClose, initialTab = 'imprint' }) => {
    useEscapeKey(onClose, isOpen);
    const [activeTab, setActiveTab] = useState<'imprint' | 'privacy' | 'licenses'>(initialTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, initialTab]);

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('imprint')}
                            className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === 'imprint'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Scale size={14} />
                            Impressum
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === 'privacy'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Shield size={14} />
                            Datenschutz
                        </button>
                        <button
                            onClick={() => setActiveTab('licenses')}
                            className={`text-xs font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors ${activeTab === 'licenses'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="rotate-45"><Scale size={14} /></div>
                            Lizenzen
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-300 leading-relaxed custom-scrollbar flex-1">

                    {activeTab === 'imprint' && (
                        <div className="space-y-6">
                            <h1 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Impressum</h1>
                            {/* ... Imprint Content ... */}
                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Angaben gemäß § 5 DDG</h2>
                                <p className="text-sm">
                                    Alexander Mut<br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg<br />
                                    Deutschland
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Kontakt</h2>
                                <p className="text-sm">
                                    Telefon: +49 151 51 00 27 67<br />
                                    E-Mail: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">mutalex (at) gmail (punkt) com</span>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Verantwortlich nach § 18 Abs. 2 MStV</h2>
                                <p className="text-sm">
                                    Alexander Mut<br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">Haftungsausschluss</h2>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2 text-sm">Haftung für Inhalte</h3>
                                <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
                                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                                </p>
                                <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
                                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2 text-sm">Haftung für Links</h3>
                                <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
                                    Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
                                </p>
                                <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
                                    Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2 text-sm">Urheberrecht</h3>
                                <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
                                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            {/* ... Privacy Content (Keep exactly as is) ... */}
                            <h1 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Datenschutzerklärung</h1>

                            <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs inline-block">
                                <strong>Stand:</strong> November 2025
                            </div>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">1. Verantwortlicher</h2>
                                <p className="text-sm">Verantwortlicher für die Datenverarbeitung im Sinne der DSGVO ist:</p>
                                <p className="mt-2 text-sm">
                                    <strong>Alexander Mut</strong><br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg<br />
                                    Deutschland<br />
                                    Tel: +49 151 51 00 27 67<br />
                                    E-Mail: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">mutalex (at) gmail (punkt) com</span>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">2. "Local-First"-Architektur</h2>
                                <p className="mb-2 text-sm">Diese Anwendung ("Kontakte.me") verfolgt einen "Local-First"-Ansatz. Das bedeutet:</p>
                                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>Lokale Speicherung:</strong> Ihre Inhaltsdaten (Texte, Visitenkarten-Scans, Historie, API-Keys) werden primär und dauerhaft lokal im Browser Ihres Endgeräts (Local Storage / IndexedDB) gespeichert.</li>
                                    <li><strong>Lokale Verarbeitung:</strong> Funktionen wie der QR-Code-Scanner laufen vollständig in Ihrem Browser (via `jsqr`). Es werden keine Videostreams an Server gesendet.</li>
                                    <li><strong>Kein Backend-Zugriff auf Inhalte:</strong> Wir als Webseitenbetreiber haben technisch keinen Zugriff auf Ihre lokal gespeicherten Inhalte.</li>
                                    <li>
                                        <strong>⚠️ Ausnahmen (Datenübertragung):</strong> Daten verlassen Ihr Gerät bzw. Ihren Browser nur in zwei konkreten Fällen, die durch Ihre aktive Handlung ausgelöst werden:
                                        <ol className="list-decimal pl-5 mt-1 space-y-1">
                                            <li><strong>Zahlung:</strong> Sie klicken auf einen Zahlungslink und werden zu Stripe weitergeleitet.</li>
                                            <li><strong>KI-Analyse:</strong> Sie nutzen eine Cloud-KI-Funktion und senden Text/Bild zur Analyse an die API des gewählten Anbieters (Google oder OpenAI).</li>
                                        </ol>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">3. Hosting (GitHub Pages)</h2>
                                <p className="mb-2 text-sm">Dienstanbieter ist GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1 text-sm">Server-Logfiles</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                    Bei jedem Aufruf der Webseite erfasst der Provider automatisch Informationen (IP-Adresse, Datum, Browser, Referrer).
                                </p>
                                <p className="text-xs mt-2">
                                    Weitere Informationen: <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzerklärung von GitHub</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">4. Zahlungsabwicklung (Stripe)</h2>
                                <p className="mb-2 text-sm">Sofern Sie kostenpflichtige Funktionen oder Lizenzen erwerben, nutzen wir dafür "Stripe Payment Links".</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                                    Für den Bezahlvorgang werden Sie von unserer Webseite direkt auf eine sichere, von Stripe gehostete Zahlungsseite weitergeleitet. Die Eingabe Ihrer Zahlungs- und Vertragsdaten erfolgt <strong>ausschließlich auf den Systemen von Stripe</strong>.
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Weitere Informationen: <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzerklärung von Stripe</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">5. KI-Funktionen</h2>
                                <p className="mb-2 text-sm">Die App dient als technisches Interface ("Bring Your Own Key").</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1 text-sm">Cloud-KI (Google Gemini & OpenAI)</h3>
                                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>Voraussetzung:</strong> Sie hinterlegen Ihren eigenen API-Schlüssel (API Key).</li>
                                    <li><strong>Datenfluss:</strong> Wenn Sie die Analyse starten, werden Text oder Bild direkt an den gewählten Anbieter gesendet.</li>
                                </ul>

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg mt-4">
                                    <strong className="text-amber-800 dark:text-amber-200 block mb-1 text-xs">⚠️ ACHTUNG BEI KOSTENLOSEN KEYS</strong>
                                    <p className="text-xs text-amber-900 dark:text-amber-100 mb-1">
                                        Bitte beachten Sie die Nutzungsbedingungen der Anbieter. Insbesondere bei kostenlosen Kontingenten ("Free Tier") können Eingaben unter Umständen zum <strong>Training der KI-Modelle</strong> genutzt werden.
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900 dark:text-amber-100">
                                        <li>Senden Sie keine sensiblen Daten (Gesundheitsdaten, Passwörter) an die Cloud-API.</li>
                                        <li>Für maximale Vertraulichkeit nutzen Sie bitte ein lokales LLM.</li>
                                    </ul>
                                </div>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1 text-sm">Lokale LLMs (Bring Your Own Model)</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Wenn Sie ein lokales LLM (z.B. via Ollama) konfigurieren, werden Ihre Daten nicht an externe Server gesendet. Die Verarbeitung erfolgt ausschließlich innerhalb Ihres Netzwerks (localhost).
                                </p>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">6. Ihre Rechte</h2>
                                <ul className="list-disc pl-5 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>Besonderheit bei Auskunft:</strong> Da wir keine Benutzer- oder Inhaltsdaten auf unseren Servern speichern, können wir keine Auskunft über Ihre lokal im Browser gespeicherten Daten geben.</li>
                                    <li><strong>Datenlöschung:</strong> Sie können Ihre lokalen Daten jederzeit löschen, indem Sie in der App "Alle Daten löschen" wählen oder Ihren Browser-Cache leeren.</li>
                                </ul>
                            </section>
                        </div>
                    )}

                    {activeTab === 'licenses' && (
                        <div className="space-y-6">
                            <h1 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Open Source Lizenzen</h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Dieses Projekt nutzt folgende Open Source Bibliotheken. Ein großer Dank geht an die Entwickler und die Community!
                            </p>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Core & Framework</h2>
                                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>React</strong> (MIT) - <a href="https://react.dev/" className="hover:underline">Facebook/Meta</a></li>
                                    <li><strong>Vite</strong> (MIT) - <a href="https://vitejs.dev/" className="hover:underline">Yuxi (Evan) You</a></li>
                                    <li><strong>TypeScript</strong> (Apache 2.0) - <a href="https://www.typescriptlang.org/" className="hover:underline">Microsoft</a></li>
                                    <li><strong>Tailwind CSS</strong> (MIT) - <a href="https://tailwindcss.com/" className="hover:underline">Tailwind Labs</a></li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">AI & Processing</h2>
                                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>@google/genai</strong> (Apache 2.0) - Google Gemini SDK</li>
                                    <li><strong>tesseract.js</strong> (Apache 2.0) - OCR Engine (basiert auf Tesseract)</li>
                                    <li><strong>namefully</strong> (MIT) - Namenserkennung</li>
                                    <li><strong>libphonenumber-js</strong> (MIT) - Telefonnummer-Validierung</li>
                                    <li><strong>smartcrop</strong> (MIT) - Bildzuschnitt</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Storage & Daten</h2>
                                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>idb</strong> (ISC) - IndexedDB Wrapper</li>
                                    <li><strong>jszip</strong> (MIT) - ZIP Archivierung</li>
                                    <li><strong>OpenPLZ API</strong> (ODbL) - Straßenverzeichnis Datenbasis</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">UI & Icons</h2>
                                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                                    <li><strong>Lucide React</strong> (ISC) - Icons</li>
                                    <li><strong>Sonner</strong> (MIT) - Toast Notifications</li>
                                    <li><strong>react-virtuoso</strong> (MIT) - Virtualisiertes Listen-Rendering</li>
                                    <li><strong>@fontsource/inter</strong> (OFL-1.1) - Schriftart Inter</li>
                                </ul>
                            </section>

                            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-xs text-slate-400">
                                    Kontakte.me © 2025 Alexander Mut. <br />
                                    Lizenziert unter der MIT Lizenz.
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};
