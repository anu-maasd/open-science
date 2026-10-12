import {readFile,writeFile} from 'node:fs/promises'
const paths=['src/main/session-package/fork.test.ts','src/main/session-package/literature.test.ts','src/main/session-package/service.test.ts']
for(const path of paths){
  let text=await readFile(path,'utf8')
  text=text.replace(/import \{ ([^}]+) \} from 'vitest'/,(_match,names)=>"import { beforeEach, "+names+" } from 'vitest'")
  const index=text.indexOf("const fixtures:")
  if(index<0)throw Error('Missing fixture marker '+path)
  const diagnostic="\nbeforeEach(() => {\n  for (const method of ['exportTo','importFrom','fork'] as const) {\n    const original = SessionPackageService.prototype[method]\n    vi.spyOn(SessionPackageService.prototype, method).mockImplementation(function (...args) {\n      const started = performance.now()\n      console.info('[CI-DIAG] begin', method)\n      return Reflect.apply(original, this, args).finally(() => {\n        console.info('[CI-DIAG] end', method, Math.round(performance.now()-started))\n      })\n    })\n  }\n})\n"
  text=text.slice(0,index)+diagnostic+text.slice(index)
  await writeFile(path,text)
}
const path='src/main/artifacts/provenance-test-fixtures.ts'
let fixture=await readFile(path,'utf8')
fixture=fixture.replace("  const storageRoot = await mkdtemp", "  const started = performance.now()\n  console.info('[CI-DIAG] fixture begin')\n  const storageRoot = await mkdtemp")
fixture=fixture.replace("  const compatibilityRepository =", "  console.info('[CI-DIAG] fixture ready', Math.round(performance.now()-started))\n  const compatibilityRepository =")
await writeFile(path,fixture)
