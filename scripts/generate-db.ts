import { promises as fs } from 'node:fs'
import path, { dirname } from 'node:path'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import { generate, getDialect } from 'kysely-codegen'
import { db } from '../src/services/postgres/live/simple-db'

async function main() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  const outFile = path.join(__dirname, '../src/services/postgres/live/types.ts')
  const dialect = getDialect('postgres')

  const code: string = await generate({
    camelCase: true,
    db,
    dialect,
    outFile,
  })

  await fs.writeFile(outFile, code, 'utf-8')

  console.log(`✅ Types generated at ${outFile}`)

  await db.destroy()
}

main().catch((err) => {
  console.error(err)
  exit(1)
})
