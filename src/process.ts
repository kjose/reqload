import { CommandData } from './cli'
import https, { RequestOptions } from 'https'
import url from 'node:url'

type DataSet = {
  error: number
  [statusCode: string]: number
}

export const process = async (cmd: CommandData): Promise<void> => {
  const urlParts = url.parse(cmd.url)
  const params = {
    hostname: urlParts.hostname!,
    port: urlParts.port ?? urlParts.protocol === 'https:' ? 443 : 80,
    method: cmd.method,
    path: urlParts.path,
    timeout: 1000,
  }

  const dataset: DataSet = {
    error: 0,
  }
  const requestPromises: Promise<void>[] = []

  console.log(`Sending ${cmd.nbPerSecond} requests each seconds ...`)
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
    console.log(`${nbSecondsLeft} seconds left`)
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
    req.end()
  })
}
