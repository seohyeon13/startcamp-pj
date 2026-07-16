import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const distPath = path.join(rootPath, 'dist')

const app = express()

const port = Number(process.env.SERVER_PORT || 5173)
const apiKey = process.env.OPENAI_API_KEY?.trim()
const defaultModel =
  process.env.OPENAI_MODEL?.trim() || 'gpt-5-mini'
const isProduction = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  return res.json({
    ok: true,
    mode: isProduction ? 'production' : 'development',
    openaiConfigured: Boolean(apiKey),
    model: defaultModel,
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

  const messages = req.body?.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: 'messages 배열이 필요합니다.',
      },
    })
  }

  try {
    const payload = {
      ...req.body,
      model: req.body?.model || defaultModel,
      messages,
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

    if (!response.ok) {
      console.error('OpenAI API error:', {
        status: response.status,
        data,
      })
    }

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

async function startServer() {
  let vite

  if (isProduction) {
    app.use(express.static(distPath))

    app.use((req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next()
      }

      return res.sendFile(
        path.join(distPath, 'index.html'),
        (error) => {
          if (error) {
            next(error)
          }
        },
      )
    })
  } else {
    const { createServer: createViteServer } =
      await import('vite')

    vite = await createViteServer({
      root: rootPath,
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    })

    app.use(vite.middlewares)
  }

  app.use('/api', (_req, res) => {
    return res.status(404).json({
      error: {
        message: '요청한 API 경로를 찾을 수 없습니다.',
      },
    })
  })

  app.use((error, _req, res, _next) => {
    console.error('Server error:', error)

    if (res.headersSent) {
      return
    }

    return res.status(500).json({
      error: {
        message: '서버 내부 오류가 발생했습니다.',
      },
    })
  })

  const server = app.listen(port, () => {
    console.log(`YOGIU 통합 서버: http://localhost:${port}`)
    console.log(
      `실행 모드: ${
        isProduction ? 'production' : 'development'
      }`,
    )
    console.log(`OpenAI configured: ${Boolean(apiKey)}`)
    console.log(`OpenAI model: ${defaultModel}`)
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `포트 ${port}가 이미 사용 중입니다. 기존 서버를 종료하거나 SERVER_PORT를 변경하세요.`,
      )
    } else {
      console.error('서버 실행 오류:', error)
    }

    process.exit(1)
  })

  const shutdown = async () => {
    console.log('\n서버를 종료합니다.')

    server.close(async () => {
      if (vite) {
        await vite.close()
      }

      process.exit(0)
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startServer().catch((error) => {
  console.error('통합 서버 실행 실패:', error)
  process.exit(1)
})