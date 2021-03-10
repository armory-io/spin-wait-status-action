<p align="center">
  <a href="https://github.com/armory-io/spin-wait-status-action/actions"><img alt="typescript-action status" src="https://github.com/armory-io/spin-wait-status-action/workflows/build-test/badge.svg"></a>
</p>

# Wait for Execution Status

This action allows you to check the Execution Status of a pipeline in Spinnaker based on eventId.

This action uses the x509 endpoint for Spinnaker, so it expects to have it configured in Spinnaker.

Under de hook, the action stays in loop checking for the status expected in the execution using the eventId, the action 
send a failure when the timeout is reached or an error if throw by the http call.

## Usage

Add the following entry to your Github workflow YAML file with the required inputs: 

```yaml
uses: armory-io/trigger-pipeline-action@v1
with:
  baseUrl: 'http://examplebaseUrl'
  application: 'example-app'
  eventId: 'eventId to search'
  crtFile: 'client.crt to auth'
  keyFile: 'client.key to auth'
  passphrase: 'passphrase to auth'
```
### Required Inputs
The following inputs are required to use this action:

| Input | Description |
| --- | --- |
| `baseUrl` | Specifies the Spinnaker base url of Spinnaker (the x509 endpoint with port). |
| `application` | Specifies the application to search executions. |
| `eventId` | Specifies the eventId to search execution. |
| `crtFile` | Specifies client.crt to auth. |
| `keyFile` | Specifies client.key to auth. |
| `passphrase` | Specifies passphrase to auth. |

## Default Inputs
The following inputs has a default value to use this action:

| Input | Description | Default |
| --- | --- | --- |
| `statusExpected` | Execution status expected. | SUCCEEDED |
| `interval` | Interval to check status. | 5000 ms |
| `timeout` | Timeout to exit execution. | 1800000 ms (30 min) |

## Build and Test this Action Locally

1. Install the dependencies: 

```bash
$ npm install
```

2. Build the typescript and package it for distribution: 

```bash
$ npm run build && npm run package
```

3. Run the tests:

```bash
$ npm test

 PASS  ./index.test.js

...
```