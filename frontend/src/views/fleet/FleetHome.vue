<template>
	<div class="fleet">
		<section class="ask">
			<div class="ask-icon" aria-hidden="true">
				<svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="22" fill="#fff" stroke="#e9e9e7" /><path d="M14 30a10 10 0 0 1 20 0" fill="none" stroke="#37352f" stroke-width="2.5" stroke-linecap="round" /><path d="M24 30l6-8" stroke="#e16b16" stroke-width="3" stroke-linecap="round" /><circle cx="24" cy="30" r="2.6" fill="#37352f" /></svg>
			</div>
			<h1>What should the fleet do?</h1>
			<form class="ask-card" @submit.prevent="submitGive">
				<textarea v-model="giveTitle" class="ask-input" rows="2" placeholder="Describe an outcome. The general plans it and your computers do the work." aria-label="What should the fleet do?" @keydown.enter.exact.prevent="submitGive" />
				<textarea v-if="showMaterial" v-model="giveText" class="ask-material" rows="4" placeholder="Paste the material the fleet should work on (notes, a document, a list)" aria-label="Material" />
				<div class="ask-row">
					<button type="button" class="round" :title="showMaterial ? 'Hide material' : 'Add material'" @click="showMaterial = !showMaterial">{{ showMaterial ? '−' : '+' }}</button>
					<button v-for="s in suggestions" :key="s" type="button" class="chip" @click="giveTitle = s">{{ s }}</button>
					<span class="grow" />
					<span class="auto" title="The general (a frontier model) plans and reviews; local models do the work">General: auto</span>
					<button type="submit" class="send" :disabled="giving || !giveTitle.trim() || !projectId" aria-label="Send to the fleet">↑</button>
				</div>
				<div class="ask-foot">
					<span>Working with your computers</span>
					<span v-for="c in view?.computers || []" :key="c.name" class="station" :title="`${c.chip} · ${c.memory_gb} GB · ${c.model}`"><i :class="c.state === 'connected' ? 'on' : 'off'" />{{ c.name }}</span>
					<span v-if="view && !view.computers.length" class="muted">none paired yet</span>
					<span v-if="!view" class="muted">hub not reachable</span>
				</div>
			</form>
			<p v-if="giveError" class="err">{{ giveError }}</p>
			<nav class="quick">
				<a href="#missions">▦ Missions</a>
				<a href="#computers">▣ Computers</a>
				<a href="#recommendations">◉ Recommendations</a>
				<RouterLink :to="{name: 'home'}">☰ Tasks</RouterLink>
			</nav>
		</section>

		<section class="kpis">
			<div class="kpi"><span class="k-icon" style="--c:#0f7b6c">▣</span><div><b>{{ totals.connected ?? '–' }} of {{ totals.computers ?? '–' }}</b><small>computers connected · {{ totals.memory_gb ?? 0 }} GB</small></div></div>
			<div class="kpi"><span class="k-icon" style="--c:#e03e3e">◉</span><div><b :class="{bad: highRecs}">{{ totals.recommendations ?? '–' }}</b><small>recommendations · {{ highRecs }} high</small></div></div>
			<div class="kpi"><span class="k-icon" style="--c:#2383e2">▦</span><div><b>{{ missions.length }}</b><small>missions · {{ runningCount }} in progress</small></div></div>
			<div class="kpi"><span class="k-icon" style="--c:#e16b16">⚡</span><div><b>{{ totals.jobs ?? '–' }}</b><small>jobs on local models · {{ totals.local_seconds ?? 0 }} s</small></div></div>
		</section>

		<section id="missions" class="block">
			<h2><span class="h-icon" style="--c:#2383e2">▦</span>Missions</h2>
			<div v-if="loading" class="empty">Loading…</div>
			<div v-else-if="!missions.length" class="empty">No missions yet. Describe an outcome above.</div>
			<table v-else class="ntable">
				<thead><tr><th>Mission</th><th>Status</th><th>Progress</th><th>Created</th></tr></thead>
				<tbody>
					<tr v-for="m in missions" :key="m.id" @click="router.push({name: 'fleet.mission', params: {id: m.id}})">
						<td class="name"><span class="doc">▤</span>{{ m.title }}</td>
						<td><span :class="['pill', m.state.cls]"><i />{{ m.state.label }}</span></td>
						<td><div class="bar"><i :style="{width: m.pct + '%'}" /></div><small>{{ m.doneJobs }} of {{ m.jobs }} jobs</small></td>
						<td class="muted">{{ ago(m.created) }}</td>
					</tr>
				</tbody>
			</table>
		</section>

		<div class="cols">
			<section id="computers" class="block">
				<h2><span class="h-icon" style="--c:#0f7b6c">▣</span>Computers</h2>
				<div v-if="view && !view.computers.length" class="empty">Install the station on a computer on this network and approve its pairing code.</div>
				<div v-for="c in view?.computers || []" :key="c.name" class="row">
					<div><b>{{ c.name }}</b><small>{{ c.chip || '?' }} · {{ c.memory_gb ?? '?' }} GB · {{ c.model || 'no local model' }}</small></div>
					<div class="right"><span :class="['pill', c.state === 'connected' ? 'ok' : 'warn']"><i />{{ c.state }}</span><small>{{ c.jobs }} jobs · last {{ ago(c.last_job) }}</small></div>
				</div>
			</section>
			<section id="recommendations" class="block">
				<h2><span class="h-icon" style="--c:#e03e3e">◉</span>Recommendations</h2>
				<div v-if="view && !view.recommendations.length" class="empty">Nothing to recommend.</div>
				<div v-for="(r, i) in view?.recommendations || []" :key="i" class="row">
					<div><b>{{ r.title }}</b><small>{{ r.computer }} · {{ r.why }}</small></div>
					<div class="right"><span :class="['pill', r.level === 'act soon' ? 'bad' : 'warn']"><i />{{ r.level === 'act soon' ? 'High' : 'Medium' }}</span></div>
				</div>
			</section>
		</div>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {ago, fleetView, giveTask, isMission, listTasks, onFleetChange, stationProjects, vkGet, type FleetView} from '@/fleet/api'

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
const showMaterial = ref(false)
const suggestions = ['Make sure all security patches are installed', 'Report disk, memory and uptime on every computer', 'Summarize the material I paste']

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
// Notion direction: white page, centred ask box with a soft shadow, colourful small icons, quiet tables, soft status pills.
.fleet { max-width: 1080px; margin: 0 auto; padding: 1rem .5rem 4rem; color: var(--text); }
.ask { text-align: center; padding: 1.5rem 0 1rem; }
.ask-icon { display: flex; justify-content: center; margin-bottom: .6rem; }
.ask h1 { font-size: 2rem; font-weight: 700; letter-spacing: -.02em; color: var(--text-strong); margin: 0 0 1.4rem; }
.ask-card { max-width: 720px; margin: 0 auto; text-align: left; background: var(--white); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 6px 24px rgba(15, 15, 15, .07), 0 1px 3px rgba(15, 15, 15, .05); overflow: hidden; }
.ask-input, .ask-material { width: 100%; border: 0; outline: 0; resize: none; font: inherit; font-size: 1.02rem; padding: 1rem 1.1rem .4rem; background: transparent; color: var(--text-strong); }
.ask-material { font-size: .92rem; border-top: 1px dashed var(--border); padding-top: .7rem; }
.ask-row { display: flex; align-items: center; gap: .45rem; padding: .45rem .7rem .7rem; flex-wrap: wrap; }
.grow { flex: 1; }
.round { width: 30px; height: 30px; border-radius: 50%; border: 1px solid var(--border); background: var(--white); color: var(--text-light); font-size: 1.1rem; line-height: 1; cursor: pointer; }
.chip { border: 1px solid var(--border); background: var(--white); color: var(--text-light); border-radius: 999px; padding: .25rem .7rem; font-size: .82rem; cursor: pointer; }
.chip:hover, .round:hover { background: var(--fleet-quiet); color: var(--text-strong); }
.auto { color: var(--text-light); font-size: .85rem; }
.send { width: 32px; height: 32px; border-radius: 50%; border: 0; background: var(--primary); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.send:disabled { background: var(--grey-200); color: var(--text-light); cursor: not-allowed; }
.ask-foot { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; padding: .6rem 1.1rem; background: var(--fleet-sidebar, #f7f6f3); border-top: 1px solid var(--border-light); font-size: .82rem; color: var(--text-light); }
.station { display: inline-flex; align-items: center; gap: .35rem; background: var(--white); border: 1px solid var(--border); border-radius: 6px; padding: .1rem .5rem; color: var(--text); }
.station i { width: 7px; height: 7px; border-radius: 50%; background: #9b9a97; }
.station i.on { background: #0f7b6c; }
.quick { display: flex; justify-content: center; gap: 1.4rem; margin-top: 1.1rem; font-size: .9rem; }
.quick a { color: var(--text-light); }
.quick a:hover { color: var(--text-strong); }
.err { color: var(--danger); text-align: center; }
.muted { color: var(--text-light); }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .6rem; margin: 2rem 0 1.6rem; }
.kpi { display: flex; gap: .75rem; align-items: center; padding: .8rem .9rem; border-radius: 10px; background: var(--fleet-sidebar, #f7f6f3); }
.kpi b { display: block; font-size: 1.35rem; font-weight: 700; color: var(--text-strong); line-height: 1.2; }
.kpi b.bad { color: #e03e3e; }
.kpi small, .row small, td small { display: block; color: var(--text-light); font-size: .8rem; }
.k-icon, .h-icon { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); font-size: .95rem; flex: none; }
.h-icon { width: 24px; height: 24px; font-size: .8rem; border-radius: 6px; margin-inline-end: .55rem; }
.block { margin-bottom: 1.8rem; }
.block h2 { display: flex; align-items: center; font-size: 1.15rem; font-weight: 700; color: var(--text-strong); margin: 0 0 .5rem; }
.ntable { width: 100%; border-collapse: collapse; font-size: .92rem; }
.ntable th { text-align: left; font-weight: 500; font-size: .82rem; color: var(--text-light); padding: .45rem .5rem; border-bottom: 1px solid var(--border); }
.ntable td { padding: .55rem .5rem; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
.ntable tbody tr { cursor: pointer; }
.ntable tbody tr:hover { background: var(--fleet-quiet); }
.name { font-weight: 500; color: var(--text-strong); }
.doc { color: var(--text-light); margin-inline-end: .45rem; }
.bar { height: 5px; border-radius: 999px; background: var(--border); overflow: hidden; width: 140px; }
.bar i { display: block; height: 100%; background: #2383e2; }
.pill { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 500; border-radius: 999px; padding: .1rem .55rem; white-space: nowrap; }
.pill i { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.pill.ok { background: #dbeddb; color: #1c3829; }
.pill.ok i { background: #448361; }
.pill.info { background: #d3e5ef; color: #183347; }
.pill.info i { background: #2383e2; }
.pill.warn { background: #fdecc8; color: #402c1b; }
.pill.warn i { background: #cb912f; }
.pill.bad { background: #ffe2dd; color: #5d1715; }
.pill.bad i { background: #e03e3e; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
.row { display: flex; justify-content: space-between; gap: 1rem; padding: .6rem .3rem; border-bottom: 1px solid var(--border-light); }
.row b { color: var(--text-strong); font-weight: 600; }
.right { text-align: right; flex: none; }
.empty { color: var(--text-light); padding: .8rem .3rem; }
</style>
