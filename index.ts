import { execa } from "execa"
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import * as url from 'url';
import env from 'env-var'
import log from 'barelog'

export type ApplicationName = 'map-app'|'gateway'|'backend'
export type UsernameString = `testuser-${number}`

const USER_COUNT = env.get('USER_COUNT').required().asIntPositive()
const APP_TYPE = env.get('APP_TYPE').required().asEnum(['map-app','gateway','backend'])
const CLUSTER = env.get('CLUSTER').required().asString()

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

async function main () {
  for (let i = 0; i < USER_COUNT; i++) {
    const user: UsernameString = `testuser-${i}`
    const delayMs = Math.round(Math.random() * 60000)

    log(`${user} will create the ${APP_TYPE} in ${delayMs / 1000} seconds...`)

    ;(function (user: UsernameString) {
      delay(delayMs)
        .then(() => {
          log(`${user} applying GitOps resources for ${APP_TYPE}`)
          applyApplicationTypeForUser(APP_TYPE, user)
        })
        .catch((e) => {
          log('error deploying application', e)
        })
    })(user)
  }
}

function delay (millis: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), millis)
  })
}

async function applyApplicationTypeForUser (app: ApplicationName, user: UsernameString) {
  const userPath = join('/tmp', user)

  if (!existsSync(userPath)) {
    mkdirSync(userPath)
  }

  const files = readdirSync(join(__dirname, 'applications'))
  
  const applications = files
    .filter(f => f.startsWith(APP_TYPE))
    .map((f) => {
      const yaml = readFileSync(join(__dirname, 'applications', f), 'utf-8')
        .replace(/\{\{username\}\}/ig, user)
        .replace(/\{\{cluster\}\}/ig, CLUSTER)
      const yamlPath = join('/tmp', user, f)

      writeFileSync(join('/tmp', user, f), yaml)

      return yamlPath
    })

  // Create args for oc, i.e "apply -f $A -f $B"
  const args = applications.reduce<string[]>((prev, cur) => {
    prev.push('-f', cur)
    return prev
  }, ['apply'])

  // Appened the GitOps namespace to args
  args.push('-n', 'janus-argocd')

  log(`${user} applying the following resources via oc:`, args)

  try {
    // Execute the oc apply command 
    const { stdout } = await execa('oc', args)
    log(`${user} apply success`, stdout)
  } catch (e) {
    log(`${user} apply error`, e)
  }
}

main()