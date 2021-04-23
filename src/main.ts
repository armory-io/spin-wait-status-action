import * as core from '@actions/core'
import axios from 'axios'
import * as https from 'https'

enum Statuses {
  NotStarted = 'NOT_STARTED',
  Running = 'RUNNING',
  Paused = 'PAUSED',
  Suspended = 'SUSPENDED',
  Succeded = 'SUCCEEDED',
  FailedContinue = 'FAILED_CONTINUE',
  Terminal = 'TERMINAL',
  Canceled = 'CANCELED',
  Redirect = 'REDIRECT',
  Stopped = 'STOPPED',
  Skipped = 'SKIPPED',
  Buffered = 'BUFFERED'
}

interface Execution {
  status: string
  id: string
}

const run = async (): Promise<void> => {
  let statusExpected: Statuses,
    eventId,
    baseURL,
    url,
    certInput,
    keyInput,
    timeout,
    sleepTime,
    maxInitialRetry
  try {
    statusExpected = core.getInput('statusExpected') as Statuses
    eventId = core.getInput('eventId', {required: true})
    baseURL = core.getInput('baseUrl', {required: true})
    url = `/applications/${core.getInput('application', {
      required: true
    })}/executions/search`
    certInput = core.getInput('crtFile', {required: true})
    keyInput = core.getInput('keyFile', {required: true})
    timeout = +core.getInput('timeout')
    sleepTime = +core.getInput('interval')
    maxInitialRetry = +core.getInput('initialWaitCount')
  } catch (error) {
    core.setFailed(error.message)
    return
  }

  if (!Object.values(Statuses).includes(statusExpected)) {
    core.setFailed(`Invalid execution status :${statusExpected}`)
    return
  }

  let cert, key

  if (core.getInput('isEncoded')) {
    const certBuff = Buffer.from(certInput, 'base64')
    cert = certBuff.toString('utf-8').replace(/\\n/gm, '\n')

    const keyBuff = Buffer.from(keyInput, 'base64')
    key = keyBuff.toString('utf-8').replace(/\\n/gm, '\n')
  } else {
    cert = certInput.replace(/\\n/gm, '\n')
    key = keyInput.replace(/\\n/gm, '\n')
  }

  const instanceConfig = {
    baseURL,
    httpsAgent: new https.Agent({
      cert,
      key,
      passphrase: core.getInput('passphrase'),
      rejectUnauthorized: false
    })
  }

  const instance = axios.create(instanceConfig)

  const startTime = new Date()
  const timeoutTime = new Date(Date.now() + timeout)

  core.info(`current time ${startTime}, timeout time ${timeoutTime}`)

  const loop = true
  let initialWaitCount = 0
  while (loop) {
    try {
      const response = await instance.get<Execution[]>(url, {params: {eventId}})
      if (response.data.length === 0) {
        if (initialWaitCount >= maxInitialRetry) {
          core.setFailed(
            `Spinnaker execution not found for eventId:${eventId} after ${maxInitialRetry} retries`
          )
          return
        } else {
          initialWaitCount++
          core.info(`the execution is still not available, retrying...`)
        }
      } else {
        core.info(
          `Got Execution status ${response.data[0].status} from eventId=${eventId}`
        )
        if (response.data[0].status === statusExpected) {
          return
        }

        if (
          response.data[0].status === Statuses.Terminal ||
          response.data[0].status === Statuses.Canceled ||
          response.data[0].status === Statuses.Stopped
        ) {
          core.setFailed(
            `the execution:${response.data[0].id} finished with status:${response.data[0].status}`
          )
          return
        }
      }
    } catch (error) {
      if (error.response) {
        core.setFailed(
          `got error from Spinnaker, status:${error.response.status}, data: ${error.response.data}`
        )
      } else {
        core.setFailed(`got error from Spinnaker, error: ${error.message}`)
      }
      return
    }
    core.debug(`waiting ${sleepTime} ms until check status`)
    await delay(sleepTime)
    if (new Date() > timeoutTime) {
      core.setFailed(
        `Timeout reached, startTime: ${startTime}, timeout: ${timeoutTime}`
      )
      return
    }
  }
}

const delay = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

run()
