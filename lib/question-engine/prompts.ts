import type { ConceptDefinition } from '@/lib/knowledge-graph/aws-saa'

export const FEW_SHOT_EXAMPLES = `
EXAMPLE 1 — S3 Cross-Region Replication scenario:
{
  "questionText": "Una empresa almacena archivos de cumplimiento normativo en S3 us-east-1. Regulaciones exigen que los datos estén disponibles en us-west-2 con máximo 15 minutos de lag garantizado. ¿Cuál es la configuración óptima?",
  "options": [
    "S3 CRR con Replication Time Control (RTC) habilitado",
    "S3 SRR con versioning habilitado en ambos buckets",
    "S3 CRR sin RTC y notificaciones SNS para monitoring",
    "Lambda que copie objetos cada 10 minutos via S3 Event Notifications"
  ],
  "correctIndex": 0,
  "explanation": "CRR con RTC garantiza que el 99.99% de objetos se replican en 15 minutos con un SLA formal. SRR es Same-Region (incorrecto para cross-region). Sin RTC no hay garantía de tiempo. Lambda es solución manual innecesaria cuando CRR+RTC es el servicio diseñado para este caso.",
  "difficulty": 0.7
}

EXAMPLE 2 — VPC Endpoint types:
{
  "questionText": "Una empresa tiene instancias EC2 en subnets privadas que acceden frecuentemente a S3 y KMS. El equipo quiere eliminar la dependencia de NAT Gateway para reducir costos y mejorar seguridad. ¿Qué tipo de endpoints debe usar para cada servicio?",
  "options": [
    "Gateway Endpoint para S3, Interface Endpoint para KMS",
    "Interface Endpoint para S3, Gateway Endpoint para KMS",
    "Gateway Endpoint para ambos S3 y KMS",
    "Interface Endpoint para ambos S3 y KMS"
  ],
  "correctIndex": 0,
  "explanation": "Gateway Endpoints solo existen para S3 y DynamoDB (gratuitos, modifican route table). KMS usa Interface Endpoint (PrivateLink) que crea un ENI privado en la subnet. Interface Endpoints cuestan por hora y por GB, pero Gateway Endpoints son gratuitos.",
  "difficulty": 0.6
}

EXAMPLE 3 — SQS vs SNS decision:
{
  "questionText": "Un sistema de e-commerce necesita procesar pedidos garantizando que cada pedido sea procesado exactamente una vez, en orden FIFO. Simultáneamente, múltiples microservicios (inventario, facturación, envíos) deben recibir una copia de cada pedido. ¿Cuál es la arquitectura correcta?",
  "options": [
    "SNS topic → múltiples SQS FIFO queues suscritas, un consumer por queue",
    "SQS Standard queue con múltiples consumers en parallel",
    "SNS topic → múltiples SQS Standard queues suscritas",
    "SQS FIFO queue única con múltiples consumers en polling"
  ],
  "correctIndex": 0,
  "explanation": "El patrón fan-out (SNS→SQS) es correcto para distribuir a múltiples servicios. Necesitamos SQS FIFO para garantizar orden y exactamente-una-vez entrega por servicio. SQS Standard no garantiza orden. Un única FIFO queue con múltiples consumers no distribuye independientemente a cada servicio.",
  "difficulty": 0.75
}
`

export interface CognitiveFingerprint {
  background?: 'developer' | 'sysadmin' | 'business' | 'student' | 'other'
  explanation_depth?: 'deep' | 'concise'
  weakness_pattern?: string
}

export function formatQuestionPrompt(
  concept: ConceptDefinition,
  recentMistakes: string[],
  difficulty: number,
  mode: 'discovery' | 'review' | 'intensive' | 'maintenance',
  fingerprint?: CognitiveFingerprint
): string {
  const difficultyLabel =
    difficulty < 0.3 ? 'básica' : difficulty < 0.6 ? 'intermedia' : difficulty < 0.8 ? 'avanzada' : 'experta'

  const modeInstructions = {
    discovery: 'Genera una pregunta introductoria que cubra el concepto fundamental. Opciones claramente distintas.',
    review: 'Genera una pregunta de revisión que refuerce el conocimiento. Puede incluir escenarios prácticos.',
    intensive: 'Genera una pregunta difícil con escenario complejo. Incluye opciones de distracción convincentes.',
    maintenance: 'Genera una pregunta de mantenimiento para retener conocimiento. Equilibra familiaridad con variación.',
  }[mode]

  const mistakesContext =
    recentMistakes.length > 0
      ? `\n\nConceptos donde el usuario comete errores frecuentes: ${recentMistakes.join(', ')}. Considera crear distractores relacionados con estos conceptos.`
      : ''

  // Hiperpersonalización (Pilar 2): adapta tono y profundidad de la explicación
  // según el background del usuario y patrón de debilidad observado.
  const userContext = (() => {
    if (!fingerprint) return ''
    const parts: string[] = []
    if (fingerprint.background === 'developer' || fingerprint.background === 'sysadmin') {
      parts.push('USUARIO: perfil técnico (developer/sysadmin) — usa terminología precisa, referencias a APIs/SDKs/CLI, omite definiciones básicas.')
    } else if (fingerprint.background === 'business') {
      parts.push('USUARIO: perfil business — incluye analogías de negocio (coste, SLA, riesgo) en la explicación, evita jerga de bajo nivel.')
    } else if (fingerprint.background === 'student') {
      parts.push('USUARIO: estudiante sin experiencia profesional — explica el "por qué" antes del "cómo", normaliza la dificultad del concepto.')
    }
    if (fingerprint.explanation_depth === 'concise') {
      parts.push('Explicación: concisa, máximo 3 oraciones, foco en el matiz que diferencia opciones similares.')
    } else if (fingerprint.explanation_depth === 'deep') {
      parts.push('Explicación: incluye contexto conceptual y conexión con principios de arquitectura.')
    }
    if (fingerprint.weakness_pattern) {
      parts.push(`Patrón de debilidad observado: ${fingerprint.weakness_pattern}.`)
    }
    return parts.length ? `\n\n${parts.join(' ')}` : ''
  })()

  return `Eres un experto en AWS Solutions Architect Associate (SAA-C03) que crea preguntas de examen de alta calidad.

${FEW_SHOT_EXAMPLES}

CONCEPTO A CUBRIR:
- Nombre: ${concept.name}
- Descripción: ${concept.description}
- Key Facts: ${concept.keyFacts.join('; ')}
- Exam Tips: ${concept.examTips.join('; ')}
- AWS Services involucrados: ${concept.awsServices.join(', ')}
- Se confunde con: ${concept.confusedWith.join(', ')}

INSTRUCCIONES:
1. Dificultad objetivo: ${difficultyLabel} (${difficulty.toFixed(1)}/1.0)
2. Modo: ${mode} — ${modeInstructions}
3. La pregunta DEBE ser práctica/escenario (no puramente teórica)
4. Exactamente 4 opciones, solo UNA correcta
5. Opciones incorrectas deben ser plausibles, basadas en malentendidos comunes
6. Explicación clara del POR QUÉ cada opción es correcta o incorrecta
7. Longitud de explicación: 3-5 oraciones concisas${mistakesContext}${userContext}

STYLE GUIDE (Pilar 4 — Optimización de Carga Cognitiva, no negociable):
- UNA SOLA idea central por pregunta. Nunca mezclar "¿qué servicio Y cómo lo configurarías?"
- El escenario en el stem debe ser ESPECÍFICO con números cuando aplique
  ("workload de 10,000 req/s pico, P99 < 100ms" es mejor que "alto tráfico").
- Las 4 opciones DEBEN ser paralelas en estructura: misma longitud aproximada
  (±30% en caracteres entre la más corta y la más larga), mismo nivel de detalle.
  El contraste de longitud es un cue falso de respuesta — eliminalo.
- Distractores plausibles, claramente incorrectos por una razón TÉCNICA específica
  (no por ser absurdos ni por mencionar servicios irrelevantes).
- Sin pistas léxicas: la opción correcta no debe usar palabras del stem que las
  incorrectas no usen.
- Sin "todas las anteriores" ni "ninguna de las anteriores".

RESPONDE ÚNICAMENTE con JSON válido, sin markdown, sin texto extra:
{
  "questionText": "...",
  "options": ["opción A", "opción B", "opción C", "opción D"],
  "correctIndex": 0,
  "explanation": "...",
  "difficulty": ${difficulty.toFixed(2)}
}`
}

export function formatEvaluationPrompt(
  questionText: string,
  options: string[],
  correctIndex: number,
  selectedIndex: number,
  explanation: string
): string {
  const isCorrect = selectedIndex === correctIndex
  const selectedOption = options[selectedIndex] ?? 'Unknown'
  const correctOption = options[correctIndex] ?? 'Unknown'

  // Pilar 3 — Entorno de Experimentación Seguro:
  // Lenguaje no-punitivo. NUNCA usar "incorrecto/fallo/error/mal" para errores.
  // Validar la lógica interna del razonamiento ANTES de explicar por qué la
  // opción óptima es otra. En errores, generar micro-pregunta de elaboración
  // que activa el efecto de generación (Bjork) — no servir la respuesta lista.
  const elaborationBlock = isCorrect
    ? ''
    : `,
  "elaboration": {
    "prompt": "una micro-pregunta de 1 línea que invite al usuario a elaborar (ej: '¿En qué escenario sería tu elección la correcta?')",
    "validReasoningHint": "una frase que reconozca la lógica interna de la opción elegida (ej: 'Tu elección prioriza X, lo cual es válido cuando Y')"
  }`

  return `Eres un tutor de AWS SAA-C03 que evalúa respuestas siguiendo principios de aprendizaje productivo.

PREGUNTA: ${questionText}

OPCIÓN SELECCIONADA: "${selectedOption}" (índice ${selectedIndex})
OPCIÓN ÓPTIMA: "${correctOption}" (índice ${correctIndex})
RESULTADO: ${isCorrect ? 'OPTIMO' : 'NO_OPTIMO'}
CONTEXTO BASE: ${explanation}

REGLAS DE TONO:
- Nunca uses "incorrecto", "fallo", "error", "mal", "fallaste". Usa "no es la opción óptima", "el escenario pide otra arquitectura", "esa elección encaja en otro contexto".
- Si NO_OPTIMO, primero valida la lógica interna del razonamiento, luego explica por qué la otra opción es preferible aquí.
- Tono directo y técnico, no motivacional vacío.

Responde con JSON válido (sin markdown):
{
  "isCorrect": ${isCorrect},
  "score": ${isCorrect ? 1.0 : 0.0},
  "explanation": "${isCorrect ? 'reafirma el por qué la opción es óptima en 2-3 frases concretas' : 'valida la lógica del razonamiento del usuario y luego explica por qué la opción óptima es preferible en este escenario específico (3-4 frases)'}",
  "keyInsight": "el insight más importante para recordar (1 frase memorable)",
  "relatedConcepts": ["concepto1", "concepto2"],
  "studyTip": "consejo específico para retener este conocimiento"${elaborationBlock}
}`
}
