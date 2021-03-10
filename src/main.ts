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
}

const run = async (): Promise<void> => {
  let statusExpected: Statuses,
    eventId,
    baseURL,
    url,
    cert,
    key,
    passphrase,
    timeout,
    sleepTime
  try {
    statusExpected = core.getInput('statusExpected') as Statuses
    eventId = core.getInput('eventId', {required: true})
    baseURL = core.getInput('baseUrl', {required: true})
    url = `/applications/${core.getInput('application', {
      required: true
    })}/executions/search`
    cert = core.getInput('crtFile', {required: true})
    key = core.getInput('keyFile', {required: true})
    passphrase = core.getInput('passphrase', {required: true})
    timeout = +core.getInput('timeout')
    sleepTime = +core.getInput('interval')
  } catch (error) {
    core.setFailed(error.message)
    return
  }

  if (!Object.values(Statuses).includes(statusExpected)) {
    core.setFailed(`Invalid execution status :${statusExpected}`)
    return
  }

  const instanceConfig = {
    baseURL,
    httpsAgent: new https.Agent({
      cert,
      key,
      passphrase,
      rejectUnauthorized: false
    })
  }

  const instance = axios.create(instanceConfig)

  const startTime = new Date()
  const timeoutTime = new Date(Date.now() + timeout)

  core.debug(`current time ${startTime}, timeout time ${timeoutTime}`)

  const loop = true
  while (loop) {
    try {
      const response = await instance.get<Execution[]>(url, {params: {eventId}})
      if (response.data.length === 0) {
        core.setFailed(`Spinnaker execution not found for eventId:${eventId}`)
        return
      }
      core.debug(
        `Got Execution status ${response.data[0].status} from eventId=${eventId}`
      )
      if (response.data[0].status === statusExpected) {
        return
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
