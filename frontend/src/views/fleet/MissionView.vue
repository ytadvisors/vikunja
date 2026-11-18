<template>
	<div class="fleet-page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Mission #{{ id }}</p>
		<div v-if="error" class="notice">{{ error }}</div>
		<template v-else-if="task">
			<header class="page-head">
				<div>
					<h1>{{ title }}</h1>
					<p class="sub">Asked by {{ task.created_by?.username }} · {{ ago(task.created) }}<template v-if="briefing?.general"> · general: {{ briefing.general }}</template></p>
				</div>
				<div class="actions">
					<RouterLink class="ghost" :to="{name: 'task.detail', params: {id}}">Open as task</RouterLink>
					<button v-if="debrief && !task.done" class="primary" type="button" :disabled="accepting" @click="accept">Accept the result</button>
					<span v-if="task.done" class="pill ok">Accepted</span>
				</div>
			</header>

			<ol class="steps" aria-label="Mission progress">
				<li v-for="s in steps" :key="s.label" :class="s.state"><span class="n">{{ s.state === 'done' ? '✓' : s.i }}</span><div><b>{{ s.label }}</b><small>{{ s.note }}</small></div></li>
			</ol>

			<section v-if="stopped" class="card stop"><h2>Stopped</h2><p class="body">{{ stopped }}</p></section>

			<section v-if="briefing" class="card">
				<h2>Briefing <span class="by">from the general · {{ briefing.general }} · {{ briefing.model }} · {{ briefing.seconds }} s</span></h2>
				<div class="body">
					<p class="lead">{{ briefing.text }}</p>
					<p v-if="briefing.cannot" class="notice">The general says the computers cannot do this as they are today. No job was started.</p>
					<dl class="ess">
						<div><dt>Team</dt><dd>{{ briefing.team || '–' }}</dd></div>
						<div><dt>Jobs planned</dt><dd>{{ briefing.jobs.length }}</dd></div>
						<div><dt>Then</dt><dd>{{ briefing.then || '–' }}</dd></div>
					</dl>
				</div>
			</section>
			<section v-else-if="!stopped" class="card"><h2>Briefing</h2><p class="body waiting">The general is writing the briefing…</p></section>

			<section v-if="jobs.length" class="card">
				<h2>Jobs <span class="by">{{ doneJobs }} of {{ jobs.length }} done on the fleet's computers</span></h2>
				<div class="jobs">
					<article v-for="j in jobs" :key="j.id" class="job">
						<div class="j-top">
							<b>{{ j.name }}</b>
							<span :class="['pill', j.done ? 'ok' : 'info']">{{ j.done ? 'done' : 'working' }}</span>
						</div>
						<p class="j-instr">{{ j.instruction }}</p>
						<div class="j-meta">
							<span v-if="j.result">{{ j.result.station }} · {{ j.result.model }} · {{ j.result.seconds }} s · {{ j.result.tokens }} tokens</span>
							<span v-else>waiting for a computer</span>
						</div>
						<div v-if="j.result?.checks.length" class="chips"><span v-for="c in j.result.checks" :key="c.name" class="chip" :title="c.command">{{ c.name }} · exit {{ c.exit }}</span></div>
						<details v-if="j.result"><summary>Result</summary><pre>{{ j.result.output }}</pre></details>
					</article>
				</div>
			</section>

			<section v-if="debrief" class="card debrief">
				<h2>Debrief <span class="by">reviewed by the general from the job results</span><span v-if="debrief.incomplete" class="pill warn">incomplete: {{ debrief.incomplete }}</span></h2>
				<div class="body">
					<pre class="answer">{{ debrief.answer }}</pre>
					<dl class="ess">
						<div><dt>Confidence</dt><dd>{{ debrief.confidence }}</dd></div>
						<div><dt>Cost</dt><dd>{{ debrief.cost }}</dd></div>
					</dl>
					<div v-if="debrief.untrusted.length" class="untrusted">
						<b>Results the general did not take as given</b>
						<ul><li v-for="(u, i) in debrief.untrusted" :key="i">{{ u }}</li></ul>
					</div>
					<p v-else-if="debrief.trustedAll" class="c-meta">The general trusted every job result.</p>
				</div>
			</section>
		</template>
		<div v-else class="notice">Loading…</div>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {ago, onFleetChange, vkGet, vkPost} from '@/fleet/api'
import {findBriefing, findDebrief, findJobResult, findStopped, type Briefing, type Debrief, type JobResult} from '@/fleet/parse'
import {useTitle} from '@/composables/useTitle'



const props = defineProps<{id: number | string}>()
const id = computed(() => Number(props.id))
useTitle(() => `Mission #${id.value ?? ''}`)
const task = ref<any>(null)
const briefing = ref<Briefing | null>(null)
const debrief = ref<Debrief | null>(null)
const stopped = ref('')
const jobs = ref<{id: number; name: string; instruction: string; done: boolean; result: JobResult | null}[]>([])
const error = ref('')
const accepting = ref(false)

const title = computed(() => (task.value?.title || '').replace(/^\s*mission\s*:\s*/i, ''))
const doneJobs = computed(() => jobs.value.filter(j => j.done).length)
const steps = computed(() => {
	const n = jobs.value.length
	const st = (done: boolean, active: boolean) => (done ? 'done' : active ? 'active' : 'todo')
	return [
		{i: 1, label: 'Asked', note: ago(task.value?.created), state: 'done'},
		{i: 2, label: 'Briefed', note: briefing.value ? `${briefing.value.jobs.length} jobs planned` : stopped.value ? 'stopped' : 'planning', state: st(!!briefing.value, !briefing.value && !stopped.value)},
		{i: 3, label: 'Working', note: n ? `${doneJobs.value} of ${n} jobs` : '–', state: st(n > 0 && doneJobs.value === n, n > 0 && doneJobs.value < n)},
		{i: 4, label: 'Debriefed', note: debrief.value ? (debrief.value.incomplete ? 'incomplete' : 'ready to read') : '–', state: st(!!debrief.value, n > 0 && doneJobs.value === n && !debrief.value)},
		{i: 5, label: 'Accepted', note: task.value?.done ? 'by the owner' : 'your decision', state: st(!!task.value?.done, !!debrief.value && !task.value?.done)},
	]
})

async function load() {
	try {
		const [t, comments] = await Promise.all([vkGet<any>(`/tasks/${id.value}`), vkGet<any[]>(`/tasks/${id.value}/comments`)])
		task.value = t
		briefing.value = findBriefing(comments)
		debrief.value = findDebrief(comments)
		stopped.value = findStopped(comments)
		const subs = (t.related_tasks?.subtask || []) as any[]
		jobs.value = await Promise.all(subs.map(async (s, i) => {
			const [st, cs] = await Promise.all([vkGet<any>(`/tasks/${s.id}`), vkGet<any[]>(`/tasks/${s.id}/comments`)])
			const planned = briefing.value?.jobs[i]
			return {
				id: s.id,
				name: st.title.replace(/^Job \d+ of mission #\d+:\s*/, ''),
				instruction: planned?.instruction || '',
				done: st.done,
				result: findJobResult(cs),
			}
		}))
	} catch (e: any) {
		error.value = `Could not load mission #${id.value}: ${e.message}`
	}
}

async function accept() {
	accepting.value = true
	try {
		task.value = await vkPost<any>(`/tasks/${id.value}`, {...task.value, done: true})
	} finally {
		accepting.value = false
	}
}

let stop = () => {}
onMounted(() => {
	load()
	stop = onFleetChange(load)
})
onUnmounted(() => stop())
</script>

<style lang="scss" scoped>
.steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: .5rem; padding: 0; margin: 0 0 1.1rem; }
@media (max-width: 760px) { .steps { grid-template-columns: 1fr 1fr; } }
.steps li { display: flex; gap: .55rem; align-items: center; background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: .6rem .7rem; }
.steps .n { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: .8rem; background: var(--grey-200); color: var(--text-light); flex: none; }
.steps b { display: block; font-size: .88rem; color: var(--text-strong); }
.steps small { color: var(--text-light); font-size: .75rem; }
.steps li.done .n { background: #448361; color: #fff; }
.steps li.active { border-color: var(--primary); box-shadow: 0 0 0 3px hsla(var(--primary-h), var(--primary-s), var(--primary-l), .12); }
.steps li.active .n { background: var(--primary); color: #fff; }
.by { color: var(--text-light); font-weight: 500; font-size: .82rem; }
.body { padding: 1rem 1.1rem; }
.lead { font-size: 1.02rem; line-height: 1.55; margin: 0 0 .8rem; color: var(--text-strong); }
.waiting { color: var(--text-light); }
.ess { display: grid; gap: .1rem; margin: 0; }
.ess div { display: grid; grid-template-columns: 140px 1fr; padding: .45rem 0; border-top: 1px solid var(--border-light); }
.ess dt { color: var(--text-light); }
.ess dd { margin: 0; }
.jobs { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: .8rem; padding: 1rem 1.1rem; }
.job { border: 0; border-radius: 10px; padding: .8rem .9rem; background: var(--fleet-sidebar, #f7f6f3); }
.j-top { display: flex; justify-content: space-between; gap: .5rem; align-items: flex-start; }
.j-instr { color: var(--text); font-size: .85rem; margin: .45rem 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.j-meta { color: var(--text-light); font-size: .8rem; }
.chips { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .45rem; }
.chip { font-size: .72rem; border: 1px solid var(--border); border-radius: 999px; padding: 0 .5rem; color: var(--text-light); background: var(--white); }
details { margin-top: .5rem; }
summary { cursor: pointer; font-weight: 600; font-size: .85rem; color: var(--primary); }
pre { white-space: pre-wrap; word-break: break-word; font-size: .8rem; background: var(--white); border: 1px solid var(--border-light); border-radius: 8px; padding: .6rem; margin: .4rem 0 0; max-height: 320px; overflow: auto; }
.answer { font-family: inherit; font-size: .95rem; line-height: 1.55; max-height: none; background: var(--site-background); color: var(--text-strong); margin: 0 0 1rem; }
.untrusted { margin-top: .8rem; background: hsla(var(--warning-h), var(--warning-s), var(--warning-l), .08); border-radius: 10px; padding: .7rem .9rem; }
.untrusted ul { margin: .4rem 0 0 1.1rem; }
.untrusted li { margin: .25rem 0; font-size: .88rem; }
.stop h2 { color: var(--danger); }
.c-meta { color: var(--text-light); margin: .2rem 0 0; font-size: .9rem; }
</style>
