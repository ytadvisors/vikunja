<template>
	<div class="page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Devices</p>
		<header class="head">
			<div>
				<h1><span class="h-icon" style="--c:#0f7b6c">▣</span>Devices</h1>
				<p class="sub">Fleet computers paired with the hub, which you moderate, and every other device on your network, watched read only.</p>
			</div>
		</header>

		<nav class="tabs" role="tablist">
			<button v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="tab === t.key" :class="{on: tab === t.key}" @click="tab = t.key">{{ t.label }}<span v-if="t.count !== undefined" class="badge">{{ t.count }}</span></button>
		</nav>

		<p v-if="!view" class="notice">The fleet hub is not reachable from this browser.</p>

		<template v-if="tab === 'devices' && view">
			<div class="toolbar">
				<input v-model="q" type="search" placeholder="Search name, type, maker or address" aria-label="Search devices">
				<select v-model="stateFilter" aria-label="Filter by state"><option value="">All devices</option><option value="connected">Online</option><option value="not connected">Offline</option><option value="paused">Paused</option></select>
			</div>
			<h2 class="sec"><span class="sec-i" style="--c:#0f7b6c">▣</span>Fleet computers <span class="badge">{{ fleet.length }}</span><small>Paired with the hub: they take work, run local models and report back. You moderate them.</small></h2>
			<table class="ntable">
				<thead><tr><th>Computer</th><th>Status</th><th>Hardware</th><th>Model</th><th>Address</th><th>Work done</th><th>Last job</th><th class="r">Moderate</th></tr></thead>
				<tbody>
					<tr v-for="c in fleet" :key="c.name" :class="{sel: sel === (c.address || c.name)}" @click="sel = c.address || c.name">
						<td class="name"><span class="dev" style="color:#0f7b6c">▣</span>{{ c.name }}<small class="member">{{ c.member }}</small></td>
						<td><span :class="['pill', stateCls(c.state)]"><i />{{ c.state }}</span></td>
						<td class="muted">{{ c.chip || '?' }} · {{ c.memory_gb ?? '?' }} GB</td>
						<td>{{ c.model || '–' }}</td>
						<td class="mono">{{ c.address || '–' }}</td>
						<td class="muted">{{ c.jobs }} jobs</td>
						<td class="muted">{{ c.last_job ? ago(c.last_job) : '–' }}</td>
						<td class="r mod" @click.stop>
							<button v-if="c.state !== 'paused'" type="button" class="ghost" :disabled="!!asked[c.name]" @click="ask('pause', c.name)">Pause</button>
							<button v-else type="button" class="ghost" :disabled="!!asked[c.name]" @click="ask('resume', c.name)">Resume</button>
							<button type="button" class="ghost danger" :disabled="!!asked[c.name]" @click="confirmRemove = c.name">Remove</button>
						</td>
					</tr>
					<tr v-if="confirmRemove" class="confirm"><td colspan="8">Remove <b>{{ confirmRemove }}</b> from the fleet? It stops taking work at once and its access is turned off. It stays on the network and can pair again later; its history is kept. <button type="button" class="ghost danger" @click="ask('remove', confirmRemove); confirmRemove = ''">Remove</button> <button type="button" class="ghost" @click="confirmRemove = ''">Cancel</button></td></tr>
				</tbody>
			</table>
			<p v-if="!fleet.length" class="empty">No computer is paired yet. Add one from Enrollment.</p>
			<p v-for="(v, k) in asked" :key="k" :class="['modmsg', v.error ? 'bad' : '']">{{ k }}: <template v-if="v.error">{{ v.error }}</template><template v-else>{{ v.action }} recorded on <RouterLink :to="{name: 'task.detail', params: {id: v.task}}">#{{ v.task }}</RouterLink>; the hub acts on it within seconds (only the owner's moderation is carried out).</template></p>

			<h2 class="sec mt"><span class="sec-i" style="--c:#2383e2">⌂</span>Network devices <span class="badge">{{ others.length }}</span><small>Everything else the hub sees on your network. Watched read only: it is never logged in to or changed.</small></h2>
			<p v-if="net" class="scan">Network {{ net.network }} · {{ net.online }} of {{ net.devices.length }} devices online · {{ net.with_risks }} with something to check · last scanned {{ ago(net.scanned_at) }} (every 10 minutes, read only)</p>
			<p v-else class="notice">The network monitor has not reported yet.</p>
			<table class="ntable">
				<thead><tr><th>Device</th><th>Status</th><th>Type</th><th>Address</th><th>Open services</th><th>Firmware</th><th>Attention</th><th>Last seen</th></tr></thead>
				<tbody>
					<tr v-for="d in others" :key="d.ip" :class="{sel: sel === d.ip, off: !d.online}" @click="sel = d.ip">
						<td class="name"><span class="dev" :style="{color: typeColor(d.type)}">{{ typeIcon(d.type) }}</span>{{ d.label }}<span v-if="d.kind !== 'network device'" class="role">{{ d.kind }}</span></td>
						<td><span :class="['pill', d.online ? 'ok' : 'bad']"><i />{{ d.online ? 'online' : 'offline' }}</span></td>
						<td>{{ d.type }}<small v-if="d.maker && d.maker !== 'unknown'" class="muted"> · {{ d.maker }}</small></td>
						<td class="mono">{{ d.ip }}</td>
						<td class="muted">{{ d.ports.length ? d.ports.length + ' open' : '–' }}</td>
						<td class="muted">{{ d.firmware || 'not reported' }}</td>
						<td><span v-if="d.risks.length" class="pill warn"><i />{{ d.risks.length }}</span><span v-else class="muted">–</span></td>
						<td class="muted">{{ d.online ? 'now' : ago(d.last_seen) }}</td>
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
			<div class="paths" role="tablist">
				<button type="button" :class="{on: path === 'local'}" @click="path = 'local'"><b>On this network</b><small>Same home or office network as the hub. Found automatically.</small></button>
				<button type="button" :class="{on: path === 'remote'}" @click="path = 'remote'"><b>From another location</b><small>A computer at another home, office or site, joined through a private Tailscale network.</small></button>
			</div>
			<div v-if="path === 'local'" class="steps">
				<div class="step"><span class="n">1</span><div><h4>Install the station</h4><p>On the computer you want to add, open Terminal and run:</p><pre>curl -fsS http://{{ hubHost }}:18970/install.sh | sh</pre></div></div>
				<div class="step"><span class="n">2</span><div><h4>Compare the code</h4><p>The computer finds the hub on the network by itself and shows a six-digit code.</p></div></div>
				<div class="step"><span class="n">3</span><div><h4>Approve it</h4><p>A pairing task with the same code appears in S Stations. Mark it done if the codes match and you expect this computer. Only the owner can approve.</p></div></div>
			</div>
			<div v-else class="steps">
				<p v-if="!tailnet" class="notice">Tailscale is not running on the hub yet. Turn it on there first, signed in to your Tailscale network; this page then shows the hub's private name.</p>
				<p v-else class="notice ok">The hub is on the Tailscale network <b>{{ tailnet.network }}</b> as <b>{{ tailnet.name }}</b>, with {{ tailnet.peers }} other computer(s) on it.</p>
				<div class="step"><span class="n">1</span><div><h4>Join your private network</h4><p>On the computer you want to add, install Tailscale (tailscale.com/download) and sign in with the same account{{ tailnet ? ` (network ${tailnet.network})` : '' }}. The computer can then reach the hub from anywhere, encrypted, with no router ports opened.</p></div></div>
				<div class="step"><span class="n">2</span><div><h4>Install the station</h4><p>In Terminal on that computer:</p><pre>curl -fsS http://{{ tailnet?.name || 'HUB-NAME.your-tailnet.ts.net' }}:18970/install.sh | sh</pre></div></div>
				<div class="step"><span class="n">3</span><div><h4>Compare the code and approve</h4><p>Exactly as on the local network: the computer shows a six-digit code, a pairing task with the same code appears in S Stations, and only the owner's approval adds it to the fleet. Being on the private network makes a computer reachable; only your approval makes it part of the fleet.</p></div></div>
			</div>
			<h2 class="mt">Waiting for approval <span class="badge">{{ pending.length }}</span></h2>
			<div v-if="!pending.length" class="empty">No computer is waiting.</div>
			<div v-for="c in pending" :key="c.name" class="li"><b>{{ c.name }}</b><span class="muted">{{ c.address }} · {{ c.chip }} · {{ c.memory_gb }} GB</span></div>
		</template>

		<aside v-if="selNet || selDevice" class="panel" aria-label="Device details">
			<header><h2>{{ selNet?.label || selDevice?.name }}</h2><span :class="['pill', (selNet ? selNet.online : selDevice?.state === 'connected') ? 'ok' : 'bad']"><i />{{ (selNet ? selNet.online : selDevice?.state === 'connected') ? 'online' : 'offline' }}</span><button type="button" class="ghost close" @click="sel = ''">Close</button></header>
			<p class="kind-line">{{ selDevice ? 'Fleet computer, paired with the hub' : 'Network device, watched read only' }}</p>
			<div class="cmd">
				<RouterLink class="primary" :to="{name: 'fleet.home'}">Ask the fleet about it</RouterLink>
				<template v-if="selDevice">
					<button v-if="selDevice.state !== 'paused'" type="button" class="ghost" @click="ask('pause', selDevice.name)">Pause</button>
					<button v-else type="button" class="ghost" @click="ask('resume', selDevice.name)">Resume</button>
					<button type="button" class="ghost danger" @click="confirmRemove = selDevice.name; tab = 'devices'">Remove</button>
				</template>
			</div>
			<dl class="ess">
				<template v-if="selNet">
					<div><dt>What it is</dt><dd>{{ selNet.type }}<template v-if="selNet.maker && selNet.maker !== 'unknown'"> · {{ selNet.maker }}</template><template v-if="selNet.model && selNet.model !== 'unknown'"> {{ selNet.model }}</template><small v-if="selNet.why" class="guess">Local model's guess: {{ selNet.why }}</small></dd></div>
					<div><dt>Role</dt><dd>{{ selNet.kind }}</dd></div>
					<div><dt>Address</dt><dd class="mono">{{ selNet.ip }}</dd></div>
					<div><dt>Hardware address</dt><dd class="mono">{{ selNet.mac || 'not visible' }}<small v-if="selNet.private_address" class="guess">private (randomised) address</small></dd></div>
					<div><dt>Firmware</dt><dd>{{ selNet.firmware || 'not reported by the device' }}</dd></div>
					<div><dt>First seen</dt><dd>{{ ago(selNet.first_seen) }}</dd></div>
					<div><dt>Last seen</dt><dd>{{ selNet.online ? 'now' : ago(selNet.last_seen) }}</dd></div>
					<div v-if="selNet.names.length"><dt>Announces itself as</dt><dd>{{ selNet.names.join(' · ') }}</dd></div>
					<div v-if="selNet.services.length"><dt>Network services</dt><dd>{{ selNet.services.join(', ') }}</dd></div>
					<div><dt>Open ports</dt><dd>{{ selNet.ports.join(', ') || 'none of the common ones' }}</dd></div>
					<div v-if="selNet.web.title || selNet.web.server"><dt>Web page</dt><dd>{{ selNet.web.title }}<small v-if="selNet.web.server" class="guess">server: {{ selNet.web.server }}</small></dd></div>
				</template>
				<template v-if="selDevice">
					<div><dt>Fleet station</dt><dd>{{ selDevice.member || 'pairing' }} · {{ selDevice.model || 'no local model' }}</dd></div>
					<div><dt>Work done</dt><dd>{{ selDevice.jobs }} jobs · {{ selDevice.seconds }} s · {{ selDevice.tokens }} tokens</dd></div>
				</template>
			</dl>
			<template v-if="selNet?.risks.length">
				<h3>Worth checking</h3>
				<div v-for="(r, i) in selNet.risks" :key="i" class="risk">{{ r }}</div>
			</template>
			<h3>Activity</h3>
			<div v-for="(l, i) in selLog" :key="i" class="act"><span :class="['lv', l.level]" /><span class="muted">{{ ago(l.ts) }}</span> {{ l.what }} <span class="muted">{{ l.detail }}</span></div>
			<div v-if="!selLog.length" class="empty">No activity recorded yet.</div>
		</aside>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, reactive, ref} from 'vue'
import {CONSOLE_URL, ago, escapeHtml, fleetView, onFleetChange, stationProjects, vkPost, vkPut, type FleetView} from '@/fleet/api'

const view = ref<(FleetView & {checks_catalog?: any[]}) | null>(null)
const tab = ref<'devices' | 'profiles' | 'enroll'>('devices')
const q = ref('')
const stateFilter = ref('')
const sel = ref('')
const path = ref<'local' | 'remote'>('local')
const tailnet = computed(() => (view.value as any)?.tailnet || null)
const hubHost = new URL(CONSOLE_URL).hostname === '127.0.0.1' ? 'ytwguru3.local' : new URL(CONSOLE_URL).hostname

const all = computed(() => view.value?.computers || [])
const devices = computed(() => all.value.filter(c => c.state !== 'waiting for approval' || stateFilter.value === 'waiting for approval')
	.filter(c => !stateFilter.value || c.state === stateFilter.value)
	.filter(c => !q.value || JSON.stringify(c).toLowerCase().includes(q.value.toLowerCase())))
const pending = computed(() => all.value.filter(c => c.state === 'waiting for approval'))
const recs = computed(() => view.value?.recommendations || [])
const tabs = computed(() => [
	{key: 'devices' as const, label: 'Your devices', count: fleet.value.length + others.value.length},
	{key: 'profiles' as const, label: 'Device profile'},
	{key: 'enroll' as const, label: 'Enrollment', count: pending.value.length},
])
const net = computed(() => (view.value as any)?.network || null)
const netRows = computed<any[]>(() => (net.value?.devices || []).filter((d: any) =>
	(!stateFilter.value || (stateFilter.value === 'connected' ? d.online : stateFilter.value === 'not connected' ? !d.online : true)) &&
	(!q.value || JSON.stringify(d).toLowerCase().includes(q.value.toLowerCase()))))
const fleetIps = computed(() => new Set(all.value.map(c => c.address).filter(Boolean)))
const fleet = computed(() => devices.value.filter(c => c.state !== 'waiting for approval'))
const others = computed(() => netRows.value.filter((d: any) => !fleetIps.value.has(d.ip)))
const asked = reactive<Record<string, {action: string, task?: number, error?: string}>>({})
const confirmRemove = ref('')

// Moderation is a task the owner creates and closes in S Stations; the hub acts only when the owner did both, so it is on the record.
async function ask(action: 'pause' | 'resume' | 'remove', name: string) {
	asked[name] = {action}
	try {
		const p = (await stationProjects())[0]
		if (!p) {
			throw new Error('no S Stations project is visible to you')
		}
		const t = await vkPut<any>(`/projects/${p.id}/tasks`, {title: `Moderate: ${action} ${name}`, description: `<p>${action} the fleet computer ${escapeHtml(name)}, from Fleet HQ Devices.</p>`})
		await vkPost(`/tasks/${t.id}`, {...t, done: true})
		asked[name] = {action: {pause: 'Pause', resume: 'Resume', remove: 'Removal'}[action], task: t.id}
	} catch (e: any) {
		asked[name] = {action, error: 'could not record it: ' + (e?.message || e)}
	}
}
const selNet = computed<any>(() => (net.value?.devices || []).find((d: any) => d.ip === sel.value) || null)
const selDevice = computed(() => all.value.find(c => c.address === sel.value || c.name === sel.value) || null)
const selLog = computed(() => (view.value?.log || []).filter(l => l.who === (selDevice.value?.name || selNet.value?.label) || l.who === sel.value || (l.detail || '').includes(sel.value + ' ')).slice(0, 14))
const ICONS: Record<string, [string, string]> = {router: ['⌂', '#2383e2'], 'network gear': ['⌂', '#2383e2'], computer: ['▣', '#0f7b6c'], phone: ['▯', '#9065b0'], tablet: ['▭', '#9065b0'],
	printer: ['⎙', '#d9730d'], camera: ['◉', '#e03e3e'], tv: ['▬', '#ad1a72'], speaker: ['♪', '#ad1a72'], 'smart home': ['◈', '#448361'], nas: ['▤', '#2383e2'], 'game console': ['◆', '#9065b0']}
const typeIcon = (t: string) => (ICONS[t] || ['•', '#9b9a97'])[0]
const typeColor = (t: string) => (ICONS[t] || ['•', '#9b9a97'])[1]
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
.paths { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: 1rem; }
.paths button { text-align: left; border: 1px solid var(--border); background: var(--white); border-radius: 12px; padding: .8rem 1rem; cursor: pointer; font: inherit; color: var(--text); }
.paths button.on { border-color: #2383e2; box-shadow: 0 0 0 2px rgba(35, 131, 226, .15); }
.paths b { display: block; color: var(--text-strong); }
.paths small { color: var(--text-light); }
.notice.ok { background: #dbeddb; color: #1c3829; }
.scan { color: var(--text-light); font-size: .85rem; margin: 0 0 .6rem; }
.role { margin-inline-start: .5rem; font-size: .72rem; font-weight: 600; color: #0f7b6c; background: #dbeddb; border-radius: 4px; padding: 0 .35rem; }
tr.off td { opacity: .55; }
.mono { font-family: ui-monospace, Menlo, monospace; font-size: .82rem; }
.guess { display: block; color: var(--text-light); font-size: .78rem; }
.risk { margin: 0 1.1rem .4rem; padding: .5rem .7rem; border-radius: 8px; background: #fdecc8; color: #402c1b; font-size: .85rem; }
.sec { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; font-size: 1.05rem; font-weight: 600; color: var(--text-strong); margin: .4rem 0 .5rem; }
.sec small { flex-basis: 100%; font-weight: 400; font-size: .84rem; color: var(--text-light); }
.sec.mt { margin-top: 1.8rem; }
.sec-i { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; font-size: .8rem; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); align-self: center; }
.r { text-align: right; }
.mod { white-space: nowrap; }
.mod .ghost, .cmd .ghost { border: 1px solid var(--border); background: var(--white); border-radius: 6px; padding: .2rem .55rem; font: inherit; font-size: .8rem; cursor: pointer; color: var(--text-strong); margin-inline-start: .25rem; }
.ghost.danger { color: #c4321f; }
.ghost:disabled { opacity: .45; cursor: default; }
tr.confirm td { background: #fdf3f1; font-size: .86rem; }
.modmsg { font-size: .84rem; color: #1c3829; margin: .4rem 0 0; }
.modmsg.bad { color: #5d1715; }
.member { margin-inline-start: .5rem; font-size: .74rem; color: var(--text-light); font-family: ui-monospace, Menlo, monospace; }
.kind-line { margin: -.2rem 1.1rem .6rem; font-size: .8rem; color: var(--text-light); }
</style>
