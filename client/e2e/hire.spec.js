import { test, expect } from '@playwright/test'

async function login(page, email, password = 'Password123!') {
  await page.goto('/login')
  const emailBox = page.getByLabel('Email')
  if (!(await emailBox.isVisible().catch(() => false))) {
    await logout(page)
  }
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//)
}

async function logout(page) {
  await page.evaluate(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {
      // already signed out
    }
    localStorage.removeItem('fh_token')
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
}

test.setTimeout(180000)

test('hire loop smoke', async ({ page, request }) => {
  const stamp = Date.now()
  const clientEmail = `e2e.client.${stamp}@test.dev`
  const freelancerEmail = `e2e.free.${stamp}@test.dev`
  const clientRes = await request.post('/api/auth/register', {
    data: { name: 'E2E Client', email: clientEmail, password: 'Password123!', role: 'client' },
  })
  expect(clientRes.ok()).toBeTruthy()
  const freelancerRes = await request.post('/api/auth/register', {
    data: { name: 'E2E Freelancer', email: freelancerEmail, password: 'Password123!', role: 'freelancer' },
  })
  expect(freelancerRes.ok()).toBeTruthy()

  await login(page, clientEmail)
  await page.goto('/app/projects/new')
  await page.getByLabel('Title').fill('Playwright hire loop project')
  await page.getByLabel('Description').fill('Need a small dashboard with auth, a Node API, and a clean hire loop.')
  await page.getByLabel('Skills (comma separated)').fill('react, node.js')
  await page.getByLabel('Budget min').fill('10000')
  await page.getByLabel('Budget max').fill('18000')
  const deadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  await page.getByLabel('Deadline').fill(deadline)
  await page.getByRole('button', { name: 'Publish' }).click()
  await page.waitForURL(/\/projects\/[a-f0-9]{24}/)
  const projectUrl = page.url()

  await logout(page)
  await login(page, freelancerEmail)
  await page.goto(projectUrl)
  await page.getByLabel('Cover letter').fill('I have shipped similar dashboards and can start this week on the brief.')
  await page.getByLabel('Bid (INR)').fill('15000')
  await page.getByLabel('Estimated days').fill('10')
  await page.getByRole('button', { name: 'Send proposal' }).click()
  await expect(page.getByText('Your proposal')).toBeVisible()

  await logout(page)
  await login(page, clientEmail)
  const id = projectUrl.split('/').pop()
  await page.goto(`/app/projects/${id}/proposals`)
  await page.getByRole('button', { name: 'Accept' }).first().click()
  await expect(page.getByText('accepted').first()).toBeVisible()

  await logout(page)
  await login(page, freelancerEmail)
  await page.goto('/app/work')
  await page.getByRole('button', { name: 'Submit work' }).click()
  await expect(page.getByText(/submitted/i).first()).toBeVisible()

  await logout(page)
  await login(page, clientEmail)
  await page.goto('/app/work')
  await page.getByRole('button', { name: 'Approve & release payment' }).click()
  await expect(page.getByText(/completed/i).first()).toBeVisible()
})
