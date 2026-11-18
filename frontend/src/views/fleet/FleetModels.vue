<template>
	<div class="page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Models</p>
		<header class="head">
			<h1><span class="h-icon" style="--c:#9065b0">✦</span>Models</h1>
			<p class="sub">Open models that run on your own computers, at no per-use cost. Choose one for a computer; the list shows which computers have the memory for it.</p>
		</header>

		<section class="attached">
			<h2>On your computers</h2>
			<div class="cards">
				<div v-for="c in computers" :key="c.name" class="card">
					<b>{{ c.name }}</b>
					<span class="muted">{{ c.chip || 'computer' }} · {{ c.memory_gb ?? '?' }} GB</span>
					<span class="model">{{ c.model || 'no model attached' }}</span>
					<span v-if="pendingFor(c.name)" class="pill warn"><i />requested: {{ pendingFor(c.name) }}</span>
				</div>
				<div v-if="!computers.length" class="empty">No computers in the fleet yet.</div>
			</div>
		</section>

		<div class="bar">
			<input v-model="q" type="search" placeholder="Search models, makers or tasks" aria-label="Search models">
			<select v-model="task" aria-label="Task"><option value="">All tasks</option><option v-for="t in allTasks" :key="t">{{ t }}</option></select>
			<label class="chk"><input v-model="fitsOnly" type="checkbox"> Fits one of my computers</label>
		</div>

		<div class="grid">
			<article v-for="m in rows" :key="m.id" :class="['model-card', {sel: sel === m.id}]" @click="sel = m.id">
				<header><span class="mk" :style="{background: tint(m.maker)}">{{ m.maker[0] }}</span><div><h3>{{ m.name }}</h3><small class="muted">{{ m.maker }} · {{ m.kind }}</small></div></header>
				<p class="note">{{ m.note }}</p>
				<div class="tags"><span v-for="t in m.tasks" :key="t" class="tag">{{ t }}</span></div>
				<dl><div><dt>Download</dt><dd>{{ m.file_gb }} GB</dd></div><div><dt>Memory needed</dt><dd>{{ m.memory_gb }} GB</dd></div><div><dt>Licence</dt><dd>{{ m.licence }}</dd></div></dl>
				<div class="fit">
					<span v-for="c in computers" :key="c.name" :class="['pill', fits(m, c) ? 'ok' : 'bad']" :title="fits(m, c) ? 'enough memory' : `needs ${m.memory_gb} GB, has ${c.memory_gb ?? '?'} GB`"><i />{{ c.name }}</span>
				</div>
				<div class="act">
					<select :value="target[m.id] || ''" @change="target[m.id] = ($event.target as HTMLSelectElement).value" :aria-label="`Computer for ${m.name}`" @click.stop>
						<option value="">Choose a computer</option>
						<option v-for="c in computers" :key="c.name" :value="c.name" :disabled="!fits(m, c)">{{ c.name }}{{ fits(m, c) ? '' : ' (not enough memory)' }}{{ isCurrent(m, c) ? ' · current' : '' }}</option>
					</select>
					<button type="button" class="primary" :disabled="!target[m.id] || busy" @click.stop="attach(m)">Attach</button>
				</div>
				<p v-if="done[m.id]" class="ok-msg">Requested on <RouterLink :to="{name: 'task.detail', params: {id: done[m.id]}}">#{{ done[m.id] }}</RouterLink>.</p>
			</article>
		</div>
		<p v-if="err" class="notice">{{ err }}</p>
		<p class="foot">Each request is recorded as a task in S Stations. The hub does not switch models by itself yet: the download, licence check and restart are carried out from that task, and the computer keeps its current model until then. Figures: {{ source }}</p>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, reactive, ref} from 'vue'
import {fleetView, onFleetChange, stationProjects, listTasks, vkPut, escapeHtml, type FleetView} from '@/fleet/api'

const view = ref<(FleetView & {models?: any}) | null>(null)
const q = ref('')
const task = ref('')
const fitsOnly = ref(false)
const sel = ref('')
const busy = ref(false)
const err = ref('')
const target = reactive<Record<string, string>>({})
const done = reactive<Record<string, number>>({})
const requests = ref<any[]>([])

const models = computed<any[]>(() => view.value?.models?.models || [])
const source = computed(() => view.value?.models?.source || '')
const computers = computed(() => (view.value?.computers || []).filter(c => c.state !== 'waiting for approval'))
const allTasks = computed(() => [...new Set(models.value.flatMap(m => m.tasks))].sort())
const fits = (m: any, c: any) => c.memory_gb != null && m.memory_gb <= c.memory_gb
const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9.]/g, '')
const isCurrent = (m: any, c: any) => !!c.model && norm(c.model).includes(norm(m.name.split(' (')[0]).slice(0, 8))
const rows = computed(() => models.value.filter(m =>
	(!task.value || m.tasks.includes(task.value)) &&
	(!fitsOnly.value || computers.value.some(c => fits(m, c))) &&
	(!q.value || JSON.stringify(m).toLowerCase().includes(q.value.toLowerCase()))))
const pendingFor = (name: string) => {
	const t = requests.value.find(r => r.title.endsWith(` to ${name}`))
	return t ? t.title.replace(/^Model: attach /, '').replace(` to ${name}`, '') : ''
}
const tint = (maker: string) => ({Q: '#e8deee', O: '#d3e5ef', M: '#fdecc8'} as Record<string, string>)[maker[0]] || '#e3e2e0'

async function loadRequests() {
	try {
		const p = (await stationProjects())[0]
		requests.value = p ? (await listTasks(p.id)).filter((t: any) => t.title.startsWith('Model: attach ')) : []
	} catch {
		requests.value = []
	}
}

async function attach(m: any) {
	const c = computers.value.find(x => x.name === target[m.id])
	if (!c) {
		return
	}
	busy.value = true
	err.value = ''
	try {
		const p = (await stationProjects())[0]
		if (!p) {
			throw new Error('no S Stations project is visible to you')
		}
		const body = [
			`Attach the local model ${m.name} (${m.maker}) to the computer ${c.name}.`,
			`Computer: ${c.name}, ${c.chip || 'unknown chip'}, ${c.memory_gb} GB; current model: ${c.model || 'none'}.`,
			`Model: ${m.file}, download ${m.file_gb} GB, needs about ${m.memory_gb} GB of memory; licence ${m.licence}.`,
			'Steps: licence check of the exact file, pinned download with its checksum, restart the computer\'s model server, health check, then report here. The current model stays until the new one passes its check.',
		].join('\n')
		const t = await vkPut<any>(`/projects/${p.id}/tasks`, {title: `Model: attach ${m.name} to ${c.name}`, description: `<p>${escapeHtml(body).replace(/\n/g, '<br>')}</p>`})
		done[m.id] = t.id
		await loadRequests()
	} catch (e: any) {
		err.value = 'Could not record the request: ' + (e?.message || e)
	} finally {
		busy.value = false
	}
}

let stop = () => {}
onMounted(async () => {
	view.value = await fleetView()
	loadRequests()
	stop = onFleetChange(async () => { view.value = await fleetView() })
})
onUnmounted(() => stop())
</script>

<style lang="scss" scoped>
.page { max-width: 1240px; margin: 0 auto; padding: .5rem .5rem 4rem; color: var(--text); }
.crumb { color: var(--text-light); font-size: .85rem; margin: 0 0 .2rem; }
.head h1 { display: flex; align-items: center; gap: .6rem; font-size: 2rem; font-weight: 700; letter-spacing: -.02em; margin: 0; color: var(--text-strong); }
.sub { color: var(--text-light); margin: .2rem 0 1.2rem; }
.h-icon { display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); font-size: 1rem; }
h2 { font-size: 1rem; font-weight: 600; color: var(--text-strong); margin: 0 0 .6rem; }
.cards { display: flex; gap: .6rem; flex-wrap: wrap; margin-bottom: 1.4rem; }
.card { display: flex; flex-direction: column; gap: .15rem; border: 1px solid var(--border); border-radius: 10px; padding: .7rem .9rem; min-width: 220px; }
.card b { color: var(--text-strong); }
.model { font-size: .9rem; color: #9065b0; font-weight: 500; }
.muted { color: var(--text-light); font-size: .82rem; }
.bar { display: flex; gap: .5rem; align-items: center; margin-bottom: .9rem; flex-wrap: wrap; }
.bar input[type=search], .bar select, .act select { border: 1px solid var(--border); border-radius: 8px; padding: .42rem .7rem; font: inherit; font-size: .9rem; background: var(--white); color: var(--text-strong); }
.bar input[type=search] { flex: 1; min-width: 240px; }
.chk { display: inline-flex; gap: .35rem; align-items: center; font-size: .88rem; color: var(--text); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: .8rem; }
.model-card { border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; display: flex; flex-direction: column; gap: .55rem; cursor: default; }
.model-card.sel { border-color: #2383e2; box-shadow: 0 0 0 2px rgba(35, 131, 226, .12); }
.model-card header { display: flex; gap: .6rem; align-items: center; }
.model-card h3 { margin: 0; font-size: 1rem; font-weight: 600; color: var(--text-strong); }
.mk { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 8px; font-weight: 700; color: #37352f; flex: none; }
.note { margin: 0; font-size: .86rem; color: var(--text); }
.tags { display: flex; gap: .3rem; flex-wrap: wrap; }
.tag { font-size: .74rem; border-radius: 4px; padding: .05rem .4rem; background: #e8deee; color: #412454; }
dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: .3rem; margin: 0; }
dt { font-size: .72rem; color: var(--text-light); }
dd { margin: 0; font-size: .86rem; color: var(--text-strong); }
.fit { display: flex; gap: .3rem; flex-wrap: wrap; }
.pill { display: inline-flex; align-items: center; gap: .3rem; font-size: .74rem; border-radius: 999px; padding: .05rem .5rem; }
.pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pill.ok { background: #dbeddb; color: #1c3829; }
.pill.bad { background: #f1f1ef; color: #9b9a97; }
.pill.warn { background: #fdecc8; color: #402c1b; align-self: flex-start; }
.act { display: flex; gap: .4rem; margin-top: auto; }
.act select { flex: 1; }
.primary { border: 0; border-radius: 8px; padding: .42rem .9rem; font: inherit; font-size: .9rem; font-weight: 500; background: #2383e2; color: #fff; cursor: pointer; }
.primary:disabled { opacity: .45; cursor: default; }
.ok-msg { margin: 0; font-size: .84rem; color: #1c3829; }
.notice { background: #ffe2dd; color: #5d1715; border-radius: 8px; padding: .5rem .8rem; }
.foot { color: var(--text-light); font-size: .8rem; margin-top: 1.4rem; }
.empty { color: var(--text-light); }
</style>
