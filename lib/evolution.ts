const BASE  = process.env.EVOLUTION_API_URL!
const TOKEN = process.env.EVOLUTION_API_GLOBAL_TOKEN!

async function evolutionFetch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', apikey: TOKEN },
    body:    JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Evolution API error: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function sendText(instance: string, phone: string, text: string) {
  return evolutionFetch(`/message/sendText/${instance}`, {
    number: phone,
    options: { delay: 1200, presence: 'composing' },
    textMessage: { text },
  })
}

export async function sendMedia(
  instance: string,
  phone: string,
  mediaUrl: string,
  caption?: string
) {
  return evolutionFetch(`/message/sendMedia/${instance}`, {
    number: phone,
    mediaMessage: { mediatype: 'image', media: mediaUrl, caption },
  })
}

export async function createInstance(instanceName: string, webhookUrl: string) {
  return evolutionFetch('/instance/create', {
    instanceName,
    qrcode: true,
    webhook: webhookUrl,
    webhookByEvents: true,
    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'],
  })
}

export async function getConnectionStatus(instance: string) {
  const res = await fetch(`${BASE}/instance/connectionState/${instance}`, {
    headers: { apikey: TOKEN },
  })
  if (!res.ok) throw new Error(`Evolution API error: ${res.status}`)
  return res.json()
}
