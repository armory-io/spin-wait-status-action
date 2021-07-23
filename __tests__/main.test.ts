import {WaitUntilPipelineCompleteOrTimeout} from '../src/waitForPipeline'
import {Statuses} from '../src/main'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'

const baseUrl = 'http://test.com'
const mockUrl = `${baseUrl}/test`

const notStarted = [{status: 'NOT_STARTED', id: '123'}]
const running = [{status: 'RUNNING', id: '123'}]
const success = [{status: 'SUCCEEDED', id: '123'}]
const error = {
  data: {
    timestamp: 1627051377005,
    status: 500,
    error: 'Internal Server Error',
    message: 'timeout'
  }
}

test('wait until pipeline finish with status succeeded', async () => {
  const instance = axios.create({baseURL: baseUrl})
  const mock = new MockAdapter(instance)
  mock
    .onGet(mockUrl)
    .replyOnce(200, notStarted)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, success)
  const result = await WaitUntilPipelineCompleteOrTimeout(
    '/test',
    '123',
    1000,
    100,
    new Date(),
    instance
  )
  expect(result).toBe(Statuses.Succeded)
})

test('wait until pipeline finish with arbitrary errors', async () => {
  const instance = axios.create({baseURL: baseUrl})
  const mock = new MockAdapter(instance)
  mock
    .onGet(mockUrl)
    .replyOnce(500, error)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(500, error)
    .onGet(mockUrl)
    .replyOnce(200, running)
    .onGet(mockUrl)
    .replyOnce(200, success)
  const result = await WaitUntilPipelineCompleteOrTimeout(
    '/test',
    '123',
    1000,
    100,
    new Date(),
    instance
  )
  expect(result).toBe(Statuses.Succeded)
})

test('timeout if execution does not finish', async () => {
  const instance = axios.create({baseURL: baseUrl})
  const mock = new MockAdapter(instance)
  mock.onGet(mockUrl).reply(200, running)
  try {
    const result = await WaitUntilPipelineCompleteOrTimeout(
      '/test',
      '123',
      1000,
      100,
      new Date(),
      instance
    )
  } catch (e) {
    expect(e.message).toBe('Timeout waiting for pipeline')
  }
})
