<template>
	<div class="page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Devices</p>
		<header class="head">
			<div>
				<h1><span class="h-icon" style="--c:#0f7b6c">▣</span>Devices</h1>
				<p class="sub">The computers enrolled in the fleet: their state, what they run, what they have done, and what needs attention.</p>
			</div>
		</header>

		<nav class="tabs" role="tablist">
			<button v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="tab === t.key" :class="{on: tab === t.key}" @click="tab = t.key">{{ t.label }}<span v-if="t.count !== undefined" class="badge">{{ t.count }}</span></button>
		</nav>

		<p v-if="!view" class="notice">The fleet hub is not reachable from this browser.</p>

		<template v-if="tab === 'devices' && view">
			<div class="toolbar">
				<input v-model="q" type="search" placeholder="Search name, chip, model or address" aria-label="Search devices">
				<select v-model="stateFilter" aria-label="Filter by state"><option value="">All states</option><option>connected</option><option>not connected</option><option>waiting for approval</option><option>paused</option></select>
			</div>
			<div v-if="!devices.length" class="onboard">
				<h3>Enroll your first computer</h3>
				<p>Install the station on a computer on this network, then approve its pairing code here. See the Enrollment tab.</p>
				<button type="button" class="primary" @click="tab = 'enroll'">Add a device</button>
			</div>
			<table v-else class="ntable">
				<thead><tr><th>Device</th><th>Status</th><th>System</th><th>Chip</th><th>Memory</th><th>Local model</th><th>Jobs</th><th>Last seen</th></tr></thead>
				<tbody>
					<tr v-for="c in devices" :key="c.name" :class="{sel: sel === c.name}" @click="sel = c.name">
						<td class="name"><span class="dev">▣</span>{{ c.name }}</td>
						<td><span :class="['pill', stateCls(c.state)]"><i />{{ c.state }}</span></td>
						<td>{{ c.system || '?' }}</td><td>{{ c.chip || '?' }}</td><td>{{ c.memory_gb ?? '?' }} GB</td><td>{{ c.model || '–' }}</td><td>{{ c.jobs }}</td>
						<td class="muted">{{ c.state === 'connected' ? 'now' : ago(c.last_job) }}</td>
					</tr>
				</tbody>
			</table>

			<section v-if="recs.length" class="recs">
				<h2>Recommendations <span class="badge">{{ recs.length }}</span></h2>
				<div class="rec-cards">
					<div v-for="(r, i) in recs" :key="i" class="rec-card">
						<span :class="['pill', r.level === 'act soon' ? 'bad' : 'warn']"><i />{{ r.level === 'act soon' ? 'High' : 'Medium' }}</span>
						<h4>{{ r.title }}</h4>
						<p>{{ r.why }}</p>
						<p class="seen">Seen on {{ r.computer }}: {{ r.seen }}</p>
						<RouterLink class="ghost" :to="{name: 'fleet.home'}">Ask the fleet to fix it</RouterLink>
					</div>
				</div>
			</section>
		</template>

		<template v-if="tab === 'profiles' && view">
			<p class="sub block-sub">What a station is allowed to do on its computer. Today every station has the same profile: text jobs and these read-only checks. Nothing here changes a computer.</p>
			<table class="ntable">
				<thead><tr><th>Check</th><th>What it looks at</th><th>Fixed command</th></tr></thead>
				<tbody>
					<tr v-for="k in view.checks_catalog || []" :key="k.name"><td class="name">{{ k.name }}</td><td>{{ k.what }}</td><td><code>{{ k.command }}</code></td></tr>
				</tbody>
			</table>
		</template>

		<template v-if="tab === 'enroll' && view">
			<div class="steps">
				<div class="step"><span class="n">1</span><div><h4>Install the station</h4><p>On the computer you want to add, open Terminal and run:</p><pre>curl -fsS http://{{ hubHost }}:18970/install.sh | sh</pre></div></div>
				<div class="step"><span class="n">2</span><div><h4>Compare the code</h4><p>The computer finds the hub on the network by itself and shows a six-digit code.</p></div></div>
				<div class="step"><span class="n">3</span><div><h4>Approve it</h4><p>A pairing task with the same code appears in S Stations. Mark it done if the codes match and you expect this computer. Only the owner can approve.</p></div></div>
			</div>
			<h2 class="mt">Waiting for approval <span class="badge">{{ pending.length }}</span></h2>
			<div v-if="!pending.length" class="empty">No computer is waiting.</div>
			<div v-for="c in pending" :key="c.name" class="li"><b>{{ c.name }}</b><span class="muted">{{ c.address }} · {{ c.chip }} · {{ c.memory_gb }} GB</span></div>
		</template>

		<aside v-if="selDevice" class="panel" aria-label="Device details">
			<header><h2>{{ selDevice.name }}</h2><span :class="['pill', stateCls(selDevice.state)]"><i />{{ selDevice.state }}</span><button type="button" class="ghost close" @click="sel = ''">Close</button></header>
			<div class="cmd">
				<RouterLink class="primary" :to="{name: 'fleet.home'}">Give this fleet a task</RouterLink>
				<button type="button" class="ghost" disabled title="Comes with enforced station identity (plan step 4)">Pause</button>
			</div>
			<dl class="ess">
				<div><dt>Status</dt><dd>{{ selDevice.state }}{{ selDevice.since ? ' since ' + ago(selDevice.since) : '' }}</dd></div>
				<div><dt>System</dt><dd>{{ selDevice.system }}</dd></div>
				<div><dt>Chip</dt><dd>{{ selDevice.chip }}</dd></div>
				<div><dt>Memory</dt><dd>{{ selDevice.memory_gb }} GB</dd></div>
				<div><dt>Local model</dt><dd>{{ selDevice.model || '–' }}</dd></div>
				<div><dt>Address</dt><dd>{{ selDevice.address }}</dd></div>
				<div><dt>Team member</dt><dd>{{ selDevice.member || 'not yet' }}</dd></div>
				<div><dt>Work done</dt><dd>{{ selDevice.jobs }} jobs · {{ selDevice.seconds }} s · {{ selDevice.tokens }} tokens</dd></div>
				<div><dt>Last checked</dt><dd>{{ ago(selDevice.checked) }}</dd></div>
			</dl>
			<h3>Recent activity</h3>
			<div v-for="(l, i) in selLog" :key="i" class="act"><span :class="['lv', l.level]" /><span class="muted">{{ ago(l.ts) }}</span> {{ l.what }} <span class="muted">{{ l.detail }}</span></div>
			<div v-if="!selLog.length" class="empty">No activity recorded.</div>
		</aside>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {CONSOLE_URL, ago, fleetView, onFleetChange, type FleetView} from '@/fleet/api'

const view = ref<(FleetView & {checks_catalog?: any[]}) | null>(null)
const tab = ref<'devices' | 'profiles' | 'enroll'>('devices')
const q = ref('')
const stateFilter = ref('')
const sel = ref('')
const hubHost = new URL(CONSOLE_URL).hostname === '127.0.0.1' ? 'ytwguru3.local' : new URL(CONSOLE_URL).hostname

const all = computed(() => view.value?.computers || [])
const devices = computed(() => all.value.filter(c => c.state !== 'waiting for approval' || stateFilter.value === 'waiting for approval')
	.filter(c => !stateFilter.value || c.state === stateFilter.value)
	.filter(c => !q.value || JSON.stringify(c).toLowerCase().includes(q.value.toLowerCase())))
const pending = computed(() => all.value.filter(c => c.state === 'waiting for approval'))
const recs = computed(() => view.value?.recommendations || [])
const tabs = computed(() => [
	{key: 'devices' as const, label: 'Your devices', count: all.value.length - pending.value.length},
	{key: 'profiles' as const, label: 'Device profile'},
	{key: 'enroll' as const, label: 'Enrollment', count: pending.value.length},
])
const selDevice = computed(() => all.value.find(c => c.name === sel.value) || null)
const selLog = computed(() => (view.value?.log || []).filter(l => l.who === sel.value).slice(0, 12))
const stateCls = (s: string) => (s === 'connected' ? 'ok' : s === 'not connected' ? 'bad' : 'warn')

async function refresh() {
	view.value = await fleetView()
}
let stop = () => {}
onMounted(() => {
	refresh()
	stop = onFleetChange(refresh)
})
onUnmounted(() => stop())
</script>

<style lang="scss" scoped>
.page { max-width: 1180px; margin: 0 auto; padding: .5rem .5rem 4rem; color: var(--text); }
.crumb { color: var(--text-light); font-size: .85rem; margin: 0 0 .2rem; }
.head h1 { display: flex; align-items: center; gap: .6rem; font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin: 0; color: var(--text-strong); }
.sub { color: var(--text-light); margin: .2rem 0 0; }
.block-sub { margin: 0 0 .9rem; }
.h-icon { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); font-size: 1rem; }
.tabs { display: flex; gap: .2rem; border-bottom: 1px solid var(--border); margin: 1.2rem 0 1rem; }
.tabs button { border: 0; background: none; padding: .55rem .8rem; font: inherit; font-size: .9rem; color: var(--text-light); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; display: inline-flex; gap: .4rem; align-items: center; }
.tabs button.on { color: var(--text-strong); border-bottom-color: var(--text-strong); font-weight: 600; }
.badge { font-size: .72rem; font-weight: 600; background: var(--fleet-quiet); color: var(--text-light); border-radius: 999px; padding: 0 .45rem; }
.toolbar { display: flex; gap: .5rem; margin-bottom: .6rem; }
.toolbar input, .toolbar select { border: 1px solid var(--border); border-radius: 8px; padding: .4rem .7rem; font: inherit; font-size: .9rem; background: var(--white); color: var(--text-strong); }
.toolbar input { flex: 1; max-width: 420px; }
.ntable { width: 100%; border-collapse: collapse; font-size: .9rem; }
.ntable th { text-align: left; font-weight: 500; font-size: .8rem; color: var(--text-light); padding: .45rem .5rem; border-bottom: 1px solid var(--border); }
.ntable td { padding: .6rem .5rem; border-bottom: 1px solid var(--border-light); }
.ntable tbody tr { cursor: pointer; }
.ntable tbody tr:hover, .ntable tbody tr.sel { background: var(--fleet-quiet); }
.name { font-weight: 600; color: var(--text-strong); }
.dev { color: #0f7b6c; margin-inline-end: .45rem; }
code { font-size: .8rem; color: var(--text-light); }
.muted { color: var(--text-light); }
.pill { display: inline-flex; align-items: center; gap: .35rem; font-size: .8rem; font-weight: 500; border-radius: 999px; padding: .1rem .55rem; white-space: nowrap; }
.pill i { width: 7px; height: 7px; border-radius: 50%; }
.pill.ok { background: #dbeddb; color: #1c3829; } .pill.ok i { background: #448361; }
.pill.warn { background: #fdecc8; color: #402c1b; } .pill.warn i { background: #cb912f; }
.pill.bad { background: #ffe2dd; color: #5d1715; } .pill.bad i { background: #e03e3e; }
.onboard { border: 1px solid var(--border); border-radius: 12px; padding: 1.4rem; text-align: center; }
.primary { background: var(--primary); color: #fff !important; border: 0; border-radius: 8px; padding: .5rem .9rem; font-weight: 600; cursor: pointer; display: inline-block; }
.ghost { border: 1px solid var(--border); background: var(--white); color: var(--text); border-radius: 8px; padding: .4rem .8rem; font-weight: 500; cursor: pointer; display: inline-block; }
.ghost:disabled { opacity: .5; cursor: not-allowed; }
.recs { margin-top: 2rem; }
.recs h2, .mt { font-size: 1.1rem; font-weight: 700; color: var(--text-strong); margin: 0 0 .7rem; display: flex; gap: .5rem; align-items: center; }
.mt { margin-top: 1.6rem; }
.rec-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: .7rem; }
.rec-card { border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; }
.rec-card h4 { margin: .5rem 0 .2rem; font-size: .98rem; color: var(--text-strong); }
.rec-card p { margin: 0 0 .5rem; font-size: .88rem; }
.seen { color: var(--text-light); font-size: .78rem !important; font-family: ui-monospace, Menlo, monospace; word-break: break-word; }
.steps { display: grid; gap: .7rem; }
.step { display: flex; gap: .9rem; border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; }
.step .n { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--fleet-quiet); display: grid; place-items: center; font-weight: 700; }
.step h4 { margin: 0 0 .2rem; color: var(--text-strong); }
.step p { margin: 0; }
pre { margin: .5rem 0 0; background: var(--fleet-sidebar, #f7f6f3); border-radius: 8px; padding: .6rem .8rem; font-size: .85rem; }
.li { display: flex; gap: .8rem; padding: .5rem .2rem; border-bottom: 1px solid var(--border-light); }
.empty { color: var(--text-light); padding: .6rem .2rem; }
.notice { color: var(--text-light); background: var(--fleet-quiet); border-radius: 10px; padding: .7rem 1rem; }
.panel { position: fixed; right: 0; top: 3.75rem; bottom: 0; width: min(440px, 100%); background: var(--white); border-left: 1px solid var(--border); box-shadow: -10px 0 30px rgba(15, 15, 15, .08); z-index: 40; overflow: auto; padding: 0 0 2rem; }
.panel header { display: flex; align-items: center; gap: .6rem; padding: 1rem 1.1rem; border-bottom: 1px solid var(--border); }
.panel h2 { margin: 0; font-size: 1.25rem; color: var(--text-strong); }
.close { margin-inline-start: auto; }
.cmd { display: flex; gap: .5rem; padding: .8rem 1.1rem; }
.ess { margin: 0 1.1rem; }
.ess div { display: grid; grid-template-columns: 120px 1fr; padding: .4rem 0; border-bottom: 1px solid var(--border-light); font-size: .88rem; }
.ess dt { color: var(--text-light); }
.ess dd { margin: 0; }
.panel h3 { font-size: .95rem; margin: 1.2rem 1.1rem .4rem; color: var(--text-strong); }
.act { margin: 0 1.1rem; padding: .35rem 0; font-size: .85rem; border-bottom: 1px solid var(--border-light); }
.lv { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-inline-end: .4rem; background: #9b9a97; }
.lv.ok { background: #448361; } .lv.warn { background: #cb912f; } .lv.error { background: #e03e3e; } .lv.info { background: #2383e2; }
</style>
