import { test, expect } from '@playwright/test'

test.describe('Autenticação', () => {
  test('página de login renderiza corretamente', async ({ page }) => {
    await page.goto('/auth/signin')
    await expect(page).toHaveURL('/auth/signin')
    await expect(page.getByText('MOOV Chat')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('acesso direto a /admin sem login redireciona para signin', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('acesso direto à raiz sem login redireciona para signin', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })

  test('login com credenciais inválidas exibe erro', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]',    'invalido@test.com')
    await page.fill('input[type="password"]', 'senhaerrada')
    await page.click('button[type="submit"]')
    // Aguarda mensagem de erro (pode variar dependendo do NextAuth)
    await expect(page.locator('text=Credenciais inválidas').or(
      page.locator('[role="alert"]').or(
        page.locator('.text-destructive')
      )
    )).toBeVisible({ timeout: 5000 })
  })
})
