import * as core from '@actions/core'
import axios from 'axios'
import * as https from 'https'
import {WaitUntilPipelineCompleteOrTimeout} from './waitForPipeline'

export enum Statuses {
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

export interface Execution {
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
    sleepTime
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

  try {
    const status = await WaitUntilPipelineCompleteOrTimeout(
      url,
      eventId,
      timeout,
      sleepTime,
      new Date(),
      instance
    )
    if (status !== statusExpected) {
      core.setFailed(
        `the execution with eventId:${eventId} finished with status:${status}`
      )
      return
    }
    core.info(`Execution finished with status:${status}`)
  } catch (error) {
    core.setFailed(
      `Timeout reached waiting for execution with eventId:${eventId}`
    )
  }
}

run()
