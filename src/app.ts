import { cli, CommandData } from './cli'
import { process as processCLI } from './process'

cli()
  .then((cmd: CommandData) => {
    processCLI(cmd)
      .then(() => {
        console.error('END')
        process.exit()
      })
      .catch((e) => {
        console.error('An error occurred while processing...')
        process.exit(1)
      })
  })
  .catch((e: Error) => {
    throw new Error(`Cli input error : ${e}`)
  })
