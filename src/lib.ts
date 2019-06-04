import * as child_process from 'child_process'
import * as stream from 'stream'
import { Dump } from './dump'
import { Git } from './git'

/*
 lib.ts module provides a runtime access to Tortilla's API through a cluster
 to distribute the work to another core and not to block the main thread
**/

// Will call the function through the worker
const callTortillaFn = (fnName, ...args) => {
  return new Promise((resolve, reject) => {
    // Note that we use a child_process here and not a cluster since we don't wanna
    // fork the main module
    const worker = child_process.fork(__filename, [], {
      env: { ...process.env, TORTILLA_WORKER: '1' }
    })

    worker.send({
      op: 'exec',
      fn: fnName,
      args,
    })

    // On result
    worker.on('message', (msg: any) => {
      if (typeof msg !== 'object') { return }
      if (msg.op !== 'result') { return }
      if (msg.fn !== fnName) { return }

      resolve(msg.payload)
    })

    // On error
    worker.on('message', (msg: any) => {
      if (typeof msg !== 'object') { return }
      if (msg.op !== 'error') { return }
      if (msg.fn !== fnName) { return }

      reject(msg.payload)
    })
  })
}

// Helper function that will simulate a registered user in the git.config
const withUser = (fn) => (...args) => {
  let result = ''
  let nameExists = false
  let emailExists = false

  // Upcoming method requires user.name and user.email to be set
  try {
    // If invocation was successful it means name exists
    try {
      Git(['config', '--global', 'user.name'])
      nameExists = true
    } catch (e) {
      Git(['config', '--global', 'user.name', 'tortilla'])
    }

    // If invocation was successful it means email exists
    try {
      Git(['config', '--global', 'user.email'])
      emailExists = true
    } catch (e) {
      Git(['config', '--global', 'user.email', 'tortilla@tortilla.academy'])
    }

    result = fn(...args)
  }
  finally {
    if (!nameExists) {
      Git(['config', '--global', '--unset', 'user.name'])
    }

    if (!emailExists) {
      Git(['config', '--global', '--unset', 'user.email'])
    }
  }

  return result
}

export const diffReleases = withUser((dump: object, srcRelease: string, destRelease: string) => {
  return Dump.diffReleases(dump, srcRelease, destRelease)
})

// In worker
if (!process.env.TORTILLA_WORKER) {
  // Listen for signals
  process.on('message', (msg: any) => {
    if (msg.op !== 'exec') { return }

    let handler

    switch (msg.fn) {
      case 'diffReleases': {
        handler = diffReleases; break
      }
      // Escape if function name is not supported
      default: return
    }

    try {
      const result = handler(...msg.args)

      process.send({
        op: 'result',
        fn: msg.fn,
        id: msg.id,
        payload: result,
      })
    }
    catch (e) {
      process.send({
        op: 'error',
        fn: msg.fn,
        id: msg.id,
        payload: e,
      })
    }
  })
}
