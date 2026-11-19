import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const bundle = await build({entryPoints:['src/services/pagination.ts'],bundle:true,write:false,platform:'node',format:'esm'})
const {fetchAllPages,fetchIdBatches}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`)
test('follows pagination even when a source page has no surviving books', async()=>{
  const calls=[]
  const result=await fetchAllPages(async(page,size)=>{calls.push([page,size]);return {data:page===1?[]:[page],headers:{'x-has-more':String(page<2)}}})
  assert.deepEqual(result,[0,2]);assert.deepEqual(calls,[[0,100],[1,100],[2,100]])
})
test('failed pages propagate rather than returning incomplete collections',async()=>{
  await assert.rejects(fetchAllPages(async(page)=>{if(page===1)throw Error('offline');return {data:[1],headers:{'x-has-more':'true'}}}),/offline/)
})
test('deduplicates and bounds ID batches and skips empty input',async()=>{
  const ids=Array.from({length:1001},(_,i)=>String(i));const sizes=[]
  const result=await fetchIdBatches([...ids,...ids],async part=>{sizes.push(part.length);return part})
  assert.deepEqual(result,ids);assert.deepEqual(sizes,[500,500,1])
  assert.deepEqual(await fetchIdBatches([],async()=>{throw Error('must not call')}),[])
})
