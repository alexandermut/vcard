import React, { useState, useEffect } from 'react';
import { X, Shield, Scale } from 'lucide-react';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTab?: 'imprint' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, initialTab = 'imprint' }) => {
    const [activeTab, setActiveTab] = useState<'imprint' | 'privacy'>(initialTab);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('imprint')}
                            className={`text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'imprint'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Scale size={16} />
                            Impressum
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`text-sm font-semibold flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${activeTab === 'privacy'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Shield size={16} />
                            Datenschutz
                        </button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-300 leading-relaxed">

                    {activeTab === 'imprint' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Impressum</h1>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 DDG</h2>
                                <p>
                                    Alexander Mut<br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg<br />
                                    Deutschland
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
                                <p>
                                    Telefon: +49 151 51 00 27 67<br />
                                    E-Mail: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-sm">mutalex (at) gmail (punkt) com</span>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
                                <p>
                                    Alexander Mut<br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-4">Haftungsausschluss (Disclaimer)</h2>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2">Haftung für Inhalte</h3>
                                <p className="mb-4 text-sm">
                                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                                </p>
                                <p className="mb-4 text-sm">
                                    Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2">Haftung für Links</h3>
                                <p className="mb-4 text-sm">
                                    Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
                                </p>
                                <p className="mb-4 text-sm">
                                    Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-4 mb-2">Urheberrecht</h3>
                                <p className="mb-4 text-sm">
                                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="space-y-6">
                            <h1 className="text-2xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">Datenschutzerklärung</h1>

                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm">
                                <strong>Stand:</strong> November 2025
                            </div>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">1. Verantwortlicher und Kontakt</h2>
                                <p>Verantwortlicher für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
                                <p className="mt-2">
                                    <strong>Alexander Mut</strong><br />
                                    Falkenbergsweg 66<br />
                                    21149 Hamburg<br />
                                    Deutschland<br />
                                    Tel: +49 151 51 00 27 67<br />
                                    E-Mail: <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded text-sm">mutalex (at) gmail (punkt) com</span>
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">2. Grundsätzliche Funktionsweise ("Local-First"-Architektur)</h2>
                                <p className="mb-2">Diese Anwendung ("Kontakte.me") verfolgt einen "Local-First"-Ansatz. Das bedeutet:</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
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
                                <h2 className="text-lg font-semibold mb-2">3. Bereitstellung der Webseite (Hosting)</h2>
                                <p className="mb-2">Um die Applikation in Ihrem Browser auszuführen, müssen die Programmdateien von einem Server geladen werden.</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">3.1. Hosting-Provider</h3>
                                <p className="text-sm">
                                    Wir nutzen für das Hosting <strong>GitHub Pages</strong>. Dienstanbieter ist GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">3.2. Server-Logfiles</h3>
                                <p className="text-sm mb-2">
                                    Bei jedem Aufruf der Webseite erfasst der Provider automatisch Informationen (Art. 6 Abs. 1 lit. f DSGVO – Berechtigtes Interesse zur Sicherheit und Auslieferung):
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>IP-Adresse (wird vom Provider i.d.R. anonymisiert oder nach kurzer Zeit gelöscht)</li>
                                    <li>Datum und Uhrzeit des Zugriffs</li>
                                    <li>Verwendeter Browser und Betriebssystem</li>
                                    <li>Referrer URL</li>
                                </ul>
                                <p className="text-sm mt-2">
                                    Weitere Informationen finden Sie in der <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzerklärung von GitHub</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">4. Zahlungsabwicklung (Stripe)</h2>
                                <p className="mb-2">Sofern Sie kostenpflichtige Funktionen oder Lizenzen erwerben, nutzen wir dafür "Stripe Payment Links".</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.1. Funktionsweise & Weiterleitung</h3>
                                <p className="text-sm mb-2">
                                    Für den Bezahlvorgang werden Sie von unserer Webseite direkt auf eine sichere, von Stripe gehostete Zahlungsseite weitergeleitet. Die Eingabe Ihrer Zahlungs- und Vertragsdaten erfolgt <strong>ausschließlich auf den Systemen von Stripe</strong>. Wir als Webseitenbetreiber haben zu keinem Zeitpunkt Zugriff auf Ihre Kreditkartendaten oder Bankverbindungen.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.2. Dienstleister</h3>
                                <p className="text-sm">
                                    Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Grand Canal Dock, Dublin, Irland.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.3. Datenfluss</h3>
                                <p className="text-sm">
                                    Durch das Aufrufen des Zahlungslinks erhält Stripe Kenntnis über Ihre IP-Adresse und Browserdaten (technisch notwendig zum Aufbau der Seite). Wir erhalten von Stripe nach Abschluss der Zahlung lediglich eine Bestätigung über die erfolgreiche Transaktion.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.4. Rechtsgrundlage</h3>
                                <p className="text-sm">
                                    Die Weiterleitung und Abwicklung erfolgt zur Erfüllung des Vertrages (Art. 6 Abs. 1 lit. b DSGVO). Weitere Informationen finden Sie in der <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzerklärung von Stripe</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">5. Optionale KI-Funktionen (Google, OpenAI & Lokale LLMs)</h2>
                                <p className="mb-2">Die App bietet Funktionen zur Textoptimierung und Bildanalyse an. Sie können wählen zwischen Cloud-Anbietern oder lokalen Modellen.</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">5.1. Cloud-KI (Google Gemini & OpenAI)</h3>
                                <p className="text-sm mb-2">
                                    Die App dient als technisches Interface ("Bring Your Own Key"), das eine direkte Verbindung von Ihrem Browser zur API des gewählten Anbieters herstellt.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Voraussetzung:</strong> Sie hinterlegen Ihren eigenen API-Schlüssel (API Key).</li>
                                    <li><strong>Datenfluss:</strong> Wenn Sie die Analyse starten, werden Text oder Bild direkt an den gewählten Anbieter gesendet. Wir als App-Betreiber sehen diese Daten nicht.</li>
                                    <li><strong>Rechtsgrundlage:</strong> Ihre freiwillige, aktive Handlung (Art. 6 Abs. 1 lit. a DSGVO).</li>
                                </ul>

                                <p className="text-sm mt-3 font-semibold">Die Anbieter:</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Google Gemini:</strong> Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA.</li>
                                    <li><strong>OpenAI:</strong> OpenAI, L.L.C., 3180 18th Street, San Francisco, CA 94110, USA.</li>
                                </ul>

                                <p className="text-sm mt-3 font-semibold">Drittlandtransfers & Sicherheit:</p>
                                <p className="text-sm">
                                    Beide Anbieter sitzen in den USA. Beide sind unter dem <strong>EU-US Data Privacy Framework (DPF)</strong> zertifiziert, was ein angemessenes Datenschutzniveau gewährleistet.
                                </p>

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg mt-4">
                                    <strong className="text-amber-800 dark:text-amber-200 block mb-2">⚠️ ACHTUNG BEI KOSTENLOSEN KEYS & TRAINING</strong>
                                    <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                                        Bitte beachten Sie die Nutzungsbedingungen der Anbieter. Insbesondere bei kostenlosen Kontingenten ("Free Tier") können Eingaben unter Umständen zum <strong>Training der KI-Modelle</strong> genutzt werden.
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                                        <li>Senden Sie keine sensiblen Daten (Gesundheitsdaten, Passwörter, Geschäftsgeheimnisse) an die Cloud-API.</li>
                                        <li>Für maximale Vertraulichkeit nutzen Sie bitte ein lokales LLM (siehe 5.2).</li>
                                    </ul>
                                </div>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">5.2. Lokale LLMs (Bring Your Own Model)</h3>
                                <p className="text-sm">
                                    Wenn Sie ein lokales LLM (z.B. via Ollama) konfigurieren, werden Ihre Daten nicht an externe Server gesendet. Die Verarbeitung erfolgt ausschließlich innerhalb Ihres Netzwerks (localhost). Sie sind selbst für die sichere Konfiguration Ihres lokalen Servers verantwortlich.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">5.3. Google Kontakte Integration (Import/Export)</h3>
                                <p className="text-sm mb-2">
                                    Wenn Sie sich mit Ihrem Google-Konto verbinden ("Sign in with Google"), um Kontakte zu importieren oder zu exportieren, geschieht dies in Ihrer alleinigen Verantwortung.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Direkte Verbindung:</strong> Die Verbindung erfolgt direkt zwischen Ihrem Browser und den Google-Servern (Google People API).</li>
                                    <li><strong>Kein Zwischenspeicher:</strong> Wir als Dienstanbieter ("kontakte.me") haben technisch keinen Zugriff auf Ihre Google-Zugangsdaten oder Ihre Kontakte. Es werden keine Daten auf unseren Servern gespeichert.</li>
                                    <li><strong>Lokale Verarbeitung:</strong> Die abgerufenen Kontaktdaten werden ausschließlich lokal in Ihrem Browser verarbeitet und gespeichert.</li>
                                    <li><strong>Datenschutz bei Google:</strong> Für die Datenverarbeitung durch Google gelten die <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzbestimmungen von Google</a>.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">6. Einbindung von Diensten und Bibliotheken</h2>
                                <p className="mb-2">Um die Datensicherheit zu maximieren:</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong>Google Fonts:</strong> Schriftarten sind lokal gespeichert. Keine Verbindung zu Google-Servern.</li>
                                    <li><strong>Keine Tracker:</strong> Wir setzen keine Analyse-Tools (wie Google Analytics) oder Werbe-Tracker ein.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">7. Ihre Rechte</h2>
                                <p className="mb-2">Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung.</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong>Besonderheit bei Auskunft:</strong> Da wir keine Benutzer- oder Inhaltsdaten auf unseren Servern speichern (siehe Punkt 2), können wir keine Auskunft über Ihre lokal im Browser gespeicherten Daten geben.</li>
                                    <li><strong>Datenlöschung:</strong> Sie können Ihre lokalen Daten jederzeit löschen, indem Sie in der App "Alle Daten löschen" wählen oder Ihren Browser-Cache leeren.</li>
                                    <li><strong>Widerruf:</strong> Entfernen Sie Ihren API-Key aus den Einstellungen, um die Nutzung der KI-Schnittstellen technisch zu unterbinden.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">8. Haftungsausschluss & Eigenverantwortung</h2>
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg text-blue-900 dark:text-blue-100">
                                    <p className="mb-2">Diese Anwendung ist eine reine Frontend-Applikation.</p>
                                    <ul className="list-disc pl-5 space-y-2 text-sm">
                                        <li><strong>Datenverlust:</strong> Es findet keine automatische Cloud-Synchronisation statt. Sie sind allein verantwortlich für Backups Ihrer Daten (nutzen Sie hierfür die "Backup & Restore" Funktion in der Historie). Bei Geräteverlust oder Löschen des Browser-Caches sind die Daten unwiderruflich verloren.</li>
                                        <li><strong>Sicherheit:</strong> Sie tragen die volle Verantwortung für die Sicherheit Ihrer API-Schlüssel und die Geheimhaltung Ihrer generierten Lizenzschlüssel.</li>
                                    </ul>
                                </div>
                            </section>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-lg shadow-sm">
                        Schließen
                    </button>
                </div>

            </div>
        </div>
    );
};
