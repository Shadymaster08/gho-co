const PRINTFUL_BASE = 'https://api.printful.com'

export async function printfulGet(path: string) {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.result ?? `Printful error: ${res.status}`)
  }
  return res.json()
}

export async function printfulPost(path: string, body: unknown) {
  const res = await fetch(`${PRINTFUL_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.result ?? `Printful POST failed: ${res.status}`)
  }
  return res.json()
}
