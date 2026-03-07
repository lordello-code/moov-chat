import { test, expect } from '@playwright/test'

test.describe('Leads (sem autenticação)', () => {
  test('acesso à fila sem login redireciona para signin', async ({ page }) => {
    await page.goto('/loja-demo/fila')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('acesso ao inbox sem login redireciona para signin', async ({ page }) => {
    await page.goto('/loja-demo/inbox/qualquer-id')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('acesso às métricas sem login redireciona para signin', async ({ page }) => {
    await page.goto('/loja-demo/metricas')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})

test.describe('API de Leads (sem autenticação)', () => {
  test('GET /api/[tenant]/leads retorna 401 sem sessão', async ({ request }) => {
    const res = await request.get('/api/loja-demo/leads')
    expect(res.status()).toBe(401)
  })

  test('GET /api/[tenant]/alerts retorna 401 sem sessão', async ({ request }) => {
    const res = await request.get('/api/loja-demo/alerts')
    expect(res.status()).toBe(401)
  })

  test('GET /api/[tenant]/reports/dashboard retorna 401 ou 403 sem sessão', async ({ request }) => {
    const res = await request.get('/api/loja-demo/reports/dashboard')
    expect([401, 403]).toContain(res.status())
  })
})
