import { test, expect } from '@playwright/test'

test.setTimeout(60000)

test('public marketplace surfaces', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Find the right person/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Built for both sides of the desk/i })).toBeVisible()

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Priya · client' })).toHaveCount(0)
  await page.getByLabel('Email').fill('priya@freelancehub.dev')
  await page.getByLabel('Password').fill('Password123!')

  await page.goto('/projects')
  await expect(page.getByRole('heading', { name: 'Open projects' })).toBeVisible()
  await page.locator('select').nth(1).selectOption('hourly')
  await expect(page.getByRole('link', { name: /Hourly pairing on the Node sync API/ })).toBeVisible()

  await page.goto('/this-route-does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('Priya dashboard shows Scan MVP ready to release', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('priya@freelancehub.dev')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//)
  await expect(page.getByRole('heading', { name: 'Your hiring desk' })).toBeVisible()
  await expect(page.getByText(/Ready to release · Scan MVP/i)).toBeVisible()
})
