import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.SERVER_PORT || 8787)
const apiKey = process.env.OPENAI_API_KEY?.trim()
const defaultModel =
  process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini'

app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    openaiConfigured: Boolean(apiKey),
  })
})

app.post('/api/openai/chat', async (req, res) => {
  if (!apiKey) {
    return res.status(503).json({
      error: {
        message:
          'OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.',
      },
    })
  }

  try {
    const payload = {
      ...req.body,
      model: req.body?.model || defaultModel,
    }

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      },
    )

    const data = await response.json().catch(() => ({
      error: {
        message:
          'OpenAI 응답을 JSON 형식으로 해석하지 못했습니다.',
      },
    }))

    return res.status(response.status).json(data)
  } catch (error) {
    console.error('OpenAI proxy error:', error)

    return res.status(500).json({
      error: {
        message:
          '챗봇 서버에서 OpenAI 요청을 처리하지 못했습니다.',
      },
    })
  }
})

const __dirname = path.dirname(
  fileURLToPath(import.meta.url),
)

const distPath = path.resolve(__dirname, '../dist')

app.use(express.static(distPath))

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next()
  }

  return res.sendFile(
    path.join(distPath, 'index.html'),
  )
})

app.use((req, res) => {
  res.status(404).json({
    error: {
      message: '요청한 API 경로를 찾을 수 없습니다.',
    },
  })
})

app.listen(port, () => {
  console.log(
    `YOGIU API server: http://localhost:${port}`,
  )
  console.log(
    `OpenAI configured: ${Boolean(apiKey)}`,
  )
})