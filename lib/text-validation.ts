// ==================================================
// VIRA - Validación de Texto Anti-Repetición
// ==================================================
// Detecta repeticiones en textos generados por IA
// para asegurar calidad editorial en noticieros
// ==================================================

import 'server-only';

// ==================================================
// TIPOS
// ==================================================

export interface RepetitionIssue {
    type: 'exact_phrase' | 'ngram' | 'vocabulary' | 'semantic';
    severity: 'warning' | 'critical';
    details: string;
}

export interface RepetitionAnalysis {
    isValid: boolean;
    score: number;           // 0-100, donde 100 = sin repeticiones
    issues: RepetitionIssue[];
}

// ==================================================
// FUNCIÓN PRINCIPAL DE DETECCIÓN
// ==================================================

/**
 * Detecta repeticiones en un texto generado
 * @param text - Texto a analizar
 * @returns Análisis con score y lista de problemas detectados
 */
export function detectRepetitions(text: string): RepetitionAnalysis {
    if (!text || text.trim().length < 50) {
        return { isValid: true, score: 100, issues: [] };
    }

    const issues: RepetitionIssue[] = [];

    // Dividir en oraciones
    const sentences = splitIntoSentences(text);

    // 1. Detectar frases exactas repetidas (5+ palabras)
    const phraseIssues = detectExactPhrases(text, 5);
    issues.push(...phraseIssues);

    // 2. Detectar trigramas muy repetidos
    const trigramIssues = detectRepeatedNgrams(text, 3, 3);
    issues.push(...trigramIssues);

    // 3. Calcular ratio de vocabulario único
    const vocabIssues = analyzeVocabulary(text);
    issues.push(...vocabIssues);

    // 4. Detectar oraciones consecutivas muy similares
    const semanticIssues = detectSimilarConsecutiveSentences(sentences, 0.75);
    issues.push(...semanticIssues);

    // Calcular score final
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 8));

    return {
        isValid: criticalCount === 0,
        score,
        issues
    };
}

// ==================================================
// FUNCIONES DE DETECCIÓN
// ==================================================

/**
 * Divide texto en oraciones
 */
function splitIntoSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);
}

/**
 * Detecta frases exactas repetidas de N+ palabras
 */
function detectExactPhrases(text: string, minWords: number): RepetitionIssue[] {
    const issues: RepetitionIssue[] = [];
    const words = text.toLowerCase().split(/\s+/);
    const phraseMap = new Map<string, number>();

    // Generar frases de minWords a minWords+3 palabras
    for (let len = minWords; len <= Math.min(minWords + 3, words.length); len++) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            phraseMap.set(phrase, (phraseMap.get(phrase) || 0) + 1);
        }
    }

    // Encontrar frases repetidas 2+ veces
    for (const [phrase, count] of phraseMap) {
        if (count >= 2 && phrase.split(' ').length >= minWords) {
            // Evitar falsos positivos con frases muy comunes
            if (!isCommonPhrase(phrase)) {
                issues.push({
                    type: 'exact_phrase',
                    severity: count >= 3 ? 'critical' : 'warning',
                    details: `Frase repetida ${count}x: "${truncate(phrase, 50)}"`
                });
            }
        }
    }

    // Limitar a los 3 problemas más graves
    return issues.slice(0, 3);
}

/**
 * Detecta n-gramas repetidos más de threshold veces
 */
function detectRepeatedNgrams(text: string, n: number, threshold: number): RepetitionIssue[] {
    const issues: RepetitionIssue[] = [];
    const words = text.toLowerCase().split(/\s+/);
    const ngramMap = new Map<string, number>();

    for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        ngramMap.set(ngram, (ngramMap.get(ngram) || 0) + 1);
    }

    // Contar n-gramas que superan el umbral
    const repeatedCount = [...ngramMap.values()].filter(c => c >= threshold).length;

    if (repeatedCount > 5) {
        issues.push({
            type: 'ngram',
            severity: repeatedCount > 10 ? 'critical' : 'warning',
            details: `${repeatedCount} trigramas repetidos ${threshold}+ veces`
        });
    }

    return issues;
}

/**
 * Analiza diversidad de vocabulario
 */
function analyzeVocabulary(text: string): RepetitionIssue[] {
    const issues: RepetitionIssue[] = [];
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = new Set(words);
    const vocabRatio = uniqueWords.size / words.length;

    if (vocabRatio < 0.5) {
        issues.push({
            type: 'vocabulary',
            severity: 'critical',
            details: `Vocabulario único: ${Math.round(vocabRatio * 100)}% (mínimo: 50%)`
        });
    } else if (vocabRatio < 0.6) {
        issues.push({
            type: 'vocabulary',
            severity: 'warning',
            details: `Vocabulario único: ${Math.round(vocabRatio * 100)}% (recomendado: 60%+)`
        });
    }

    return issues;
}

/**
 * Detecta oraciones consecutivas muy similares usando Jaccard
 */
function detectSimilarConsecutiveSentences(sentences: string[], threshold: number): RepetitionIssue[] {
    const issues: RepetitionIssue[] = [];

    for (let i = 1; i < sentences.length; i++) {
        const similarity = jaccardSimilarity(sentences[i - 1], sentences[i]);

        if (similarity >= threshold) {
            issues.push({
                type: 'semantic',
                severity: similarity >= 0.85 ? 'critical' : 'warning',
                details: `Oraciones ${i} y ${i + 1} son ${Math.round(similarity * 100)}% similares`
            });
        }
    }

    // Limitar a 2 issues de este tipo
    return issues.slice(0, 2);
}

// ==================================================
// UTILIDADES
// ==================================================

/**
 * Calcula similitud de Jaccard entre dos textos
 */
function jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const setB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));

    if (setA.size === 0 || setB.size === 0) return 0;

    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
}

/**
 * Verifica si una frase es muy común (evitar falsos positivos)
 */
function isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
        'de la', 'en el', 'que se', 'a la', 'por el', 'con el',
        'de los', 'de las', 'en la', 'para el', 'para la',
        'por la', 'con la', 'en los', 'en las', 'que el',
        'se ha', 'ha sido', 'que la', 'por lo', 'lo que'
    ];

    // Si la frase es muy corta o es común, ignorar
    return phrase.split(' ').length <= 3 ||
        commonPhrases.some(cp => phrase.includes(cp) && phrase.length < cp.length + 10);
}

/**
 * Trunca texto a N caracteres
 */
function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

// ==================================================
// PROMPT CORRECTIVO PARA REINTENTOS
// ==================================================

/**
 * Genera prompt correctivo que incluye reglas TTS
 * El prompt incluye todas las reglas de locución del prompt original
 */
export function buildCorrectivePrompt(
    issues: RepetitionIssue[],
    previousContent: string,
    targetWords: number
): string {
    const issueDescriptions = issues
        .map(i => `- ${i.details}`)
        .join('\n');

    return `⚠️ CORRECCIÓN REQUERIDA: El texto anterior contenía REPETICIONES inaceptables.

PROBLEMAS DETECTADOS:
${issueDescriptions}

TEXTO PROBLEMÁTICO:
"${previousContent.substring(0, 600)}..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCCIONES DE CORRECCIÓN PARA TTS:

✅ DEBES:
- **REFORMULAR COMPLETAMENTE** sin repetir estructuras ni frases.
- Usar **solo oraciones completas de máx. 14 palabras**.
- **Reemplazar TODAS las comas innecesarias por puntos**.
- Cada oración = **una sola idea o acción**.
- Escribir natural y fluido, como hablarías al aire.
- Usar vocabulario chileno estándar.
- Terminar con oración completa que cierre la noticia.
- **VARIAR el vocabulario**: no repitas las mismas palabras.

❌ NUNCA:
- Repitas frases, ideas o estructuras (ni con sinónimos).
- Uses punto y coma, dos puntos, guiones largos o paréntesis.
- Inicies varias oraciones con las mismas palabras.
- Uses más de una coma por oración.

🧠 REGLA DE ORO:
"Si al leer en voz alta necesitas pausar para respirar → debió ser un punto, no una coma."

🎯 EXTENSIÓN: ${targetWords} palabras. Mejor menos que repetido.

→ Devuelve SOLO el guion corregido sin repeticiones. Nada más.`;
}
