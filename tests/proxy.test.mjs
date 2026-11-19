import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, get } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, copyFile, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import vm from 'node:vm'

// Exercise the real server.js with the same CommonJS package and locked modules as the image.
test('proxy serves the app and forwards each microservice and OTLP path', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'myreadings-proxy-'))
  const backends = []
  let child
  try {
    const realm = 'demo\";throw new Error(\"unsafe config\");//'
    const env = { ...process.env, KEYCLOAK_REALM: realm, KC_ROUTE_NAME: 'demo-keycloak' }
    for (const name of ['USER', 'CATALOG', 'READINGLIST', 'REVIEW', 'APP', 'OTEL_COLLECTOR']) {
      const server = createServer((req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ service: name, path: req.url, authorization: req.headers.authorization }))
      })
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
      backends.push(server)
      env[name === 'OTEL_COLLECTOR' ? 'OTEL_COLLECTOR_URL' : `${name}_SERVICE_URL`] = `http://127.0.0.1:${server.address().port}`
    }
    const reservation = createServer()
    await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve))
    env.PORT = String(reservation.address().port)
    await new Promise(resolve => reservation.close(resolve))
    await copyFile('server.js', join(directory, 'server.js'))
    await copyFile('cover-cache.cjs', join(directory, 'cover-cache.cjs'))
    await copyFile('runtime/package.json', join(directory, 'package.json'))
    await symlink(resolve('runtime/node_modules'), join(directory, 'node_modules'))
    await mkdir(join(directory, 'public'))
    await writeFile(join(directory, 'public/index.html'), '<main>MyReadings</main>')
    child = spawn(process.execPath, ['server.js'], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] })
    let logs = ''
    child.stdout.on('data', chunk => { logs += chunk })
    child.stderr.on('data', chunk => { logs += chunk })
    const base = `http://127.0.0.1:${env.PORT}`
    let ready = false
    for (let n = 0; n < 50; n++) {
      assert.equal(child.exitCode, null, logs)
      try { ready = (await fetch(`${base}/healthz`)).ok } catch {}
      if (ready) break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    assert.ok(ready, logs)
    assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { status: 'UP' })
    for (const [path, service] of [['users', 'USER'], ['books', 'CATALOG'], ['readinglists', 'READINGLIST'], ['reviews', 'REVIEW']]) {
      const result = await (await fetch(`${base}/api/v1/${path}?page=1`, { headers: { authorization: 'Bearer demo-token' } })).json()
      assert.deepEqual(result, { service, path: `/api/v1/${path}?page=1`, authorization: 'Bearer demo-token' })
    }
    assert.equal((await fetch(`${base}/api/internal/users/batch`, { method: 'POST', body: '[]' })).status, 404)
    assert.equal((await fetch(`${base}/api/internal/books/demo`)).status, 404)
    const otlp = await (await fetch(`${base}/otlp/v1/traces`, { method: 'POST', body: '{}' })).json()
    assert.equal(otlp.service, 'OTEL_COLLECTOR')
    assert.equal(otlp.path, '/v1/traces')
    assert.match(await (await fetch(`${base}/collections`)).text(), /MyReadings/)
    const script = await new Promise((resolve, reject) => {
      get(`${base}/config.js`, { headers: { host: 'myreadings.apps.example.test' } }, response => {
        let body = ''
        response.on('data', chunk => { body += chunk })
        response.on('end', () => resolve(body))
      }).on('error', reject)
    })
    const context = { window: {} }
    vm.runInNewContext(script, context)
    assert.equal(context.window.__APP_CONFIG__.VITE_COVER_BASE_URL, '/covers')
    assert.equal(context.window.__APP_CONFIG__.VITE_VUE_APP_KEYCLOAK_REALM, realm)
    assert.equal(context.window.__APP_CONFIG__.VITE_VUE_APP_KEYCLOAK_URL, 'https://demo-keycloak.apps.example.test/')
  } finally {
    if (child && child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve))
      child.kill()
      await exited
    }
    await Promise.all(backends.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  }
})
