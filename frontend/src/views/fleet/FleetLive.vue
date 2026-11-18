<template>
	<div class="page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Live monitoring</p>
		<header class="head">
			<h1><span class="h-icon" style="--c:#e03e3e">◉</span>Live monitoring</h1>
			<p class="sub">Everything the hub records, as it happens: devices connecting, jobs, checks, missions and errors. Each event links to its task.</p>
		</header>

		<div class="bar">
			<select v-model="source" aria-label="Source"><option value="">All events</option><option value="ok">Success</option><option value="error">Errors</option><option value="warn">Warnings</option></select>
			<input v-model="q" type="search" placeholder="Filter by device, event or task number" aria-label="Filter events">
			<button type="button" :class="['live', {on: live}]" @click="toggleLive"><i />{{ live ? 'Live' : 'Paused' }}</button>
			<select v-model="range" aria-label="Time range"><option value="24h">Last 24 hours</option><option value="7d">Last 7 days</option></select>
		</div>

		<section class="chart-box">
			<div class="c-head"><b>Events</b><span class="legend"><i class="s" />{{ okTotal }} success</span><span class="legend"><i class="e" />{{ errTotal }} errors</span></div>
			<svg class="bars" :viewBox="`0 0 ${buckets.length * 20} 100`" preserveAspectRatio="none" aria-hidden="true">
				<g v-for="(b, i) in buckets" :key="i">
					<rect :x="i * 20 + 3" :y="100 - h(b.jobs + b.missions)" width="14" :height="h(b.jobs + b.missions)" class="s" />
					<rect :x="i * 20 + 3" :y="100 - h(b.jobs + b.missions) - h(b.errors)" width="14" :height="h(b.errors)" class="e" />
				</g>
			</svg>
			<div class="axis"><span>{{ labels[0] }}</span><span>{{ labels[Math.floor(labels.length / 2)] }}</span><span>now</span></div>
		</section>

		<section class="events">
			<table class="ntable">
				<thead><tr><th>Time (UTC)</th><th>Level</th><th>Source</th><th>Event</th><th>Detail</th><th>Task</th></tr></thead>
				<tbody>
					<tr v-for="(l, i) in rows" :key="i" :class="{fresh: i < fresh}">
						<td class="mono">{{ (l.ts || '').replace('T', ' ').replace('Z', '') }}</td>
						<td><span :class="['lv', l.level]">{{ l.level }}</span></td>
						<td class="src">{{ l.who || 'hub' }}</td>
						<td>{{ l.what }}</td>
						<td class="mono muted">{{ l.detail }}</td>
						<td><RouterLink v-if="l.task" :to="{name: 'task.detail', params: {id: l.task}}">#{{ l.task }}</RouterLink></td>
					</tr>
				</tbody>
			</table>
			<div v-if="!rows.length" class="empty"><b>No events found</b>Events appear here as the hub records them.</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {fleetView, onFleetChange, type FleetView} from '@/fleet/api'

const view = ref<(FleetView & {activity?: any}) | null>(null)
const q = ref('')
const source = ref('')
const range = ref<'24h' | '7d'>('24h')
const live = ref(true)
const fresh = ref(0)

const series = computed(() => view.value?.activity?.[range.value] || {labels: [], buckets: []})
const buckets = computed<any[]>(() => series.value.buckets)
const labels = computed<string[]>(() => series.value.labels)
const max = computed(() => Math.max(1, ...buckets.value.map(b => b.jobs + b.missions + b.errors)))
const h = (n: number) => (n / max.value) * 92
const okTotal = computed(() => buckets.value.reduce((a, b) => a + b.jobs + b.missions, 0))
const errTotal = computed(() => buckets.value.reduce((a, b) => a + b.errors, 0))
const rows = computed(() => (view.value?.log || []).filter((l: any) => (!source.value || l.level === source.value) &&
	(!q.value || `${l.who} ${l.what} ${l.detail} ${l.task}`.toLowerCase().includes(q.value.toLowerCase()))))

async function refresh() {
	const before = view.value?.log?.length || 0
	view.value = await fleetView()
	fresh.value = before ? Math.max(0, (view.value?.log?.length || 0) - before) : 0
}
let stop = () => {}
function toggleLive() {
	live.value = !live.value
	stop()
	stop = live.value ? onFleetChange(refresh) : () => {}
	if (live.value) {
		refresh()
	}
}
onMounted(() => {
	refresh()
	stop = onFleetChange(refresh)
})
onUnmounted(() => stop())
</script>

<style lang="scss" scoped>
.page { max-width: 1240px; margin: 0 auto; padding: .5rem .5rem 4rem; color: var(--text); }
.crumb { color: var(--text-light); font-size: .85rem; margin: 0 0 .2rem; }
.head h1 { display: flex; align-items: center; gap: .6rem; font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin: 0; color: var(--text-strong); }
.sub { color: var(--text-light); margin: .2rem 0 1.2rem; }
.h-icon { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); font-size: 1rem; }
.bar { display: flex; gap: .5rem; align-items: center; margin-bottom: .8rem; flex-wrap: wrap; }
.bar input, .bar select { border: 1px solid var(--border); border-radius: 8px; padding: .42rem .7rem; font: inherit; font-size: .9rem; background: var(--white); color: var(--text-strong); }
.bar input { flex: 1; min-width: 240px; }
.live { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid var(--border); background: var(--white); border-radius: 8px; padding: .42rem .8rem; font: inherit; font-size: .9rem; cursor: pointer; color: var(--text-light); }
.live i { width: 8px; height: 8px; border-radius: 50%; background: #9b9a97; }
.live.on { color: var(--text-strong); font-weight: 600; }
.live.on i { background: #448361; box-shadow: 0 0 0 3px rgba(68, 131, 97, .2); }
.chart-box { border: 1px solid var(--border); border-radius: 10px; padding: .7rem .9rem .5rem; margin-bottom: 1rem; }
.c-head { display: flex; gap: 1rem; align-items: center; font-size: .88rem; margin-bottom: .4rem; }
.c-head b { color: var(--text-strong); margin-inline-end: auto; }
.legend { display: inline-flex; align-items: center; gap: .35rem; color: var(--text-light); font-size: .8rem; }
.legend i { width: 9px; height: 9px; border-radius: 2px; }
.s { fill: #9ec5ea; background: #9ec5ea; }
.e { fill: #f0a49b; background: #f0a49b; }
.bars { width: 100%; height: 110px; display: block; }
.axis { display: flex; justify-content: space-between; font-size: .72rem; color: var(--text-light); }
.ntable { width: 100%; border-collapse: collapse; font-size: .86rem; }
.ntable th { text-align: left; font-weight: 500; font-size: .78rem; color: var(--text-light); padding: .45rem .5rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--white); }
.ntable td { padding: .45rem .5rem; border-bottom: 1px solid var(--border-light); vertical-align: top; }
.ntable tr.fresh { animation: flash 2s ease-out; }
@keyframes flash { from { background: rgba(35, 131, 226, .12); } to { background: transparent; } }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: .78rem; white-space: nowrap; }
.mono.muted { white-space: normal; word-break: break-word; }
.muted { color: var(--text-light); }
.src { font-weight: 600; color: var(--text-strong); }
.lv { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; border-radius: 4px; padding: .05rem .4rem; background: #e3e2e0; color: #32302c; }
.lv.ok { background: #dbeddb; color: #1c3829; }
.lv.warn { background: #fdecc8; color: #402c1b; }
.lv.error { background: #ffe2dd; color: #5d1715; }
.lv.info { background: #d3e5ef; color: #183347; }
.empty { text-align: center; color: var(--text-light); padding: 2.4rem 1rem; }
.empty b { display: block; color: var(--text-strong); }
</style>
