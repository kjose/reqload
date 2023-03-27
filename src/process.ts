import { CommandData } from './cli'
import https, { RequestOptions } from 'https'
import url from 'node:url'
import { BodyParam, BodyParamType } from './cli'
import crypto from 'crypto'

type DataSet = {
  error: number
  [statusCode: string]: number
}

let dynamicParamIncrement = 1

export const process = async (cmd: CommandData): Promise<void> => {
  const params = createRequestOptions(cmd)
  const dataset: DataSet = { error: 0 }
  const requestPromises: Promise<void>[] = []

  console.log(`Sending ${cmd.nbPerSecond} requests each second ...`)
  await sendRequestBatches(cmd, requestPromises, params, dataset)

  console.log('Processing all requests ...')
  await Promise.all(requestPromises)

  console.log(dataset)

  return Promise.resolve()
}

const createRequestOptions = (cmd: CommandData): RequestOptions => {
  const urlParts = url.parse(cmd.url)
  return {
    hostname: urlParts.hostname!,
    port: urlParts.port ?? (urlParts.protocol === 'https:' ? 443 : 80),
    method: cmd.method,
    path: urlParts.path,
    headers: cmd.headers,
    timeout: cmd.timeout_ms,
  }
}

const sendRequestBatches = (
  cmd: CommandData,
  requestPromises: Promise<void>[],
  params: RequestOptions,
  dataset: DataSet
): Promise<void> => {
  return new Promise(async (resolve) => {
    for (let i = cmd.nbSeconds; i > 0; i--) {
      await sendRequests(cmd, requestPromises, params, dataset)
      console.log(`${i - 1} second${i - 1 > 1 ? 's' : ''} left`)
      if (i - 1 > 0) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
    resolve()
  })
}

const sendRequests = (
  cmd: CommandData,
  requestPromises: Promise<void>[],
  params: RequestOptions,
  dataset: DataSet
): Promise<void[]> => {
  const requests = []
  for (let i = 0; i < cmd.nbPerSecond; i++) {
    requests.push(makeRequest(cmd, params, dataset))
  }
  return Promise.all(requests)
}

const makeRequest = (
  cmd: CommandData,
  params: RequestOptions,
  dataset: DataSet
): Promise<void> => {
  return new Promise((resolve) => {
    const req = https.request(params, (res) => {
      const statusCode = res.statusCode ?? 0
      if (!dataset[statusCode]) {
        dataset[statusCode] = 0
      }
      dataset[statusCode] += 1
      resolve()
    })
    req.on('error', (e) => {
      dataset.error++
      resolve()
    })

    if (cmd.body) {
      const requestBody = customizeRequestBody(cmd)
      req.write(requestBody)
    }
    req.end()
  })
}

const customizeRequestBody = (cmd: CommandData): string => {
  if (!cmd.body) {
    throw new Error('No request body provided')
  }

  let body = cmd.body
  cmd.bodyParams?.forEach((param: BodyParam) => {
    body = body.replace(param.name, generateDynamicValue(param.type))
  })
  return body
}

const generateDynamicValue = (type: number): string => {
  switch (type) {
    case BodyParamType.INCREMENT_VALUE:
      dynamicParamIncrement++
      return String(dynamicParamIncrement)
    case BodyParamType.RANDOM_STRING:
      return crypto.randomBytes(20).toString('hex')
    default:
      throw new Error('Choose a parameter type')
  }
}
