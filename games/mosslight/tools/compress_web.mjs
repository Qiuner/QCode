import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { promisify } from 'node:util'
import { gzip, brotliCompress, constants } from 'node:zlib'

const root = process.argv[2]
if (!root) throw new Error('Expected the Web export directory')
for (const name of await readdir(root)) {
  if (!['.js', '.wasm', '.pck'].includes(extname(name))) continue
  const data = await readFile(join(root, name))
  const compressed = await promisify(brotliCompress)(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 5 },
  })
  await writeFile(join(root, `${name}.br`), compressed)
  await writeFile(join(root, `${name}.gz`), await promisify(gzip)(data, { level: 6 }))
  console.log(`${name}: ${data.byteLength} -> ${compressed.byteLength} bytes (br)`)
}
