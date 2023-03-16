import { cli, CommandData } from './cli'
import { process } from './process'

cli()
  .then((cmd: CommandData) => {
    process(cmd).catch((e) => {
      console.error('An error occurred while processing...')
    })
  })
  .catch((e: Error) => {
    throw new Error(`Cli input error : ${e}`)
  })
