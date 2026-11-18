<template>
	<div class="fleet-page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Live monitoring</p>
		<header class="page-head">
			<div>
				<h1><span class="h-icon" style="--c:#e03e3e">◉</span>Live monitoring</h1>
				<p class="sub">Watch the whole system, or pick one device. Everything the hub records appears as it happens, and each event links to its task.</p>
			</div>
		</header>

		<div class="picker">
			<select v-model="dev" aria-label="What to monitor">
				<option value="">Whole system</option>
				<optgroup label="Fleet computers"><option v-for="c in fleetComputers" :key="c.name" :value="'fleet:' + c.name">{{ c.name }} ({{ c.state }})</option></optgroup>
				<optgroup label="Network devices"><option v-for="d in netDevices" :key="d.ip" :value="'net:' + d.ip">{{ d.label }} · {{ d.ip }}</option></optgroup>
			</select>
		</div>

		<section v-if="!dev" class="tiles">
			<div class="tile"><span>Hub computer</span><b>{{ sys?.name || 'hub' }}</b><small>up {{ sys?.up_since ? ago(sys.up_since).replace(' ago', '') : '?' }}</small></div>
			<div class="tile"><span>Processor load</span><b>{{ cpuPct }}%</b><small>{{ sys?.load?.[0] }} on {{ sys?.cpus }} threads (1 min)</small><i class="meter"><em :style="{width: cpuPct + '%', background: pctColor(cpuPct)}" /></i></div>
			<div class="tile"><span>Memory</span><b>{{ sys?.memory?.used_gb }} / {{ sys?.memory?.total_gb }} GB</b><small>{{ memPct }}% in use</small><i class="meter"><em :style="{width: memPct + '%', background: pctColor(memPct)}" /></i></div>
			<div class="tile"><span>Disk free</span><b>{{ sys?.disk?.free_gb }} GB</b><small>of {{ sys?.disk?.total_gb }} GB</small><i class="meter"><em :style="{width: diskPct + '%', background: pctColor(diskPct)}" /></i></div>
			<div class="tile"><span>Fleet computers</span><b>{{ connected }} / {{ fleetComputers.length }}</b><small>connected</small></div>
			<div class="tile"><span>Network devices</span><b>{{ net?.online ?? '?' }} / {{ net?.devices?.length ?? '?' }}</b><small>online · {{ net?.with_risks ?? 0 }} to check</small></div>
			<div class="tile"><span>Errors</span><b :class="{red: errTotal}">{{ errTotal }}</b><small>{{ range === '24h' ? 'last 24 hours' : 'last 7 days' }}</small></div>
		</section>

		<nav class="tabs live-tabs" role="tablist" aria-label="Live monitoring views">
			<button type="button" role="tab" :aria-selected="view2 === 'availability'" :class="{on: view2 === 'availability'}" @click="view2 = 'availability'">Availability</button>
			<button type="button" role="tab" :aria-selected="view2 === 'events'" :class="{on: view2 === 'events'}" @click="view2 = 'events'">Events<span class="badge">{{ rows.length }}</span></button>
		</nav>
		<template v-if="view2 === 'availability'">
		<section v-if="!dev" class="card monitors">
			<header><span>Availability, last 24 hours</span><span class="muted sm">one slot per 10-minute network scan</span></header>
			<div v-for="m in monitorRows" :key="m.key" class="mon" @click="dev = m.key">
				<span class="mon-name"><b>{{ m.title }}</b><small class="muted">{{ m.kind }}</small></span>
				<StatusStrip :slots="m.slots" compact :title-for="slotTitle" />
				<span class="mon-pct muted">{{ m.pct }}</span>
			</div>
			<div v-if="!monitorRows.length" class="empty">No scans recorded yet.</div>
		</section>

		<section v-else-if="current" class="devcard">
			<header>
				<div><h2>{{ current.title }}</h2><small class="muted">{{ current.kind }} · {{ current.address || 'no address' }}</small></div>
				<span :class="['pill', current.up ? 'ok' : 'bad']"><i />{{ current.status }}</span>
				<RouterLink class="ghost" :to="{name: 'fleet.devices'}">Device details</RouterLink>
			</header>
			<dl>
				<div v-for="f in current.facts" :key="f[0]"><dt>{{ f[0] }}</dt><dd>{{ f[1] }}</dd></div>
			</dl>
			<div class="avail">
				<div class="c-head"><b>Availability, last 24 hours</b><span class="muted">{{ availPct }}</span></div>
				<StatusStrip :slots="strip.join('')" legend :title-for="slotTitle" />
				<div class="axis"><span>24 h ago</span><span>12 h ago</span><span>now</span></div>
			</div>
			<div v-if="current.risks.length" class="risks"><b>Worth checking</b><div v-for="(r, i) in current.risks" :key="i" class="risk">{{ r }}</div></div>
		</section>
		</template>
		<template v-else>
		<div class="toolbar">
			<select v-model="source" aria-label="Source"><option value="">All levels</option><option value="ok">Success</option><option value="error">Errors</option><option value="warn">Warnings</option></select>
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
						<td><a v-if="l.task && hubTaskHref(view, l.task)" :href="hubTaskHref(view, l.task) || ''" target="_blank" rel="noopener" title="Opens on the board the hub uses">#{{ l.task }} ↗</a><RouterLink v-else-if="l.task" :to="{name: 'task.detail', params: {id: l.task}}">#{{ l.task }}</RouterLink></td>
					</tr>
				</tbody>
			</table>
			<div v-if="!rows.length" class="empty"><b>No events found</b>Events appear here as the hub records them.</div>
		</section>
		</template>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {ago, fleetView, hubTaskHref, onFleetChange, type FleetView} from '@/fleet/api'
import StatusStrip from '@/components/fleet/StatusStrip.vue'
import {useTitle} from '@/composables/useTitle'

useTitle('Live monitoring')


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
const dev = ref('')
// Two views of the same data: availability over time, or the event log (Yomi 2026-11-18: no scrolling to reach events)
const view2 = ref<'availability' | 'events'>('availability')
const sys = computed<any>(() => (view.value as any)?.system || null)
const net = computed<any>(() => (view.value as any)?.network || null)
const fleetComputers = computed(() => (view.value?.computers || []).filter(c => c.state !== 'waiting for approval'))
const fleetIps = computed(() => new Set(fleetComputers.value.map(c => c.address)))
const netDevices = computed<any[]>(() => (net.value?.devices || []).filter((d: any) => !fleetIps.value.has(d.ip)))
const connected = computed(() => fleetComputers.value.filter(c => c.state === 'connected').length)
const pct = (a?: number, b?: number) => (a != null && b ? Math.min(100, Math.round((a / b) * 100)) : 0)
const cpuPct = computed(() => pct(sys.value?.load?.[0], sys.value?.cpus))
const memPct = computed(() => pct(sys.value?.memory?.used_gb, sys.value?.memory?.total_gb))
const diskPct = computed(() => 100 - pct(sys.value?.disk?.free_gb, sys.value?.disk?.total_gb))
const pctColor = (p: number) => (p >= 90 ? '#e03e3e' : p >= 70 ? '#d9730d' : '#448361')
const current = computed<any>(() => {
	if (dev.value.startsWith('fleet:')) {
		const c = fleetComputers.value.find(x => x.name === dev.value.slice(6))
		if (!c) {
			return null
		}
		const n = (net.value?.devices || []).find((d: any) => d.ip === c.address)
		return {title: c.name, kind: 'Fleet computer, paired with the hub', address: c.address, up: c.state === 'connected', status: c.state, names: [c.name, c.member], ip: c.address,
			risks: n?.risks || [], facts: [['Hardware', `${c.chip || '?'} · ${c.memory_gb ?? '?'} GB`], ['Model', c.model || 'none'], ['Work done', `${c.jobs} jobs · ${c.seconds} s · ${c.tokens} tokens`],
				['Last job', c.last_job ? ago(c.last_job) : 'none'], ['Paired', c.since ? ago(c.since) : '?'], ['Checks run', String(c.checked ?? 0)]]}
	}
	if (dev.value.startsWith('net:')) {
		const d = netDevices.value.find((x: any) => x.ip === dev.value.slice(4))
		if (!d) {
			return null
		}
		return {title: d.label, kind: `Network device, watched read only · ${d.type}`, address: d.ip, up: d.online, status: d.online ? 'online' : 'offline', names: [d.label], ip: d.ip, risks: d.risks,
			facts: [['Maker', d.maker || 'unknown'], ['Open services', d.ports.length ? d.ports.join(', ') : 'none'], ['Firmware', d.firmware || 'not reported'], ['First seen', ago(d.first_seen)], ['Last seen', d.online ? 'now' : ago(d.last_seen)], ['Hardware address', d.mac || 'not visible']]}
	}
	return null
})
const strip = computed<string[]>(() => {
	const p = (view.value as any)?.presence || {}
	const row = current.value?.ip ? p[current.value.ip] : null
	return (row || (p._scanned || '.'.repeat(144)).replace(/s/g, '0')).split('')
})
const availPct = computed(() => {
	const seen = strip.value.filter(s => s !== '.')
	return seen.length ? `${Math.round((seen.filter(s => s === '1').length / seen.length) * 100)}% of ${seen.length} scans` : 'no scans recorded yet'
})
const pctOf = (row: string) => {
	const seen = row.split('').filter(s => s !== '.')
	return seen.length ? `${Math.round((seen.filter(s => s === '1').length / seen.length) * 100)}%` : '–'
}
const monitorRows = computed(() => {
	const p = (view.value as any)?.presence || {}
	const rows: any[] = []
	for (const c of fleetComputers.value) {
		if (c.address && p[c.address]) {
			rows.push({key: 'fleet:' + c.name, title: c.name, kind: 'fleet computer', slots: p[c.address], pct: pctOf(p[c.address])})
		}
	}
	for (const d of netDevices.value) {
		if (p[d.ip]) {
			rows.push({key: 'net:' + d.ip, title: d.label, kind: d.type, slots: p[d.ip], pct: pctOf(p[d.ip])})
		}
	}
	return rows
})
const slotTitle = (i: number, s: string) => `${new Date(Date.now() - (143 - i) * 600000).toISOString().slice(11, 16)} UTC: ${s === '1' ? 'up' : s === '0' ? 'not seen' : 'no scan'}`
const matches = (l: any) => !current.value || current.value.names.includes(l.who) || (current.value.ip && `${l.detail} `.includes(current.value.ip + ' '))
const rows = computed(() => (view.value?.log || []).filter((l: any) => matches(l) && (!source.value || l.level === source.value) &&
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
.ntable tr.fresh { animation: flash 2s ease-out; }
@keyframes flash { from { background: rgba(35, 131, 226, .12); } to { background: transparent; } }
.mono.muted { white-space: normal; word-break: break-word; }
.src { font-weight: 600; color: var(--text-strong); }
.lv { font-size: .72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; border-radius: 4px; padding: .05rem .4rem; background: #e3e2e0; color: #32302c; }
.lv.ok { background: #dbeddb; color: #1c3829; }
.lv.warn { background: #fdecc8; color: #402c1b; }
.lv.error { background: #ffe2dd; color: #5d1715; }
.lv.info { background: #d3e5ef; color: #183347; }
.picker { margin-bottom: .9rem; }
.picker select { border: 1px solid var(--border); border-radius: 8px; padding: .5rem .8rem; font: inherit; font-size: .95rem; font-weight: 500; background: var(--white); color: var(--text-strong); min-width: 320px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .6rem; margin-bottom: 1rem; }
.tile { border: 1px solid var(--border); border-radius: 10px; padding: .65rem .8rem; display: flex; flex-direction: column; gap: .1rem; }
.tile span { font-size: .76rem; color: var(--text-light); }
.tile b { font-size: 1.15rem; color: var(--text-strong); font-weight: 600; }
.tile b.red { color: #e03e3e; }
.tile small { font-size: .76rem; color: var(--text-light); }
.meter { display: block; height: 4px; border-radius: 2px; background: #f1f1ef; margin-top: .35rem; overflow: hidden; }
.meter em { display: block; height: 100%; }
.devcard { border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; margin-bottom: 1rem; }
.devcard header { display: flex; align-items: center; gap: .8rem; }
.devcard header > div { margin-inline-end: auto; }
.devcard h2 { margin: 0; font-size: 1.2rem; color: var(--text-strong); }
.devcard .ghost { border: 1px solid var(--border); border-radius: 6px; padding: .25rem .6rem; font-size: .84rem; color: var(--text-strong); }
.devcard dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: .5rem; margin: .8rem 0; }
.devcard dt { font-size: .74rem; color: var(--text-light); }
.devcard dd { margin: 0; font-size: .88rem; color: var(--text-strong); }
.strip { display: grid; grid-template-columns: repeat(144, 1fr); gap: 1px; height: 26px; }
.strip i { border-radius: 1px; }
.strip .up { background: #6fb38a; }
.strip .down { background: #f0a49b; }
.strip .none { background: #f1f1ef; }
.risks { margin-top: .8rem; }
.risk { margin-top: .3rem; padding: .45rem .7rem; border-radius: 8px; background: #fdecc8; color: #402c1b; font-size: .85rem; }
.monitors { margin-bottom: 16px; }
.monitors > header { display: flex; justify-content: space-between; }
.mon { display: grid; grid-template-columns: minmax(180px, 260px) 1fr 52px; gap: 16px; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.mon:last-child { border-bottom: 0; }
.mon:hover { background: var(--fx-strip, #f7f7f9); }
.mon-name { display: flex; flex-direction: column; min-width: 0; }
.mon-name b { font-size: 14px; font-weight: 500; color: var(--text-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mon-name small { font-size: 12px; }
.mon-pct { text-align: right; font-size: 12px; }
.sm { font-size: 12px; font-weight: 400; }
</style>
