import {Execution, Statuses} from './main'
import {AxiosInstance} from 'axios'
import * as core from '@actions/core'

export async function waitUntilPipelineCompleteOrTimeout(
  url: string,
  eventId: string,
  timeout: number,
  sleep: number,
  initialTime: Date,
  client: AxiosInstance
): Promise<string> {
  if (new Date().getTime() - initialTime.getTime() <= timeout) {
    try {
      const response = await client.get<Execution[]>(url, {
        params: {eventId, size: 1}
      })
      if (
        response.data.length !== 0 &&
        isPipelineCompleted(response.data[0].status)
      ) {
        return Promise.resolve(response.data[0].status)
      }
      core.info(`got execution status: ${JSON.stringify(response)}`)
      await delay(sleep)
      return waitUntilPipelineCompleteOrTimeout(
        url,
        eventId,
        timeout,
        sleep,
        initialTime,
        client
      )
    } catch (error) {
      core.warning(`got spinnaker error: ${JSON.stringify(error)}`)
      await delay(sleep)
      return waitUntilPipelineCompleteOrTimeout(
        url,
        eventId,
        timeout,
        sleep,
        initialTime,
        client
      )
    }
  } else {
    throw new Error('Timeout waiting for pipeline')
  }
}

function isPipelineCompleted(status: string): boolean {
  switch (status) {
    case Statuses.Succeeded:
    case Statuses.Terminal:
    case Statuses.Canceled:
    case Statuses.Stopped:
      return true
  }
  return false
}

const delay = async (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
