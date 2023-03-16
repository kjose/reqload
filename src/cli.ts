import prompts from 'prompts'

export type Header = {
  name: string
  value: string
}

export enum BodyParamType {
  RANDOM_STRING,
  INCREMENT_VALUE,
}

export type BodyParam = {
  name: string
  type: BodyParamType
}

export type CommandData = {
  method: string
  url: string
  headers?: Header[]
  body?: string
  bodyParams?: BodyParam[]
  nbPerSecond: number
  nbSeconds: number
}

const DEFAULT_NB_PER_SECOND = 100
const DEFAULT_NB_SECONDS = 5

export const cli = async (): Promise<CommandData> => {
  const cmd: CommandData = {
    method: '',
    url: '',
    headers: [],
    bodyParams: [],
    nbPerSecond: DEFAULT_NB_PER_SECOND,
    nbSeconds: DEFAULT_NB_SECONDS,
  }

  const baseResponse = await prompts([
    {
      type: 'text',
      name: 'url',
      message: 'Enter the url you want to request.',
      initial: 'https://www.kevinjose.fr',
    },
    {
      type: 'select',
      name: 'method',
      message: 'Chose the method.',
      choices: [
        { title: 'GET', description: 'GET method', value: 'GET' },
        { title: 'POST', description: 'POST method', value: 'POST' },
        { title: 'PUT', description: 'PUT method', value: 'PUT' },
      ],
      initial: 0,
    },
  ])
  cmd.url = baseResponse.url
  cmd.method = baseResponse.method

  // Add Headers section
  const addHeader = async () => {
    const headerCheckResponse = await prompts({
      type: 'confirm',
      name: 'needsHeader',
      message: 'Do you want to add a header ?',
      initial: false,
    })

    if (headerCheckResponse.needsHeader) {
      const headerResponse = await prompts([
        {
          type: 'text',
          name: 'toto',
          message: 'Name of the header (ex: Authorization)',
        },
        {
          type: 'text',
          name: 'value',
          message: 'Value of the header',
        },
      ])
      cmd.headers?.push({
        name: headerResponse.toto,
        value: headerResponse.value,
      })

      await addHeader()
    }
  }
  await addHeader()

  // Add body section
  const addBody = async () => {
    const bodyCheckResponse = await prompts({
      type: 'confirm',
      name: 'needsBody',
      message: 'Do you want to add a body to your request ?',
      initial: false,
    })

    if (bodyCheckResponse.needsBody) {
      const headerResponse = await prompts({
        type: 'text',
        name: 'body',
        message:
          'Copy the body of the request here.\nIf you want dynamic parameters like random strings, integers or increment integer, use the {{myParam}} syntax, they will be configured after.',
        initial: false,
      })
      cmd.body = headerResponse.body

      const bodyParams = headerResponse.body.match(/{{\w+}}/)

      for (let i = 0; i < bodyParams.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        const dynamicParamResponse = await prompts({
          type: 'select',
          name: 'type',
          message: `What is the type of the dynamic parameter : ${bodyParams[i]}`,
          choices: [
            {
              title: 'Increment value',
              description: 'Generates an integer incremented at each call',
              value: BodyParamType.INCREMENT_VALUE,
            },
            {
              title: 'Random string',
              description: 'Generates a random string',
              value: BodyParamType.RANDOM_STRING,
            },
          ],
        })
        cmd.bodyParams?.push({
          name: bodyParams[i],
          type: dynamicParamResponse.type,
        })
      }
    }
  }
  await addBody()

  const finalResponse = await prompts([
    {
      type: 'number',
      name: 'nbPerSecond',
      message: 'Enter the number of requests per second.',
      initial: DEFAULT_NB_PER_SECOND,
      validate: (value) =>
        value < 0 || value > 100
          ? `Should be a positive number, maximum 100`
          : true,
    },
    {
      type: 'number',
      name: 'nbSeconds',
      message: 'Enter the number of seconds of execution (max: 30).',
      initial: DEFAULT_NB_SECONDS,
      validate: (value) =>
        value < 0 || value > 30
          ? `Should be a positive number, maximum 30`
          : true,
    },
  ])
  cmd.nbPerSecond = finalResponse.nbPerSecond
  cmd.nbSeconds = finalResponse.nbSeconds

  return cmd
}
