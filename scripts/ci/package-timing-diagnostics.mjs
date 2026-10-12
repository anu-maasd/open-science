import {readFile,writeFile} from 'node:fs/promises'
const paths=['src/main/session-package/fork.test.ts','src/main/session-package/literature.test.ts','src/main/session-package/service.test.ts']
for(const path of paths){
  let text="import { defaultFileDurability as diagnosticDurability } from '../storage/file-durability'\n"+await readFile(path,'utf8')
  text=text.replace(/import \{ ([^}]+) \} from 'vitest'/,(_match,names)=>"import { beforeEach, "+names+" } from 'vitest'")
  const index=text.indexOf("const fixtures:")
  if(index<0)throw Error('Missing fixture marker '+path)
  const diagnostic="\nbeforeEach(() => {\n  for (const method of ['syncFile','syncDirectory'] as const) {\n    const original = diagnosticDurability[method]\n    vi.spyOn(diagnosticDurability, method).mockImplementation(async (...args) => {\n      const started = performance.now()\n      try { return await Reflect.apply(original, diagnosticDurability, args) }\n      finally {\n        const elapsed = Math.round(performance.now()-started)\n        if (elapsed > 100) console.info('[CI-DIAG] slow durability', method, elapsed)\n      }\n    })\n  }\n  for (const method of ['exportTo','importFrom','fork'] as const) {\n    const original = SessionPackageService.prototype[method]\n    vi.spyOn(SessionPackageService.prototype, method).mockImplementation(function (...args) {\n      const started = performance.now()\n      console.info('[CI-DIAG] begin', method)\n      return Reflect.apply(original, this, args).finally(() => {\n        console.info('[CI-DIAG] end', method, Math.round(performance.now()-started))\n      })\n    })\n  }\n})\n"
  text=text.slice(0,index)+diagnostic+text.slice(index)
  await writeFile(path,text)
}
const path='src/main/artifacts/provenance-test-fixtures.ts'
let fixture=await readFile(path,'utf8')
fixture=fixture.replace("  const storageRoot = await mkdtemp", "  const started = performance.now()\n  console.info('[CI-DIAG] fixture begin')\n  const storageRoot = await mkdtemp")
fixture=fixture.replace("  const compatibilityRepository =", "  console.info('[CI-DIAG] fixture ready', Math.round(performance.now()-started))\n  const compatibilityRepository =")
fixture=fixture.replace("  const client = createProjectDbClient(storageRoot)", "  const client = createProjectDbClient(storageRoot)\n  client.$on('query', (event) => { if(event.duration > 100) console.info('[CI-DIAG] slow query', event.duration, event.query.split(/\\s+/)[0]) })")
await writeFile(path,fixture)
const clientPath='src/main/projects/prisma-client.ts'
let clientSource=await readFile(clientPath,'utf8')
clientSource=clientSource.replace("  return new PrismaClient({", "  return new PrismaClient({\n    log: [{ emit: 'event', level: 'query' }],")
await writeFile(clientPath,clientSource)
