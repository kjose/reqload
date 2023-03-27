import prompts from 'prompts'

export type Headers = {
  [name: string]: string
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
  headers: Headers
  body?: string
  bodyParams?: BodyParam[]
  nbPerSecond: number
  nbSeconds: number
  timeout_ms: number
}

const DEFAULT_NB_PER_SECOND = 100
const DEFAULT_NB_SECONDS = 5
const DEFAULT_TIMEOUT_MS = 1000

const promptBase = async (): Promise<{
  url: string
  method: string
}> => {
  return await prompts([
    {
      type: 'text',
      name: 'url',
      message: 'Enter the url you want to request.',
      initial: 'https://www.example.com',
    },
    {
      type: 'select',
      name: 'method',
      message: 'Chose the method.',
      choices: [
        { title: 'GET', description: 'GET method', value: 'GET' },
        { title: 'POST', description: 'POST method' },
      ],
    },
  ])
}

const promptHeaders = async (headers: Headers): Promise<void> => {
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
        name: 'name',
        message: 'Name of the header (ex: Authorization)',
        initial: 'Authorization',
      },
      {
        type: 'text',
        name: 'value',
        message: 'Value of the header',
        initial: 'Bearer xxxxxxxxxx',
      },
    ])
    headers[headerResponse.name] = headerResponse.value

    await promptHeaders(headers)
  }
}

const promptBody = async (cmd: CommandData): Promise<void> => {
  const bodyCheckResponse = await prompts({
    type: 'confirm',
    name: 'needsBody',
    message: 'Do you want to add a body to your request ?',
    initial: ['POST', 'PUT', 'PATCH'].includes(cmd.method) ? true : false,
  })

  if (bodyCheckResponse.needsBody) {
    const headerResponse = await prompts({
      type: 'text',
      name: 'body',
      message:
        'Copy the body of the request here.\nIf you want dynamic parameters like random strings or increment integer, use the {{myParam}} syntax, they will be configured after.',
      initial: '{"foo": "{{bar}}"}',
    })
    cmd.body = headerResponse.body

    const bodyParams = [...headerResponse.body.match(/{{\w+}}/g)]

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

const promptFinal = async (): Promise<{
  nbPerSecond: number
  nbSeconds: number
  timeoutMs: number
}> => {
  return await prompts([
    {
      type: 'number',
      name: 'nbPerSecond',
      message: 'Enter the number of requests per second.',
      initial: DEFAULT_NB_PER_SECOND,
      validate: (value) =>
        value < 0 || value > 1000
          ? `Should be a positive number, maximum 1000`
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
    {
      type: 'number',
      name: 'timeoutMs',
      message: 'Enter the timeout (millisecond) for each request execution.',
      initial: DEFAULT_TIMEOUT_MS,
      validate: (value) => (value < 0 ? `Should be a positive number` : true),
    },
  ])
}

export const cli = async (): Promise<CommandData> => {
  const cmd: CommandData = {
    method: '',
    url: '',
    headers: {},
    bodyParams: [],
    nbPerSecond: DEFAULT_NB_PER_SECOND,
    nbSeconds: DEFAULT_NB_SECONDS,
    timeout_ms: DEFAULT_TIMEOUT_MS,
  }

  const baseResponse = await promptBase()
  cmd.url = baseResponse.url
  cmd.method = baseResponse.method

  await promptHeaders(cmd.headers)

  await promptBody(cmd)

  const finalResponse = await promptFinal()

  cmd.nbPerSecond = finalResponse.nbPerSecond
  cmd.nbSeconds = finalResponse.nbSeconds
  cmd.timeout_ms = finalResponse.timeoutMs

  return cmd
}
