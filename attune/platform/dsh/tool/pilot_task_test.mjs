/// The provider-free laws of the per-task / per-arm pilot review-task composition
/// and of the fail-closed pilot binding check (`VAL-STUDY-002`, `VAL-STUDY-010`).
///
/// These laws read only DECLARED inputs: the frozen review prompt, the admitted
/// public issue record, the declared cohort root with each task's changed-file
/// manifest, sealed region manifest and revision record, and the complete
/// whole-world file manifest of each task. They compose the twenty once-only
/// review tasks exactly as the runner does, and they assert:
///
///  - every composed task BEGINS with the frozen prompt bytes exactly;
///  - every composed line is either a frozen-prompt byte, one of the fixed
///    template lines, a line of the task's own public issue, or a line of the
///    task's own changed-file manifest, so no retrospective lead, evaluator/gold
///    label, known line or other task's content can be injected;
///  - the base/head identities are the task's OWN declared revisions;
///  - the plain arm carries no packet operation and the packet arm carries exactly
///    the one declared additional operation;
///  - composition is deterministic;
///  - and the binding check REFUSES a missing world, a world manifest that names
///    another task, a wrong per-task manifest, a wrong tool mode, an undeclared
///    arm and a packet binding on the plain arm, all provider-free.
///
/// Nothing here contacts a provider, runs a model, fetches a package or reads a
/// golden finding or a review label.
///
/// @module attune.dsh.pilot-task-test

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

import {
  COHORT_ROOT_ENV,
  ISSUES_FILE_ENV,
  PILOT_MODE_ENV,
  PROMPT_FILE_ENV,
  PilotBindingRefusal,
  R0_PLAIN,
  R1_PACKETS,
  applyPilotTask,
  parseChanged,
  parseFileRecord,
  parseIssues,
  perTaskPaths,
  pilotTaskFileName,
  taskTextFor,
  validatePilotBinding,
} from '../pilot_task.mjs'

const COHORT = process.env.ATTUNE_COHORT_ROOT
  ?? fileURLToPath(new URL('../evidence_reviewbench_cohort/', import.meta.url))
const PROMPT = fileURLToPath(new URL('../../../test/reviewbench_pilot/prompt.txt', import.meta.url))
const ISSUES = fileURLToPath(new URL('../../../test/reviewbench_review/reviewbench_review_issues/issues.tsv', import.meta.url))

const PROMPT_TEXT = readFileSync(PROMPT, 'utf8')
const PROMPT_IDENTITY = 'sha256:c77d29975a48bdf37ba880e2c0afd0bfdc737d159cef1dd6739cf45215424313'

/// The ten original frozen tasks, in the canonical order of the declared cohort
/// tool index. They are the tasks of the twenty once-only observations; the
/// metadata-only holdout of 24 is a different, later population.
const TASKS = readFileSync(join(COHORT, 'cohort-tool.tsv'), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('tool\t'))
  .map((line) => line.split('\t')[1])

/// The declared per-task world bindings of ONE observation, built exactly as the
/// pilot runner builds them, so what these laws check is what a run consumes.
function taskEnv(task, arm, extras = {}) {
  const paths = perTaskPaths(COHORT, task)
  const env = {
    [PILOT_MODE_ENV]: '1',
    ATTUNE_RUN_TASK: task,
    ATTUNE_RUN_ARM: arm,
    ATTUNE_RUN_OBSERVATION: '1',
    DSH_TOOLS_MODE: 'native',
    ATTUNE_WORLD_FILES: paths.worldFiles,
    ATTUNE_WHOLE_FILE_ROOT: COHORT,
    ATTUNE_EVIDENCE_WORLD: paths.regionManifest,
    ATTUNE_EVIDENCE_SOURCE_ROOT: COHORT,
    ATTUNE_EVIDENCE_PROJECTION: paths.packetProjection,
    [COHORT_ROOT_ENV]: COHORT,
    [PROMPT_FILE_ENV]: PROMPT,
    [ISSUES_FILE_ENV]: ISSUES,
    ...extras,
  }
  if (arm === R1_PACKETS) {
    env.ATTUNE_PACKET_WORLD = paths.regionManifest
    env.ATTUNE_PACKET_PROJECTION = paths.packetProjection
    env.ATTUNE_PACKET_SOURCE_ROOT = COHORT
  }
  return env
}

test('theFrozenPromptIdentityIsTheDeclaredOne', () => {
  assert.equal(
    'sha256:' + createHash('sha256').update(PROMPT_TEXT).digest('hex'),
    PROMPT_IDENTITY,
    'the composed task must begin with the FROZEN prompt bytes',
  )
})

test('theTenOriginalTasksAreTheDeclaredCohortPopulation', () => {
  assert.equal(TASKS.length, 10)
  assert.equal(new Set(TASKS).size, 10)
})

for (const task of TASKS) {
  for (const arm of [R0_PLAIN, R1_PACKETS]) {
    test(`theComposedTaskOf${task}${arm}CarriesOnlyItsOwnDeclaredInputs`, () => {
      const env = taskEnv(task, arm)
      const text = taskTextFor(env)

      // The frozen prompt is a byte-exact PREFIX of every observation.
      assert.ok(text.startsWith(PROMPT_TEXT), 'the frozen prompt must be an exact prefix')

      const paths = perTaskPaths(COHORT, task)
      const issue = parseIssues(readFileSync(ISSUES, 'utf8')).get(task)
      const changed = parseChanged(readFileSync(paths.changed, 'utf8'))
      const record = parseFileRecord(readFileSync(paths.fileRecord, 'utf8'))
      const head = record.find((row) => row.task === task && row.side === 'head')
      const base = record.find((row) => row.task === task && row.side === 'base')

      // The task's own public issue text is carried.
      for (const line of issue.split('\n').filter((l) => l.length > 0)) {
        assert.ok(text.includes(line), `the public issue line must be carried: ${line.slice(0, 40)}`)
      }
      // The task's own changed-file manifest is carried, one public row at a time.
      for (const row of changed) {
        assert.ok(
          text.includes(`${row.status} ${row.path} (${row.bytes} bytes)`),
          `the changed-file row must be carried: ${row.path}`,
        )
      }
      // The base and head identities are the task's OWN declared revisions.
      assert.ok(text.includes('Base revision: ' + base.revision))
      assert.ok(text.includes('Head revision: ' + head.revision))

      // Every composed line is accounted for by a declared input or a fixed
      // template line; nothing else can be injected into an observation.
      const declared = new Set()
      for (const line of PROMPT_TEXT.split('\n')) declared.add(line)
      for (const line of issue.split('\n')) declared.add(line)
      for (const row of changed) declared.add(`${row.status} ${row.path} (${row.bytes} bytes)`)
      const template = new Set([
        '## Task under review',
        '',
        'Task: ' + task,
        'Repository: ' + task.slice(0, task.lastIndexOf('-')).split('_').join('/'),
        'World: ' + task,
        'Base revision: ' + base.revision,
        'Head revision: ' + head.revision,
        '## Public issue',
        '## Changed files (base revision -> head revision)',
        '## Source operations',
      ])
      const undecided = []
      for (const line of text.split('\n')) {
        if (declared.has(line) || template.has(line)) continue
        if (line.startsWith('You have read-only access to the complete authorized source')) continue
        if (line.startsWith('Record each candidate with `attune_commit_candidate`')) continue
        if (line.startsWith('In this arm you additionally have the progressive packet operation')) continue
        undecided.push(line)
      }
      assert.deepEqual(undecided, [], 'no composed line may come from outside the declared inputs')

      // Only the packet arm carries the packet operation; the shared plain facade
      // and the common commit are in BOTH arms.
      assert.equal(text.includes('attune_packet_operation'), arm === R1_PACKETS)
      assert.ok(text.includes('attune_source_read'))
      assert.ok(text.includes('attune_commit_candidate'))

      // Deterministic: the same declared inputs compose the same bytes.
      assert.equal(text, taskTextFor(env))
      assert.ok(text.length > PROMPT_TEXT.length)
    })
  }
}

test('theComposedTaskReplacesTheOnePositionalPromptArgument', () => {
  const env = taskEnv(TASKS[0], R1_PACKETS)
  const placeholder = 'PILOT-TASK-COMPOSED-AT-RUN-TIME'
  const argv = ['--profile', 'headless', '--patch', 'x.yml', '--json', placeholder]
  const applied = applyPilotTask(env, argv)
  assert.notEqual(applied[applied.length - 1], placeholder)
  assert.ok(applied[applied.length - 1].startsWith(PROMPT_TEXT))
  assert.equal(applied.length, argv.length)
  // A flag-only probe of the composed profile keeps its own argument list, but
  // the declared per-task binding is still validated.
  const probe = ['--profile', 'headless', '--patch', 'x.yml', '--dump-config']
  assert.deepEqual(applyPilotTask(env, probe), probe)
  // A pilot-mode invocation with neither placeholder nor probe refuses.
  assert.throws(() => applyPilotTask(env, ['--profile', 'headless', 'something']), PilotBindingRefusal)
  // Without the pilot marker the invocation is untouched.
  assert.deepEqual(applyPilotTask({}, argv), argv)
})

test('thePilotBindingFailsClosedOnAMissingOrWrongWorld', () => {
  const task = TASKS[0]
  const other = TASKS[1]
  const good = taskEnv(task, R0_PLAIN)
  assert.deepEqual(validatePilotBinding(good), { task, arm: R0_PLAIN })

  const missing = { ...good }
  delete missing.ATTUNE_WORLD_FILES
  assert.throws(() => validatePilotBinding(missing), PilotBindingRefusal)

  const absent = { ...good, ATTUNE_WORLD_FILES: join(COHORT, 'cohort-tool-no-such-task-world-files.tsv') }
  assert.throws(() => validatePilotBinding(absent), PilotBindingRefusal)

  // The declared per-task manifest is another task's: refuse rather than serve it.
  const wrongWorld = { ...good, ATTUNE_WORLD_FILES: perTaskPaths(COHORT, other).worldFiles }
  assert.throws(() => validatePilotBinding(wrongWorld), PilotBindingRefusal)

  // A missing cohort root, a wrong tool mode, an undeclared arm and a missing
  // evidence binding each refuse provider-free.
  assert.throws(() => validatePilotBinding({ ...good, [COHORT_ROOT_ENV]: join(COHORT, 'absent') }), PilotBindingRefusal)
  assert.throws(() => validatePilotBinding({ ...good, DSH_TOOLS_MODE: 'ptc' }), PilotBindingRefusal)
  assert.throws(() => validatePilotBinding({ ...good, ATTUNE_RUN_ARM: 'R2_STOP' }), PilotBindingRefusal)
  const noProjection = { ...good }
  delete noProjection.ATTUNE_EVIDENCE_PROJECTION
  assert.throws(() => validatePilotBinding(noProjection), PilotBindingRefusal)

  // The plain arm declares no packet world; a packet binding on it is refused.
  assert.throws(
    () => validatePilotBinding({ ...good, ATTUNE_PACKET_WORLD: perTaskPaths(COHORT, task).regionManifest }),
    PilotBindingRefusal,
  )
  // The packet arm requires its own packet world.
  const packetArm = taskEnv(task, R1_PACKETS)
  delete packetArm.ATTUNE_PACKET_PROJECTION
  assert.throws(() => validatePilotBinding(packetArm), PilotBindingRefusal)
})

test('theDeclaredTaskFileNamesAreTheFrozenPerTaskArmLayout', () => {
  assert.equal(pilotTaskFileName('capawesome-team_cli-126', R0_PLAIN), 'pilot-task-capawesome-team_cli-126-R0_PLAIN.txt')
  assert.equal(pilotTaskFileName('capawesome-team_cli-126', R1_PACKETS), 'pilot-task-capawesome-team_cli-126-R1_PACKETS.txt')
})
