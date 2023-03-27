import { cli, CommandData } from './cli'
import { process as processCLI } from './process'

const run = async (): Promise<void> => {
  try {
    const cmd: CommandData = await cli()
    await processCLI(cmd)
    console.error('END')
    process.exit()
  } catch (e) {
    console.error('An error occurred while processing...')
    process.exit(1)
  }
}

run()
