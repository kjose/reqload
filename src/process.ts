import { CommandData } from './cli'
import https, { RequestOptions } from 'https'
import url from 'node:url'

type DataSet = {
  [statusCode: number]: number
}

export const process = async (cmd: CommandData): Promise<null> => {
  const urlParts = url.parse(cmd.url)
  const params = {
    hostname: urlParts.hostname!,
    port: urlParts.port ?? urlParts.protocol === 'https:' ? 443 : 80,
    method: cmd.method,
    path: urlParts.path,
    timeout: 1000,
  }

  const dataset: DataSet = {}
  const requestPromises: Promise<void>[] = []

  await makePaquetRequestPaquet(cmd.nbSeconds, requestPromises, params, dataset)

  try {
    await Promise.all(requestPromises)
  } catch (e) {
    return Promise.reject(e)
  }

  console.log(dataset)

  return null
}

const makePaquetRequestPaquet = (
  nbSecondsLeft: number,
  requestPromises: Promise<void>[],
  params: RequestOptions,
  dataset: DataSet,
  rootResolve?: (value: void | PromiseLike<void>) => void
): Promise<void> => {
  return new Promise((resolve) => {
    for (let i = 0; i < 10; i++) {
      requestPromises.push(makeRequest(params, dataset))
    }

    nbSecondsLeft--
    console.log(`${nbSecondsLeft} seconds left ...`)
    if (nbSecondsLeft > 0) {
      setTimeout(async () => {
        await makePaquetRequestPaquet(
          nbSecondsLeft,
          requestPromises,
          params,
          dataset,
          rootResolve || resolve
        )
      }, 1000)
    } else if (rootResolve) {
      rootResolve()
    }
  })
}

const makeRequest = (
  params: RequestOptions,
  dataset: DataSet
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const req = https.request(params, (res) => {
      const statusCode = res.statusCode ?? 0
      if (!dataset[statusCode]) {
        dataset[statusCode] = 0
      }
      dataset[statusCode] += 1
      resolve()
    })
    req.on('error', (e) => {
      const msg = 'error in http request'
      reject(e)
    })
    req.end()
  })
}
