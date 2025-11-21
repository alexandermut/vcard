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
                                <strong>Stand:</strong> {new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long' })}
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
                                <p className="mb-2">Diese Anwendung ("vCards") unterscheidet sich grundlegend von klassischen Cloud-Diensten.</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong>Lokale Speicherung:</strong> Alle von Ihnen eingegebenen Daten (Texte, Visitenkarten-Scans, Historie, Einstellungen) werden <strong>ausschließlich lokal im Browser Ihres Endgeräts</strong> (Local Storage / IndexedDB) gespeichert.</li>
                                    <li><strong>Kein Backend-Zugriff:</strong> Der Betreiber dieser Webseite hat technisch <strong>keinen Zugriff</strong> auf Ihre gespeicherten Inhalte. Es findet keine automatische Synchronisation oder Speicherung Ihrer Inhaltsdaten auf unseren Servern statt.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">3. Bereitstellung der Webseite (Hosting)</h2>
                                <p className="mb-2">Um die Applikation in Ihrem Browser auszuführen, müssen die Programmdateien (HTML, CSS, JavaScript) von einem Server geladen werden.</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">3.1. Hosting-Provider</h3>
                                <p className="text-sm">
                                    Wir nutzen für das Hosting <strong>GitHub Pages</strong>. Dienstanbieter ist GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">3.2. Server-Logfiles</h3>
                                <p className="text-sm mb-2">
                                    Bei jedem Aufruf der Webseite erfasst der Provider automatisch Informationen, die Ihr Browser übermittelt (Art. 6 Abs. 1 lit. f DSGVO – Berechtigtes Interesse zur Sicherheit und Auslieferung). Erfasste Daten:
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li>IP-Adresse (wird vom Provider i.d.R. anonymisiert oder nach kurzer Zeit gelöscht)</li>
                                    <li>Datum und Uhrzeit des Zugriffs</li>
                                    <li>Verwendeter Browser und Betriebssystem</li>
                                    <li>Referrer URL (die zuvor besuchte Seite)</li>
                                </ul>
                                <p className="text-sm mt-2">
                                    Weitere Informationen finden Sie in der <a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Datenschutzerklärung von GitHub</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">4. Optionale KI-Funktionen (Schnittstelle zu Google Gemini)</h2>
                                <p className="mb-2">Die App bietet Funktionen zur Textoptimierung und Bildanalyse (OCR) an. Diese Funktionen basieren auf Künstlicher Intelligenz.</p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.1. Funktionsweise "Bring Your Own Key" (BYOK)</h3>
                                <p className="text-sm mb-2">
                                    Die KI-Verarbeitung findet nicht auf unseren Servern statt. Die App "vCards" dient lediglich als technisches Interface, das eine <strong>direkte Verbindung von Ihrem Browser zur API von Google</strong> herstellt.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    <li><strong>Voraussetzung:</strong> Sie müssen Ihren eigenen API-Schlüssel (API Key) in den Einstellungen hinterlegen.</li>
                                    <li><strong>Datenfluss:</strong> Wenn Sie einen Button (z.B. "Analysieren") klicken, werden der Text oder das Bild direkt an Google gesendet. Wir als App-Betreiber erhalten <strong>keine Kenntnis</strong> vom Inhalt oder Ihrem Key.</li>
                                </ul>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.2. Rechtsgrundlage</h3>
                                <p className="text-sm">
                                    Die Übermittlung erfolgt auf Basis Ihrer <strong>freiwilligen, aktiven Handlung</strong> (Art. 6 Abs. 1 lit. a DSGVO). Ohne Ihren API-Key und Ihren Klick findet keine Übertragung statt.
                                </p>

                                <h3 className="font-semibold text-slate-700 dark:text-slate-400 mt-3 mb-1">4.3. Hinweis zu Drittlandtransfers (USA)</h3>
                                <p className="text-sm">
                                    Daten werden an Google LLC (USA) übermittelt. Google ist unter dem <strong>EU-US Data Privacy Framework (DPF)</strong> zertifiziert (angemessenes Datenschutzniveau).
                                </p>

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg mt-4">
                                    <strong className="text-amber-800 dark:text-amber-200 block mb-2">⚠️ ACHTUNG BEI KOSTENLOSEN KEYS & SENSIBLEN DATEN</strong>
                                    <ol className="list-decimal pl-5 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                                        <li><strong>Nutzungsbedingungen:</strong> Es gelten die Bedingungen, die Sie direkt mit Google (z.B. via AI Studio) vereinbart haben.</li>
                                        <li><strong>KI-Training:</strong> Google behält sich bei kostenlosen Kontingenten ("Free Tier") oft vor, Eingaben zum <strong>Training der KI-Modelle</strong> zu nutzen.</li>
                                        <li><strong>Keine sensiblen Daten:</strong> Senden Sie keine Gesundheitsdaten, Passwörter oder Geschäftsgeheimnisse an die KI, wenn Sie nicht über einen entsprechenden kostenpflichtigen Vertrag ("Paid Tier") sichergestellt haben, dass keine Nutzung zu Trainingszwecken erfolgt.</li>
                                    </ol>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">5. Einbindung von Diensten und Bibliotheken</h2>
                                <p className="mb-2">Um die Datensicherheit zu maximieren und Tracking durch Dritte zu verhindern, haben wir externe Ressourcen eliminiert:</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong>Google Fonts:</strong> Schriftarten sind lokal auf unserem Webspace gespeichert. Es wird keine Verbindung zu Google-Servern aufgebaut, um Schriften zu laden.</li>
                                    <li><strong>Keine Tracker:</strong> Wir setzen keine Analyse-Tools (wie Google Analytics) oder Werbe-Tracker ein.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-lg font-semibold mb-2">6. Ihre Rechte</h2>
                                <p className="mb-2">Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung.</p>
                                <ul className="list-disc pl-5 space-y-2 text-sm">
                                    <li><strong>Besonderheit bei Auskunft:</strong> Da wir keine Benutzerdaten auf unseren Servern speichern (siehe Punkt 2), können wir keine Auskunft über Ihre lokal gespeicherten Daten geben.</li>
                                    <li><strong>Datenlöschung:</strong> Sie können Ihre Daten jederzeit löschen, indem Sie in der App "Alle Daten löschen" wählen oder Ihren Browser-Cache leeren.</li>
                                    <li><strong>Widerruf:</strong> Entfernen Sie Ihren API-Key aus den Einstellungen, um die Nutzung der KI-Schnittstelle technisch zu unterbinden.</li>
                                </ul>
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
