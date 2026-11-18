<template>
	<div class="fleet">
		<header class="fleet-head">
			<div>
				<p class="crumb">Fleet</p>
				<h1>Your fleet</h1>
				<p class="sub">The computers on this network that can do work, what they are doing, and what needs you.</p>
			</div>
			<button class="cta" type="button" @click="openGive = !openGive">+ Give the fleet a task</button>
		</header>

		<form v-if="openGive" class="give" @submit.prevent="submitGive">
			<label for="give-title">What do you want done?</label>
			<input id="give-title" v-model="giveTitle" placeholder="For example: Make sure all security patches are installed" required>
			<label for="give-text">Material (optional): paste text the fleet should work on</label>
			<textarea id="give-text" v-model="giveText" rows="4" placeholder="Notes, a document, a list…" />
			<div class="give-row">
				<span class="hint">The general plans it, your computers do the work on local models, and you get a debrief. Keep customer and personal data out for now.</span>
				<button class="cta" type="submit" :disabled="giving || !giveTitle.trim() || !projectId">{{ giving ? 'Sending…' : 'Send to the fleet' }}</button>
			</div>
			<p v-if="giveError" class="err">{{ giveError }}</p>
		</form>

		<p v-if="!view" class="notice">The fleet hub is not reachable from this browser ({{ CONSOLE_URL }}). Computers and recommendations will show when it is.</p>

		<section class="kpis">
			<div class="kpi"><small>Computers connected</small><b>{{ totals.connected ?? '–' }} / {{ totals.computers ?? '–' }}</b><span>{{ totals.memory_gb ?? 0 }} GB memory in the fleet</span></div>
			<div class="kpi"><small>Open recommendations</small><b :class="{bad: highRecs}">{{ totals.recommendations ?? '–' }}</b><span>{{ highRecs }} high severity</span></div>
			<div class="kpi"><small>Missions</small><b>{{ missions.length }}</b><span>{{ runningCount }} in progress</span></div>
			<div class="kpi"><small>Work done on local models</small><b>{{ totals.jobs ?? '–' }} jobs</b><span>{{ totals.local_seconds ?? 0 }} s of local compute</span></div>
		</section>

		<div class="cols">
			<div>
				<section class="panel">
					<h2>Missions <span class="count">{{ missions.length }}</span></h2>
					<div v-if="loading" class="empty">Loading…</div>
					<div v-else-if="!missions.length" class="empty"><b>No missions yet</b>Give the fleet a task above. The general writes a briefing, your computers do the jobs, and you get a debrief here.</div>
					<RouterLink v-for="m in missions" :key="m.id" class="mission" :to="{name: 'fleet.mission', params: {id: m.id}}">
						<div class="m-top">
							<b class="m-title">{{ m.title }}</b>
							<span :class="['pill', m.state.cls]">{{ m.state.label }}</span>
						</div>
						<div class="bar"><i :style="{width: m.pct + '%'}" /></div>
						<div class="m-meta">{{ m.doneJobs }} of {{ m.jobs }} jobs · created {{ ago(m.created) }} · #{{ m.id }}</div>
					</RouterLink>
				</section>
			</div>
			<div>
				<section class="panel">
					<h2>Computers <span class="count">{{ view?.computers.length ?? 0 }}</span></h2>
					<div v-if="view && !view.computers.length" class="empty"><b>No computer has joined</b>Install the station on a computer on this network and approve its pairing code.</div>
					<div v-for="c in view?.computers || []" :key="c.name" class="computer">
						<div class="c-top"><b>{{ c.name }}</b><span :class="['dot', c.state === 'connected' ? 'ok' : 'warn']">{{ c.state }}</span></div>
						<div class="c-meta">{{ c.chip || '?' }} · {{ c.memory_gb ?? '?' }} GB · {{ c.model || 'no local model' }}</div>
						<div class="c-meta">{{ c.jobs }} jobs done · last {{ ago(c.last_job) }}</div>
					</div>
				</section>
				<section class="panel">
					<h2>Recommendations <span class="count">{{ view?.recommendations.length ?? 0 }}</span></h2>
					<div v-if="view && !view.recommendations.length" class="empty">Nothing to recommend.</div>
					<div v-for="(r, i) in view?.recommendations || []" :key="i" class="rec">
						<span :class="['pill', r.level === 'act soon' ? 'bad' : 'warn']">{{ r.level === 'act soon' ? 'High' : 'Medium' }}</span>
						<div><b>{{ r.title }}</b><div class="c-meta">{{ r.computer }} · {{ r.why }}</div></div>
					</div>
				</section>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {CONSOLE_URL, ago, fleetView, giveTask, isMission, listTasks, onFleetChange, stationProjects, vkGet, type FleetView} from '@/fleet/api'

const router = useRouter()
const view = ref<FleetView | null>(null)
const missions = ref<any[]>([])
const loading = ref(true)
const projectId = ref<number | null>(null)
const openGive = ref(false)
const giveTitle = ref('')
const giveText = ref('')
const giving = ref(false)
const giveError = ref('')

const totals = computed(() => view.value?.totals || {})
const highRecs = computed(() => (view.value?.recommendations || []).filter(r => r.level === 'act soon').length)
const runningCount = computed(() => missions.value.filter(m => m.state.cls === 'info').length)

function stateOf(t: any, doneJobs: number, jobs: number) {
	if (t.done) {
		return {label: 'accepted', cls: 'ok'}
	}
	if (jobs && doneJobs === jobs) {
		return {label: 'debriefed', cls: 'ok'}
	}
	return {label: 'in progress', cls: 'info'}
}

async function loadMissions() {
	const projects = await stationProjects()
	projectId.value = projects[0]?.id ?? null
	const all: any[] = []
	for (const p of projects) {
		const [open, done] = await Promise.all([listTasks(p.id), listTasks(p.id, true)])
		all.push(...open, ...done)
	}
	const byId = new Map(all.map(t => [t.id, t]))
	const out = []
	for (const t of all.filter(isMission)) {
		const subs = t.related_tasks.subtask as any[]
		let doneJobs = subs.filter(s => (byId.get(s.id) || s).done).length
		if (!subs.every(s => byId.has(s.id))) {
			doneJobs = (await Promise.all(subs.map(s => vkGet<any>(`/tasks/${s.id}`)))).filter(s => s.done).length
		}
		out.push({id: t.id, title: t.title.replace(/^\s*mission\s*:\s*/i, ''), created: t.created, jobs: subs.length, doneJobs, pct: Math.round(100 * doneJobs / subs.length), state: stateOf(t, doneJobs, subs.length)})
	}
	missions.value = out.sort((a, b) => Date.parse(b.created) - Date.parse(a.created))
	loading.value = false
}

async function refresh() {
	view.value = await fleetView()
	await loadMissions()
}

async function submitGive() {
	giving.value = true
	giveError.value = ''
	try {
		const t = await giveTask(projectId.value as number, giveTitle.value.trim(), giveText.value.trim())
		router.push({name: 'fleet.mission', params: {id: t.id}})
	} catch (e: any) {
		giveError.value = `Could not send it: ${e.message}`
	} finally {
		giving.value = false
	}
}

let stop = () => {}
onMounted(() => {
	refresh()
	stop = onFleetChange(refresh)
})
onUnmounted(() => stop())
</script>

<style lang="scss" scoped>
.fleet { max-width: 1240px; margin: 0 auto; padding: .5rem .25rem 3rem; }
.fleet-head { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
.fleet-head h1 { font-size: 2rem; font-weight: 750; letter-spacing: -.025em; margin: 0; color: var(--text-strong); }
.crumb { color: var(--text-light); font-size: .85rem; margin: 0; }
.sub { color: var(--text-light); margin: .15rem 0 0; }
.cta { margin-inline-start: auto; background: var(--fleet-brand, #ff4f00); color: #fff; border: 0; border-radius: 10px; padding: .6rem 1rem; font-weight: 700; font-size: .95rem; cursor: pointer; }
.cta:disabled { opacity: .55; cursor: not-allowed; }
.give { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 1rem 1.1rem; margin-bottom: 1.25rem; display: grid; gap: .45rem; box-shadow: var(--shadow-sm); }
.give label { font-weight: 600; font-size: .9rem; }
.give input, .give textarea { border: 1px solid var(--border); border-radius: 10px; padding: .6rem .75rem; font: inherit; background: var(--white); color: var(--text-strong); }
.give-row { display: flex; gap: 1rem; align-items: center; }
.hint { color: var(--text-light); font-size: .85rem; flex: 1; }
.err, .notice { color: var(--danger); }
.notice { color: var(--text-light); background: var(--fleet-quiet, #f6f3ee); border-radius: 10px; padding: .7rem 1rem; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: .9rem; margin-bottom: 1.25rem; }
.kpi { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: .9rem 1.1rem; box-shadow: var(--shadow-sm); }
.kpi small { color: var(--text-light); display: block; font-size: .8rem; }
.kpi b { display: block; font-size: 1.7rem; font-weight: 700; letter-spacing: -.02em; color: var(--text-strong); }
.kpi b.bad { color: var(--danger); }
.kpi span { color: var(--text-light); font-size: .8rem; }
.cols { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.1rem; }
@media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
.panel { background: var(--white); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-sm); margin-bottom: 1.1rem; overflow: hidden; }
.panel h2 { font-size: 1rem; font-weight: 700; margin: 0; padding: .85rem 1.1rem; border-bottom: 1px solid var(--border); display: flex; gap: .5rem; align-items: center; }
.count { color: var(--text-light); font-weight: 500; font-size: .85rem; background: var(--fleet-quiet, #f6f3ee); border-radius: 999px; padding: 0 .5rem; }
.empty { padding: 1.6rem 1.1rem; color: var(--text-light); text-align: center; }
.empty b { display: block; color: var(--text-strong); margin-bottom: .2rem; }
.mission { display: block; padding: .9rem 1.1rem; border-bottom: 1px solid var(--border-light); color: inherit; }
.mission:hover { background: var(--fleet-quiet, #f6f3ee); }
.m-top { display: flex; gap: .75rem; align-items: flex-start; justify-content: space-between; }
.m-title { color: var(--text-strong); }
.m-meta, .c-meta { color: var(--text-light); font-size: .82rem; margin-top: .3rem; }
.bar { height: 6px; border-radius: 999px; background: var(--grey-200); overflow: hidden; margin-top: .55rem; }
.bar i { display: block; height: 100%; background: var(--primary); }
.pill { font-size: .75rem; font-weight: 700; border-radius: 999px; padding: .1rem .55rem; white-space: nowrap; }
.pill.ok { background: hsla(var(--success-h), var(--success-s), var(--success-l), .12); color: var(--success); }
.pill.info { background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), .12); color: var(--primary); }
.pill.bad { background: hsla(var(--danger-h), var(--danger-s), var(--danger-l), .12); color: var(--danger); }
.pill.warn { background: hsla(var(--warning-h), var(--warning-s), var(--warning-l), .14); color: var(--warning); }
.computer, .rec { padding: .8rem 1.1rem; border-bottom: 1px solid var(--border-light); }
.rec { display: flex; gap: .7rem; align-items: flex-start; }
.c-top { display: flex; justify-content: space-between; align-items: center; }
.dot { font-size: .8rem; font-weight: 650; display: inline-flex; align-items: center; gap: .35rem; }
.dot::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.dot.ok { color: var(--success); }
.dot.warn { color: var(--warning); }
</style>
