<template>
	<div class="fleet-page fleet-home">
		<p class="crumb">Monitoring / Overview</p>
		<header class="page-head">
			<div>
				<h1><span class="h-icon" style="--c:#2383e2">◉</span>Monitoring</h1>
				<p class="sub">Your computers, the work they do, and what needs attention.</p>
			</div>
		</header>
		<MonitorTabs />
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
				<RouterLink :to="{name: 'fleet.devices'}">▣ Devices</RouterLink>
				<RouterLink :to="{name: 'fleet.live'}">◉ Live monitoring</RouterLink>
				<a href="#recommendations">◉ Recommendations</a>
				<RouterLink :to="{name: 'home'}">☰ Tasks</RouterLink>
			</nav>
		</section>

		<section class="lists">
			<div class="list">
				<h3><RouterLink :to="{name: 'fleet.devices'}">Computers</RouterLink><span class="badge">{{ view?.computers.length ?? 0 }}</span></h3>
				<div v-if="view && !view.computers.length" class="empty">No computer has joined yet.</div>
				<a v-for="c in view?.computers || []" :key="c.name" class="li" href="#computers" :title="`${c.chip} · ${c.memory_gb} GB · ${c.model}`">
					<span class="li-icon" :class="c.state === 'connected' ? 'on' : 'off'">▣</span>
					<span class="li-name">{{ c.name }}</span>
					<span class="li-meta">{{ c.model || '' }}</span>
					<span class="chev">›</span>
				</a>
			</div>
			<div class="list">
				<h3>Missions<span class="badge">{{ missions.length }}</span></h3>
				<div v-if="!loading && !missions.length" class="empty placeholder">Describe an outcome above</div>
				<RouterLink v-for="m in missions.slice(0, 5)" :key="m.id" class="li" :to="{name: 'fleet.mission', params: {id: m.id}}">
					<span :class="['li-icon', m.state.cls]">▦</span>
					<span class="li-name">{{ m.title }}</span>
					<span class="chev">›</span>
				</RouterLink>
			</div>
			<div class="list">
				<h3><RouterLink :to="{name: 'fleet.live'}">Recent activity</RouterLink></h3>
				<div v-for="(l, i) in (view?.log || []).slice(0, 5)" :key="i" class="li static">
					<span class="li-icon hist">↺</span>
					<span class="li-name"><span class="muted">{{ l.who || 'hub' }} /</span> {{ l.what }}</span>
					<span class="li-meta">{{ ago(l.ts) }}</span>
				</div>
			</div>
		</section>

		<section v-if="view?.recommendations.length" id="recommendations" class="recs">
			<h2>Recommendations <span class="badge">{{ view.recommendations.length }}</span></h2>
			<div v-for="(r, i) in view.recommendations" :key="i" class="rec">
				<span :class="['pill', r.level === 'act soon' ? 'bad' : 'warn']"><i />{{ r.level === 'act soon' ? 'High' : 'Medium' }}</span>
				<b>{{ r.title }}</b>
				<span class="muted">{{ r.computer }} · {{ r.why }}</span>
			</div>
		</section>

		<section class="analytics">
			<div class="a-head">
				<h2>Activity</h2>
				<div class="range" role="group" aria-label="Time range">
					<button type="button" :class="{on: range === '24h'}" @click="range = '24h'">Last 24 hours</button>
					<button type="button" :class="{on: range === '7d'}" @click="range = '7d'">Last 7 days</button>
				</div>
			</div>
			<div class="cards big">
				<div v-for="m in bigMetrics" :key="m.key" class="card">
					<div class="c-title">{{ m.label }}</div>
					<div class="c-num">{{ fmt(m.total) }}<span v-if="m.change !== null" :class="['chg', m.change >= 0 ? 'up' : 'down']">{{ m.change >= 0 ? '↗' : '↘' }} {{ Math.abs(m.change) }}%</span></div>
					<svg class="chart" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
						<path :d="area(m.values, 300, 90)" class="fill" />
						<path :d="line(m.values, 300, 90)" class="stroke" />
					</svg>
					<div class="axis"><span>{{ labels[0] }}</span><span>{{ labels[labels.length - 1] }}</span></div>
				</div>
			</div>
			<div class="cards small">
				<div v-for="m in smallMetrics" :key="m.key" class="card">
					<div class="c-title">{{ m.label }}</div>
					<div class="c-num">{{ fmt(m.total) }}</div>
					<svg class="chart" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">
						<path :d="area(m.values, 200, 60)" class="fill" />
						<path :d="line(m.values, 200, 60)" class="stroke" />
					</svg>
					<div v-if="!m.total" class="nodata">No data</div>
				</div>
			</div>
		</section>

		<section id="computers" class="block">
			<h2>Computers</h2>
			<table class="ntable">
				<thead><tr><th>Name</th><th>Status</th><th>Chip</th><th>Memory</th><th>Local model</th><th>Jobs</th><th>Last job</th></tr></thead>
				<tbody>
					<tr v-for="c in view?.computers || []" :key="c.name">
						<td class="name">{{ c.name }}</td>
						<td><span :class="['pill', c.state === 'connected' ? 'ok' : 'warn']"><i />{{ c.state }}</span></td>
						<td>{{ c.chip || '?' }}</td><td>{{ c.memory_gb ?? '?' }} GB</td><td>{{ c.model || '–' }}</td><td>{{ c.jobs }}</td><td class="muted">{{ ago(c.last_job) }}</td>
					</tr>
				</tbody>
			</table>
		</section>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {useRouter} from 'vue-router'
import {ago, fleetView, giveTask, isMission, listTasks, onFleetChange, stationProjects, vkGet, type FleetView} from '@/fleet/api'
import {useTitle} from '@/composables/useTitle'
import MonitorTabs from '@/components/fleet/MonitorTabs.vue'

useTitle('Fleet')


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
const range = ref<'24h' | '7d'>('24h')
const series = computed(() => (view.value as any)?.activity?.[range.value] || {labels: [], buckets: [], previous: {}})
const labels = computed<string[]>(() => series.value.labels)
function metric(key: string, label: string) {
	const values = series.value.buckets.map((b: any) => b[key] || 0)
	const total = values.reduce((a: number, b: number) => a + b, 0)
	const prev = series.value.previous?.[key] || 0
	return {key, label, values, total: Math.round(total * 10) / 10, change: prev ? Math.round(100 * (total - prev) / prev) : null}
}
const bigMetrics = computed(() => [metric('jobs', 'Jobs done on local models'), metric('seconds', 'Local compute (seconds)')])
const smallMetrics = computed(() => [metric('tokens', 'Local tokens'), metric('checks', 'Checks run'), metric('missions', 'Missions started'), metric('errors', 'Errors')])
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 1 : 2)}k` : String(n))
function pts(v: number[], w: number, h: number) {
	const max = Math.max(1, ...v)
	const step = v.length > 1 ? w / (v.length - 1) : w
	return v.map((x, i) => [i * step, h - 4 - (x / max) * (h - 10)])
}
const line = (v: number[], w: number, h: number) => (v.length ? 'M' + pts(v, w, h).map(p => p.map(n => n.toFixed(1)).join(',')).join(' L') : '')
const area = (v: number[], w: number, h: number) => (v.length ? `${line(v, w, h)} L${w},${h} L0,${h} Z` : '')
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
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .6rem; margin: 2rem 0 1.6rem; }
.kpi { display: flex; gap: .75rem; align-items: center; padding: .8rem .9rem; border-radius: 10px; background: var(--fleet-sidebar, #f7f6f3); }
.kpi b { display: block; font-size: 1.35rem; font-weight: 700; color: var(--text-strong); line-height: 1.2; }
.kpi b.bad { color: #e03e3e; }
.kpi small, .row small, td small { display: block; color: var(--text-light); font-size: .8rem; }
.k-icon, .h-icon { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); font-size: .95rem; flex: none; }
.block { margin-bottom: 1.8rem; }
.block h2 { display: flex; align-items: center; font-size: 1.15rem; font-weight: 700; color: var(--text-strong); margin: 0 0 .5rem; }
.name { font-weight: 500; color: var(--text-strong); }
.doc { color: var(--text-light); margin-inline-end: .45rem; }
.bar { height: 5px; border-radius: 999px; background: var(--border); overflow: hidden; width: 140px; }
.bar i { display: block; height: 100%; background: #2383e2; }
.pill.ok i { background: #448361; }
.pill.info i { background: #2383e2; }
.pill.warn i { background: #cb912f; }
.pill.bad i { background: #e03e3e; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6rem; }
@media (max-width: 860px) { .cols { grid-template-columns: 1fr; } }
.row { display: flex; justify-content: space-between; gap: 1rem; padding: .6rem .3rem; border-bottom: 1px solid var(--border-light); }
.row b { color: var(--text-strong); font-weight: 600; }
.right { text-align: right; flex: none; }

// Cloudflare direction (Yomi 2026-11-18: "the dashboard for cloudflare ... with the computers like the domains" and "charts here too")
.lists { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem; margin: 2.2rem 0 1.8rem; text-align: left; }
@media (max-width: 900px) { .lists { grid-template-columns: 1fr; } }
.list h3 { display: flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 600; color: var(--text-light); margin: 0 0 .3rem; padding-bottom: .4rem; border-bottom: 1px solid var(--border); }
.list h3 a { color: var(--text-light); }
.li { display: flex; align-items: center; gap: .55rem; padding: .62rem .1rem; border-bottom: 1px solid var(--border-light); color: var(--text-strong); font-size: .9rem; }
.li:hover:not(.static) { background: var(--fleet-quiet); }
.li-icon { width: 20px; text-align: center; color: var(--text-light); font-size: .85rem; }
.li-icon.on, .li-icon.ok { color: #0f7b6c; }
.li-icon.off { color: #9b9a97; }
.li-icon.info { color: #2383e2; }
.li-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.li-meta { color: var(--text-light); font-size: .78rem; white-space: nowrap; }
.chev { color: var(--text-light); }
.placeholder { background: var(--fleet-sidebar, #f7f6f3); border-radius: 8px; text-align: center; margin-top: .5rem; }
.recs { margin-bottom: 1.8rem; }
.recs h2, .analytics h2, .block h2 { font-size: 1.1rem; font-weight: 700; color: var(--text-strong); margin: 0 0 .6rem; display: flex; align-items: center; gap: .5rem; }
.rec { display: flex; align-items: baseline; gap: .7rem; padding: .55rem .1rem; border-bottom: 1px solid var(--border-light); flex-wrap: wrap; }
.rec b { color: var(--text-strong); font-weight: 600; }
.analytics { margin-bottom: 2rem; }
.a-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .7rem; }
.range { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.range button { border: 0; background: var(--white); color: var(--text-light); padding: .35rem .75rem; font: inherit; font-size: .82rem; cursor: pointer; }
.range button.on { background: var(--fleet-quiet); color: var(--text-strong); font-weight: 600; }
.cards { display: grid; gap: .6rem; margin-bottom: .6rem; }
.cards.big { grid-template-columns: 1fr 1fr; }
.cards.small { grid-template-columns: repeat(4, 1fr); }
@media (max-width: 900px) { .cards.big, .cards.small { grid-template-columns: 1fr 1fr; } }
.card { position: relative; border: 1px solid var(--border); border-radius: 10px; padding: .75rem .85rem .5rem; background: var(--white); }
.c-title { font-size: .8rem; color: var(--text-light); }
.c-num { font-size: 1.5rem; font-weight: 700; color: var(--text-strong); display: flex; align-items: baseline; gap: .5rem; margin: .1rem 0 .3rem; }
.small .c-num { font-size: 1.2rem; }
.chg { font-size: .78rem; font-weight: 600; }
.chg.up { color: #0f7b6c; }
.chg.down { color: #e03e3e; }
.chart { width: 100%; height: 90px; display: block; }
.small .chart { height: 56px; }
.chart .stroke { fill: none; stroke: #2383e2; stroke-width: 1.6; vector-effect: non-scaling-stroke; }
.chart .fill { fill: rgba(35, 131, 226, .10); stroke: none; }
.axis { display: flex; justify-content: space-between; font-size: .72rem; color: var(--text-light); }
.nodata { position: absolute; inset: auto 0 1.4rem 0; text-align: center; font-size: .78rem; color: var(--text-light); }
</style>
