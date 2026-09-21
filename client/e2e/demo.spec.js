import { test, expect } from '@playwright/test'

test.setTimeout(60000)

test('public viva surfaces', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Find the right person/i })).toBeVisible()
  await expect(page.getByText('Five-minute viva beat')).toBeVisible()
  await expect(page.getByText('priya@freelancehub.dev')).toBeVisible()

  await page.goto('/login')
  await page.getByRole('button', { name: 'Priya · client' }).click()
  await expect(page.getByLabel('Email')).toHaveValue('priya@freelancehub.dev')
  await expect(page.getByLabel('Password')).toHaveValue('Password123!')

  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Open projects' })).toBeVisible()
  await page.locator('select').nth(1).selectOption('hourly')
  await expect(page.getByRole('link', { name: /Hourly pairing on the Node sync API/ })).toBeVisible()

  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('Priya dashboard shows Scan MVP ready to release', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Priya · client' }).click()
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//)
  await expect(page.getByRole('heading', { name: 'Your hiring desk' })).toBeVisible()
  await expect(page.getByText(/Ready to release · Scan MVP/i)).toBeVisible()
})
