#!/bin/groovy

// properties([durabilityHint('PERFORMANCE_OPTIMIZED')]) // TODO put this in JJB?

library 'kibana-pipeline-library'

timeout(time: 180, unit: 'MINUTES') {
  timestamps {
    ansiColor('xterm') {
      parallel([
        'kibana-intake': legacyJobRunner('kibana-intake'),
        'x-pack-intake': legacyJobRunner('x-pack-intake'),
        'kibana-oss-tests-1': withWorkers('kibana-oss-tests-1', { buildOss() }, [
          getOssCiGroupWorker(1),
          getOssCiGroupWorker(2),
          getOssCiGroupWorker(3),
          getOssCiGroupWorker(4),
          getOssCiGroupWorker(5),
          getOssCiGroupWorker(6),
          getOssCiGroupWorkers(7),
        ]),
        'kibana-oss-tests-2': withWorkers('kibana-oss-tests-2', { buildOss() }, [
          getOssCiGroupWorker(8),
          getOssCiGroupWorker(9),
          getOssCiGroupWorker(10),
          getOssCiGroupWorker(11),
          getOssCiGroupWorker(12),
          getPostBuildWorker("visualRegression", { bash "./test/scripts/jenkins_visual_regression.sh" }),
          getPostBuildWorker("firefoxSmoke", { bash "./test/scripts/jenkins_firefox_smoke.sh" }),
        ]),
        'kibana-xpack-tests-1': withWorkers('kibana-xpack-tests', { buildXpack() }, [
          getXpackCiGroupWorker(1),
          getXpackCiGroupWorker(2),
          getXpackCiGroupWorker(3),
          getXpackCiGroupWorker(4),
          getXpackCiGroupWorker(5),
          getXpackCiGroupWorker(6),
        ]),
        'kibana-xpack-tests-single-2': withWorkers('kibana-xpack-tests', { buildXpack() }, [ getXpackCiGroupWorker(2) ]),
        'kibana-xpack-tests-single-6': withWorkers('kibana-xpack-tests', { buildXpack() }, [ getXpackCiGroupWorker(6) ]),
        'kibana-xpack-tests-2': withWorkers('kibana-xpack-tests-2', { buildXpack() }, [
          getXpackCiGroupWorker(7),
          getXpackCiGroupWorker(8),
          getXpackCiGroupWorker(9),
          getXpackCiGroupWorker(10),
          getPostBuildWorker('xpack-firefoxSmoke', { bash './test/scripts/jenkins_xpack_firefox_smoke.sh' }),
          getPostBuildWorker('xpack-visualRegression', { bash './test/scripts/jenkins_xpack_visual_regression.sh' }),
        ]),
        // make sure all x-pack-ciGroups are listed in test/scripts/jenkins_xpack_ci_group.sh
      ])
    }
  }
}

def withWorker(label, closure) {
  node(label) {
    closure()
  }
}

def withWorkers(name, preWorkerClosure = {}, workerClosures = []) {
  return {
    jobRunner('testrunner-xlarge') {
      try {
        doSetup()
        preWorkerClosure()

        def nextWorker = 1
        def worker = { workerClosure ->
          def workerNumber = nextWorker
          nextWorker++

          return {
            workerClosure(workerNumber)
          }
        }

        def workers = [:]
        workerClosures.eachWithIndex { workerClosure, i -> workers["worker-${i+1}"] = worker(workerClosure) }

        parallel(workers)
      } catch(ex) {
        // input "Waiting" // TODO remove
      } finally {
        uploadAllGcsArtifacts(name) // TODO fix name
        publishJunit()
      }
    }
  }
}

def getOssCiGroupWorkers(ciGroups = []) {
  return ciGroups.collect { getOssCiGroupWorker(it) }
}

def getPostBuildWorker(name, closure) {
  return { workerNumber -> 
    stage(name) {
      def kibanaPort = "61${workerNumber}1"
      def esPort = "61${workerNumber}2"

      withEnv([
        "CI_WORKER_NUMBER=${workerNumber}",
        "TEST_KIBANA_HOST=localhost",
        "TEST_KIBANA_PORT=${kibanaPort}",
        "TEST_KIBANA_URL=http://elastic:changeme@localhost:${kibanaPort}",
        "TEST_ES_URL=http://elastic:changeme@localhost:${esPort}",
      ]) {
        closure()
      }
    }
  }
}

def getOssCiGroupWorker(ciGroup) {
  return getPostBuildWorker("ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=kibana-ciGroup${ciGroup}",
    ]) {
      bash "./test/scripts/jenkins_ci_group.sh" // TODO runbld
    }
  })
}

def getXpackCiGroupWorker(ciGroup) {
  return getPostBuildWorker("xpack-ciGroup" + ciGroup, {
    withEnv([
      "CI_GROUP=${ciGroup}",
      "JOB=xpack-kibana-ciGroup${ciGroup}",
    ]) {
      bash "./test/scripts/jenkins_xpack_ci_group.sh" // TODO runbld
    }
  })
}

def ossTestRunner(ciGroups) {
  withWorkers('oss-ciGroups-' + ciGroups.join('.'), { buildOss() }, ciGroups.collect{ getOssCiGroupWorker(it) })
}

def legacyJobRunner(name) {
  return {
    withEnv([
      "JOB=${name}",
    ]) {
      jobRunner('linux && immutable') {
        try {
          stage(name) {
            runbld '.ci/run.sh'
          }
        } finally {
          uploadAllGcsArtifacts(name) // TODO fix name
          publishJunit()
        }
      }
    }
  }
}

def jobRunner(label, closure) {
  withEnv([
    "CI=true",
    "HOME=${env.JENKINS_HOME}",
    "PR_SOURCE_BRANCH=${env.ghprbSourceBranch}",
    "PR_TARGET_BRANCH=${env.ghprbTargetBranch}",
    "PR_AUTHOR=${env.ghprbPullAuthorLogin}",
    "TEST_BROWSER_HEADLESS=1",
    "IS_PIPELINE_JOB=1",
  ]) {
    withCredentials([ // TODO make these not necessary?
      string(credentialsId: 'vault-addr', variable: 'VAULT_ADDR'),
      string(credentialsId: 'vault-role-id', variable: 'VAULT_ROLE_ID'),
      string(credentialsId: 'vault-secret-id', variable: 'VAULT_SECRET_ID'),
    ]) {
      withWorker(label) {
        withVaultSecret(secret: 'secret/kibana-issues/dev/kibanamachine', secret_field: 'github_token', variable_name: 'GITHUB_TOKEN') {
          withVaultSecret(secret: 'secret/kibana-issues/dev/kibanamachine-reporter', secret_field: 'value', variable_name: 'KIBANA_CI_REPORTER_KEY') {
            withVaultSecret(secret: 'secret/kibana-issues/dev/percy', secret_field: 'value', variable_name: 'PERCY_TOKEN') {
              catchError {
                checkout scm

                // scm is configured to check out to the ./kibana directory
                dir('kibana') {
                  closure()
                }
              }
            }
          }
        }

        // sendMail() // TODO
      }
    }
  }
}

// TODO what should happen if GCS, Junit, or email publishing fails? Unstable build? Failed build?

def uploadGcsArtifact(jobName, pattern) {
  // def storageLocation = "gs://kibana-ci-artifacts/jobs/pipeline-test/${BUILD_NUMBER}/${jobName}" // TODO
  def storageLocation = "gs://kibana-pipeline-testing/jobs/pipeline-test/${BUILD_NUMBER}/${jobName}"

  googleStorageUpload(
    credentialsId: 'kibana-ci-gcs-plugin',
    bucket: storageLocation,
    pattern: pattern,
    sharedPublicly: true,
    showInline: true,
  )
}

def uploadAllGcsArtifacts(jobName) {
  def ARTIFACT_PATTERNS = [
    'target/kibana-*',
    'target/junit/**/*',
    'test/**/screenshots/**/*.png',
    'test/functional/failure_debug/html/*.html',
    'x-pack/test/**/screenshots/**/*.png',
    'x-pack/test/functional/failure_debug/html/*.html',
    'x-pack/test/functional/apps/reporting/reports/session/*.pdf',
  ]

  ARTIFACT_PATTERNS.each { pattern ->
    uploadGcsArtifact(jobName, pattern)
  }
}

def publishJunit() {
  junit(testResults: 'target/junit/**/*.xml', allowEmptyResults: true, keepLongStdio: true)
}

def sendMail() {
  step([
    $class: 'Mailer',
    notifyEveryUnstableBuild: true,
    recipients: 'infra-root+build@elastic.co',
    sendToIndividuals: false
  ])
}

def runbld(script) {
  sh '#!/usr/local/bin/runbld\n' + script
}

def bash(script) {
  sh "#!/bin/bash -x\n${script}"
}

def doSetup() {
  bash "./test/scripts/jenkins_setup.sh" // TODO runbld
}

// def wihtKibanaEnv(script) {
//   bash("""
//     . ${env.WORKSPACE}/kibana/src/dev/ci_setup/load_env_keys.sh
//     . ${env.WORKSPACE}/kibana/src/dev/ci_setup/setup_env.sh
//     ${script}
//   """)
// }

// yarn run grunt functionalTests:ensureAllTestsInCiGroup;

def buildOss() {
  bash "./test/scripts/jenkins_build_kibana.sh" // TODO runbld
}

def buildXpack() {
  bash "./test/scripts/jenkins_xpack_build_kibana.sh" // TODO runbld
}