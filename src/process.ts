import { CommandData } from './cli'
import https, { RequestOptions } from 'https'
import url from 'node:url'
import { BodyParam, BodyParamType } from './cli'
import crypto from 'crypto'

type DataSet = {
  error: number
  [statusCode: string]: number
}

// increment value at each request
let dynamicParamIncrement = 1

export const process = async (cmd: CommandData): Promise<void> => {
  const urlParts = url.parse(cmd.url)
  const params = {
    hostname: urlParts.hostname!,
    port: urlParts.port ?? urlParts.protocol === 'https:' ? 443 : 80,
    method: cmd.method,
    path: urlParts.path,
    headers: cmd.headers,
    timeout: cmd.timeout_ms,
  }

  const dataset: DataSet = {
    error: 0,
  }
  const requestPromises: Promise<void>[] = []

  console.log(`Sending ${cmd.nbPerSecond} requests each second ...`)
  await makePaquetRequestPaquet(
    cmd,
    cmd.nbSeconds,
    requestPromises,
    params,
    dataset
  )

  console.log('Processing all requests ...')
  await Promise.all(requestPromises)

  console.log(dataset)

  return Promise.resolve()
}

const makePaquetRequestPaquet = (
  cmd: CommandData,
  nbSecondsLeft: number,
  requestPromises: Promise<void>[],
  params: RequestOptions,
  dataset: DataSet,
  rootResolve?: (value: void | PromiseLike<void>) => void
): Promise<void> => {
  return new Promise((resolve) => {
    rootResolve = rootResolve || resolve

    for (let i = 0; i < cmd.nbPerSecond; i++) {
      requestPromises.push(makeRequest(cmd, params, dataset))
    }

    nbSecondsLeft--
    console.log(`${nbSecondsLeft} second${nbSecondsLeft > 1 ? 's' : ''} left`)
    if (nbSecondsLeft > 0) {
      setTimeout(async () => {
        await makePaquetRequestPaquet(
          cmd,
          nbSecondsLeft,
          requestPromises,
          params,
          dataset,
          rootResolve
        )
      }, 1000)
    } else {
      rootResolve()
    }
  })
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
    // customise body param
    if (cmd.body) {
      let body = cmd.body
      cmd.bodyParams?.forEach(
        (param: BodyParam) =>
          (body = body.replace(param.name, generateDynamicParams(param.type)))
      )
      req.write(body)
    }
    req.end()
  })
}

const generateDynamicParams = (type: number): string => {
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
