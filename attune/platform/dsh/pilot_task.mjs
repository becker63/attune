/// The declared per-task / per-arm review-task composition of the gated
/// ReviewBench pilot, and the fail-closed binding check of ONE observation.
///
/// ONE observation is composed from declared inputs only:
///
///  - the FROZEN review prompt (`prompt.txt`, byte-exact: the composed text
///    always BEGINS with exactly those bytes, so the frozen prompt identity is a
///    real prefix of every observation);
///  - the task's own PUBLIC issue title/body (the admitted `issues.tsv` row);
///  - the task's changed-file manifest of its world (`cohort-changed-<task>.tsv`);
///  - the exact base/head identities, read from the declared cohort file record
///    of this task rather than restated as truth here;
///  - the declared source operations and the common checkpoint interface.
///
/// It composes nothing else. No historical finding, no evaluator/gold label, no
/// retrospective lead, no known line and no development-fixture hypothesis is an
/// input or an output of this module, and no other task's packet default is
/// reachable from it.
///
/// The second job of this module is the provider-free FAIL-CLOSED binding check.
/// The mounted tools ship real compiled defaults (the capawesome packet world
/// beside the tool package), so a run that forgets a per-task world would
/// silently serve the wrong world. In pilot mode this module refuses to start the
/// agent loop at all unless every declared per-task binding is present, exists,
/// and names THIS task's world; the refusal costs no provider call.
///
/// @module attune.dsh.pilot-task

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/// The declared marker of ONE pilot observation. It is set by the pilot runner
/// target and is what makes the fail-closed check mandatory instead of optional.
export const PILOT_MODE_ENV = 'ATTUNE_DSH_PILOT'

export function pilotModeEnabled(env) {
  return env[PILOT_MODE_ENV] === '1'
}

/// The declared input locations of ONE observation's task composition: the
/// frozen prompt, the admitted public issue record and the declared cohort root
/// that carries this task's own world records. They are ordinary declared action
/// inputs of the runner, never host-global lookups.
export const PROMPT_FILE_ENV = 'ATTUNE_DSH_PROMPT_FILE'
export const ISSUES_FILE_ENV = 'ATTUNE_DSH_ISSUES_FILE'
export const COHORT_ROOT_ENV = 'ATTUNE_DSH_COHORT_ROOT'

/// The declared per-task world bindings of the mounted tools, by their REAL names
/// (the names the tools read), so the runner consumes them rather than echoing
/// their labels.
export const PILOT_BINDING_ENV = {
  runTask: 'ATTUNE_RUN_TASK',
  runArm: 'ATTUNE_RUN_ARM',
  runObservation: 'ATTUNE_RUN_OBSERVATION',
  toolsMode: 'DSH_TOOLS_MODE',
  worldFiles: 'ATTUNE_WORLD_FILES',
  wholeFileRoot: 'ATTUNE_WHOLE_FILE_ROOT',
  evidenceWorld: 'ATTUNE_EVIDENCE_WORLD',
  evidenceSourceRoot: 'ATTUNE_EVIDENCE_SOURCE_ROOT',
  evidenceProjection: 'ATTUNE_EVIDENCE_PROJECTION',
  packetWorld: 'ATTUNE_PACKET_WORLD',
  packetProjection: 'ATTUNE_PACKET_PROJECTION',
  packetSourceRoot: 'ATTUNE_PACKET_SOURCE_ROOT',
}

/// The R1-only bindings: the packet operation is the SOLE arm difference in
/// source access, so its world bindings are required only on the packet arm.
export const PACKET_ONLY_ENV = ['packetWorld', 'packetProjection', 'packetSourceRoot']

/// The declared arm identities of the twenty once-only observations. No optional
/// arm is composable here: R2/R3/R4 are declared policy, not pilot observations.
export const R0_PLAIN = 'R0_PLAIN'
export const R1_PACKETS = 'R1_PACKETS'

export function armReceivesPackets(armName) {
  return armName === R1_PACKETS
}

/// A refusal of the declared binding. It is raised BEFORE any provider call, so a
/// misdeclared observation is a zero-cost error rather than a wrong-world run.
export class PilotBindingRefusal extends Error {}

function refuse(message) {
  throw new PilotBindingRefusal(message)
}

function requireEnv(env, name, why) {
  const value = env[name]
  if (typeof value !== 'string' || value.length === 0) {
    refuse(`the declared pilot binding ${name} is required: ${why}`)
  }
  return value
}

function requireReadable(env, name, why) {
  const value = requireEnv(env, name, why)
  if (!existsSync(value)) {
    refuse(`the declared pilot binding ${name} names ${value}, which does not exist: ${why}`)
  }
  return value
}

function requirePresent(env, name, why) {
  const value = requireEnv(env, name, why)
  if (!existsSync(value)) {
    refuse(`the declared pilot binding ${name} names ${value}, which does not exist: ${why}`)
  }
  return value
}

export function linesOf(text) {
  return text.split('\n').filter((line) => line.length > 0)
}

export function fieldsOf(line) {
  return line.split('\t')
}

/// The declared issues record: `issue <TAB> <task> <TAB> <title/body>`. The body
/// carries its newlines escaped, so it is decoded here rather than trusted.
export function parseIssues(text) {
  const issues = new Map()
  for (const line of linesOf(text)) {
    const fields = fieldsOf(line)
    if (fields.length >= 3 && fields[0] === 'issue') {
      issues.set(fields[1], fields[2].split('\\n').join('\n'))
    }
  }
  return issues
}

/// The declared changed-file manifest: `changed <TAB> <status> <TAB> <path>
/// <TAB> <bytes> <TAB> ...`. Only the public changed-file metadata is read.
export function parseChanged(text) {
  const rows = []
  for (const line of linesOf(text)) {
    const fields = fieldsOf(line)
    if (fields.length >= 4 && fields[0] === 'changed') {
      rows.push({ status: fields[1], path: fields[2], bytes: Number.parseInt(fields[3], 10) })
    }
  }
  return rows
}

/// The declared cohort file record: `file <TAB> <task> <TAB> base|head <TAB>
/// <revision> <TAB> <path>`. The exact base and head revisions of one task are
/// read from here, so the composition never restates a revision as truth.
export function parseFileRecord(text) {
  const rows = []
  for (const line of linesOf(text)) {
    const fields = fieldsOf(line)
    if (fields.length >= 4 && fields[0] === 'file') {
      rows.push({ task: fields[1], side: fields[2], revision: fields[3] })
    }
  }
  return rows
}

export function revisionsOf(task, fileRecord) {
  const rows = fileRecord.filter((row) => row.task === task)
  const head = rows.find((row) => row.side === 'head')
  const base = rows.find((row) => row.side === 'base')
  if (!head || !base) {
    refuse(`the declared cohort file record of ${task} does not name both revisions`)
  }
  return { base: base.revision, head: head.revision }
}

/// The declared repository display name of one task, as the admitted cohort names
/// it (the task id with its trailing pull-request number removed and the owner
/// separator restored).
export function groupOf(task) {
  const cut = task.lastIndexOf('-')
  return task.slice(0, cut).split('_').join('/')
}

/// The declared per-task paths inside the admitted cohort root. They are the
/// declaration `Attune.Study.ReviewPilotBinding` freezes, consumed here rather
/// than re-invented.
export function perTaskPaths(root, task) {
  return {
    worldFiles: join(root, `cohort-tool-${task}-world-files.tsv`),
    regionManifest: join(root, `cohort-tool-${task}-region-manifest.tsv`),
    packetProjection: join(root, `cohort-tool-${task}-packet-records.tsv`),
    changed: join(root, `cohort-changed-${task}.tsv`),
    fileRecord: join(root, 'cohort-files.tsv'),
  }
}

/// Compose the ONE review task text of one (task, arm) observation.
export function composePilotTask({ prompt, issue, changed, task, arm, base, head }) {
  const lines = []
  lines.push(prompt)
  lines.push('## Task under review')
  lines.push('')
  lines.push('Task: ' + task)
  lines.push('Repository: ' + groupOf(task))
  // The declared world identity of the task, as the tools' own manifests name it
  // (the whole-world manifest and the evidence world both declare this exact
  // identity). A candidate must name the world the tools resolve.
  lines.push('World: ' + task)
  lines.push('Base revision: ' + base)
  lines.push('Head revision: ' + head)
  lines.push('')
  lines.push('## Public issue')
  lines.push('')
  lines.push(issue)
  lines.push('')
  lines.push('## Changed files (base revision -> head revision)')
  lines.push('')
  for (const row of changed) {
    lines.push(row.status + ' ' + row.path + ' (' + String(row.bytes) + ' bytes)')
  }
  lines.push('')
  lines.push('## Source operations')
  lines.push('')
  lines.push(
    'You have read-only access to the complete authorized source of BOTH ' +
    'revisions through `attune_source_read`, whose operations are `list` (the ' +
    'bounded manifest of the complete authorized population), `read` (an exact ' +
    'line range of one declared file) and `whole-file` (one declared file whole, ' +
    'including an overflow or unsupported-encoding file, reported honestly).',
  )
  if (armReceivesPackets(arm)) {
    lines.push('')
    lines.push(
      'In this arm you additionally have the progressive packet operation ' +
      '`attune_packet_operation`, whose disclosures are `progressive` (the ' +
      'bounded changed source of the compiled packets), `full-source` (the ' +
      'retained complete-source escape) and `whole-file` (one exact declared ' +
      'file). A packet serves the ACTUAL source text it names; identity ' +
      'metadata alone is not source.',
    )
  }
  lines.push('')
  lines.push(
    'Record each candidate with `attune_commit_candidate`, naming the exact ' +
    '`path@start-end` evidence you actually received. Any bounded line span of an ' +
    'ordinary authorized file of this world is deliverable evidence, whether or ' +
    'not it lies in the initially disclosed neighborhood. Committing does not end ' +
    'the review: keep investigating and commit every candidate you can ground in ' +
    'exact source.',
  )
  return lines.join('\n') + '\n'
}

/// The world identity a declared whole-world file manifest names, as its own
/// first file row declares it.
export function manifestWorld(worldFilesText) {
  for (const line of linesOf(worldFilesText)) {
    const fields = fieldsOf(line)
    if (fields.length >= 3 && fields[0] === 'file') {
      return fields[1]
    }
  }
  refuse('the declared whole-world file manifest names no world')
}

/// Validate the declared binding of ONE observation, provider-free. Every
/// per-task path must be present, readable and bound to THIS task, so a missing
/// or wrong world refuses BEFORE the agent loop starts instead of silently
/// serving the compiled defaults that ship beside the tools.
export function validatePilotBinding(env) {
  const task = requireEnv(env, PILOT_BINDING_ENV.runTask, 'one observation has one task identity')
  const arm = requireEnv(env, PILOT_BINDING_ENV.runArm, 'one observation has one arm identity')
  if (arm !== R0_PLAIN && arm !== R1_PACKETS) {
    refuse(`the declared arm ${arm} is not a pilot observation arm`)
  }
  requireEnv(env, PILOT_BINDING_ENV.runObservation, 'one observation has one observation identity')
  const mode = requireEnv(env, PILOT_BINDING_ENV.toolsMode, 'the pilot runs the native tool mode')
  if (mode !== 'native') {
    refuse(`the declared tool mode ${mode} is not the frozen native mode`)
  }

  const root = requirePresent(env, COHORT_ROOT_ENV, 'the cohort root carries this task world')
  const paths = perTaskPaths(root, task)

  // The declared whole-world manifest must exist, name THIS task's world, and be
  // exactly the per-task manifest the declared cohort root carries.
  const worldFiles = requireReadable(env, PILOT_BINDING_ENV.worldFiles,
    'the shared plain facade reads the task whole-world manifest')
  if (worldFiles !== paths.worldFiles) {
    refuse(
      `the declared whole-world manifest ${worldFiles} is not the per-task manifest ` +
      `${paths.worldFiles} of ${task}: refusing rather than serving another task or a compiled default`,
    )
  }
  const named = manifestWorld(readFileSync(worldFiles, 'utf8'))
  if (named !== task) {
    refuse(
      `the declared whole-world manifest names world ${named} but this observation is ${task}: ` +
      'refusing rather than serving another task or a compiled default',
    )
  }

  // The declared whole-file root and the three evidence bindings are the REAL
  // task world of the mounted tools.
  for (const name of [PILOT_BINDING_ENV.wholeFileRoot, PILOT_BINDING_ENV.evidenceSourceRoot]) {
    requirePresent(env, name, 'the mounted tools must bind the REAL task world')
  }
  for (const name of [PILOT_BINDING_ENV.evidenceWorld, PILOT_BINDING_ENV.evidenceProjection]) {
    requireReadable(env, name, 'the mounted tools must bind the REAL task world')
  }

  if (armReceivesPackets(arm)) {
    for (const key of PACKET_ONLY_ENV) {
      const name = PILOT_BINDING_ENV[key]
      requirePresent(env, name, 'the packet arm binds the R1-only packet world')
    }
    const projection = readFileSync(env[PILOT_BINDING_ENV.packetProjection], 'utf8')
    const packetRow = projection.split('\n').find((line) => line.startsWith('packet\t'))
    if (!packetRow || !packetRow.includes('\t' + task + '\t')) {
      refuse(`the declared packet projection does not compile the task world of ${task}`)
    }
  } else if (env[PILOT_BINDING_ENV.packetWorld] || env[PILOT_BINDING_ENV.packetProjection]
      || env[PILOT_BINDING_ENV.packetSourceRoot]) {
    refuse('the plain arm declares no packet world, but a packet binding is set')
  }
  return { task, arm }
}

/// The composed review task text of ONE observation, from its declared inputs.
export function taskTextFor(env) {
  const { task, arm } = validatePilotBinding(env)

  const root = env[COHORT_ROOT_ENV]
  const paths = perTaskPaths(root, task)
  const prompt = readFileSync(requireReadable(env, PROMPT_FILE_ENV,
    'the frozen review prompt is a declared input of every observation'), 'utf8')
  const issues = parseIssues(readFileSync(requireReadable(env, ISSUES_FILE_ENV,
    'the task public issue is a declared input of every observation'), 'utf8'))
  const changed = parseChanged(readFileSync(paths.changed,
    'utf8'))
  const fileRecord = parseFileRecord(readFileSync(paths.fileRecord, 'utf8'))
  const issue = issues.get(task)
  if (typeof issue !== 'string') {
    refuse(`the declared issues record carries no public issue for ${task}`)
  }
  const revisions = revisionsOf(task, fileRecord)
  return composePilotTask({
    prompt: prompt,
    issue: issue,
    changed: changed,
    task: task,
    arm: arm,
    base: revisions.base,
    head: revisions.head,
  })
}

/// The declared per-task / per-arm task-file name of the pre-composed option the
/// runner does not need (it composes at run time from declared inputs).
export function pilotTaskFileName(task, arm) {
  return 'pilot-task-' + task + '-' + arm + '.txt'
}

/// The declared placeholder the pilot runner passes as its ONE positional
/// argument. The launcher REPLACES exactly this argument with the composed review
/// task, so a run can never send the placeholder verbatim and a probe invocation
/// that carries no placeholder (a flag-only `--dump-config`, for example) keeps
/// its own argument list unchanged.
export const PILOT_TASK_PLACEHOLDER = 'PILOT-TASK-COMPOSED-AT-RUN-TIME'

/// The declared entry point of the pilot binding: when pilot mode is enabled the
/// ONE positional DSH prompt argument is REPLACED by the composed review task of
/// this observation. Anything else about the CLI invocation is untouched.
///
/// The declared per-task binding is validated in EVERY pilot-mode invocation,
/// including a flag-only probe, so the mount check and the live observation run
/// the very same fail-closed check.
export function applyPilotTask(env, argv) {
  if (!pilotModeEnabled(env)) return argv
  const text = taskTextFor(env)
  const next = argv.slice()
  if (next.length === 0) {
    refuse('the declared pilot task cannot be carried by an empty argument list')
  }
  const last = next[next.length - 1]
  if (last === PILOT_TASK_PLACEHOLDER) {
    next[next.length - 1] = text
    return next
  }
  if (last.startsWith('--')) {
    // A declared probe of the composed profile (no session, no provider call):
    // the binding above has already been validated and the argument list of the
    // probe is left exactly as the caller declared it.
    return next
  }
  refuse(
    'a pilot-mode invocation must carry the declared placeholder ' +
    PILOT_TASK_PLACEHOLDER + ' as its one positional task argument',
  )
}
