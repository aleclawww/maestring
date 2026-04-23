import { expect, test } from '@playwright/test'

// One full round-trip of the study loop (setup → question → feedback) with
// /api/study/* stubbed at the HTTP level. Validates the client-side reducer,
// QuestionCard rendering, and AnswerFeedback transition without hitting
// Anthropic or the DB. Runs only with the test-auth shim enabled.
const enabled = process.env['ALLOW_TEST_AUTH'] === '1'

const STUB_SESSION_ID = '11111111-1111-1111-1111-111111111111'
const STUB_QUESTION_ID = '22222222-2222-2222-2222-222222222222'
const STUB_CONCEPT_ID = '33333333-3333-3333-3333-333333333333'
const STUB_DOMAIN_ID = '44444444-4444-4444-4444-444444444444'

const stubQuestion = {
  id: STUB_QUESTION_ID,
  conceptId: STUB_CONCEPT_ID,
  conceptName: 'S3 Storage Classes',
  conceptSlug: 's3-storage-classes',
  domainId: STUB_DOMAIN_ID,
  questionText: 'Which S3 storage class minimizes cost for infrequently accessed data with millisecond retrieval?',
  options: ['S3 Standard', 'S3 Standard-IA', 'S3 Glacier Deep Archive', 'S3 One Zone-IA'],
  correctIndex: 1,
  explanation: 'Standard-IA gives low-ms retrieval at a lower storage cost for infrequent access.',
  difficulty: 0.5,
  questionType: 'multiple_choice',
  hint: null,
  explanationDeep: null,
  keyInsight: null,
  scenarioContext: null,
  tags: [],
}

const stubEvaluation = {
  isCorrect: true,
  score: 1,
  explanation: 'Correct — Standard-IA is the right answer.',
  keyInsight: 'IA = Infrequent Access.',
  relatedConcepts: [],
}

test.describe('@smoke study loop (stubbed)', () => {
  test.skip(!enabled, 'Set ALLOW_TEST_AUTH=1 on the server to run the study-loop spec')

  test('selecting Repaso renders a question and submitting shows feedback', async ({ page, request, context }) => {
    // Auth.
    const login = await request.post('/api/test/login', {
      data: { email: 'e2e-fixture@maestring.test' },
    })
    expect(login.ok()).toBe(true)
    await context.addCookies((await request.storageState()).cookies)

    // Stub the three routes the study flow hits.
    await page.route('**/api/study/session', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: STUB_SESSION_ID } }),
        })
        return
      }
      // PATCH / DELETE — session close / abandon.
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{"ok":true}}' })
    })

    await page.route('**/api/study/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: stubQuestion }),
      })
    })

    await page.route('**/api/study/evaluate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: stubEvaluation }),
      })
    })

    await page.goto('/study')

    // Kick off a review session. "Repaso" is the review-mode tile.
    await page.getByRole('button', { name: /repaso/i }).first().click()

    // QuestionCard renders with the stubbed question.
    await expect(page.getByText(stubQuestion.questionText)).toBeVisible()
    await expect(page.getByText('S3 Standard-IA')).toBeVisible()

    // Pick the correct option (B = index 1), submit.
    await page.getByRole('button', { name: /S3 Standard-IA/ }).click()
    await page.getByRole('button', { name: /Confirmar respuesta/i }).click()

    // Feedback surfaces — correct-path copy from stubEvaluation.
    await expect(page.getByText(stubEvaluation.explanation)).toBeVisible({ timeout: 10_000 })
  })
})
