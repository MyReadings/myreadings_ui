import { test } from 'node:test'
import assert from 'node:assert/strict'
import cacheModule from '../cover-cache.cjs'
const { createCoverCache } = cacheModule
const response = value => new Response(value, { headers: { 'content-type': 'image/jpeg' } })

test('coalesces requests and serves warm covers without a network call', async () => {
  let calls=0, release
  const get=createCoverCache({fetchCover:()=>{calls++;return new Promise(resolve=>{release=resolve})}})
  const a=get('isbn','9781401263119','L'), b=get('isbn','9781401263119','L')
  release(response('cover'))
  const [first,second]=await Promise.all([a,b])
  assert.equal(first,second);assert.equal(calls,1)
  assert.equal((await get('isbn','9781401263119','L')).body.toString(),'cover')
  assert.equal(calls,1)
})
test('bounds the cache by bytes and evicts least recently used artwork',async()=>{
  let calls=0
  const get=createCoverCache({maxBytes:8,maxEntries:2,fetchCover:async()=>{calls++;return response('1234')}})
  await get('id','1','M');await get('id','2','M');await get('id','1','M')
  await get('id','3','M');await get('id','2','M')
  assert.equal(calls,4)
})
test('rejects unexpected URLs, oversized images and unavailable/non-image responses',async()=>{
  let calls=0
  const get=createCoverCache({maxImageBytes:3,fetchCover:async()=>{calls++;return response('1234')}})
  await assert.rejects(get('isbn','../../secret','L'),/Invalid/);assert.equal(calls,0)
  await assert.rejects(get('id','1','M'),/size limit/)
  const html=createCoverCache({fetchCover:async()=>new Response('<html>error</html>')})
  await assert.rejects(html('id','1','M'),/unavailable/)
})
test('failed fetches release capacity and can be retried',async()=>{
  let calls=0
  const get=createCoverCache({fetchCover:async()=>{if(calls++===0)throw Error('offline');return response('ok')}})
  await assert.rejects(get('id','1','M'),/offline/)
  assert.equal((await get('id','1','M')).body.toString(),'ok')
})
