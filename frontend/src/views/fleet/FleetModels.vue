<template>
	<div class="fleet-page">
		<p class="crumb"><RouterLink :to="{name: 'fleet.home'}">Fleet</RouterLink> / Models</p>
		<header class="page-head">
			<div>
				<h1><span class="h-icon" style="--c:#9065b0">✦</span>Models</h1>
				<p class="sub">Open models that run on your own computers, at no per-use cost. Choose one for a computer; the list shows which computers have the memory for it.</p>
			</div>
		</header>

		<div class="devs" role="tablist" aria-label="Choose a computer">
			<button type="button" role="tab" :aria-selected="!focus" :class="['dev', {on: !focus}]" @click="focusName = ''"><span class="dev-i" style="color:#9065b0">✦</span><span><b>All models</b><small>The general list</small></span></button>
			<button v-for="c in computers" :key="c.name" type="button" role="tab" :aria-selected="focus?.name === c.name" :class="['dev', {on: focus?.name === c.name}]" @click="focusName = c.name">
				<span class="dev-i" style="color:#0f7b6c">▣</span><span><b>{{ c.name }}</b><small>{{ c.chip || 'computer' }} · {{ c.memory_gb ?? '?' }} GB · {{ c.model || 'no model' }}</small></span><span :class="['dot', c.state === 'connected' ? 'ok' : 'bad']" :title="c.state" />
			</button>
		</div>

		<section class="hero">
			<h2>{{ focus ? `What should ${focus.name} work on?` : 'What should your computers work on?' }}</h2>
			<div class="ask">
				<span class="ask-tag">✦ Model finder</span>
				<input v-model="q" type="search" placeholder="Describe the work, for example: summarise documents, write code, answer customers" aria-label="Describe the work">
			</div>
			<p class="ask-note">Matched against each model's strengths and your computers' memory, on this hub. Nothing is sent out.</p>
		</section>

		<h3 class="row-h">Start from a task</h3>
		<div class="chips">
			<button v-for="tk in TASKS" :key="tk.key" type="button" :class="['chip', {on: task === tk.key}]" @click="task = task === tk.key ? '' : tk.key">
				<span class="chip-i" :style="{color: tk.c, background: tk.c + '1f'}">{{ tk.i }}</span><span><b>{{ tk.label }}</b><small>{{ tk.sub }}</small></span>
			</button>
		</div>

		<template v-if="focus">
			<h3 class="row-h">Recommended for {{ focus.name }}</h3>
			<div class="recs">
				<article v-for="(r, i) in recs" :key="r.m.id" :class="['rec', {top: i === 0}]">
					<span v-if="i === 0" class="badge-top">★ Preferred</span>
					<div class="flow"><span class="node comp" :title="focus.name">▣</span><span class="arrow">→</span><span class="node mdl" :style="{background: tint(r.m.maker)}">{{ r.m.maker[0] }}</span></div>
					<div class="rec-b">
						<b>{{ r.current ? 'Keep' : 'Run' }} {{ r.m.name }}</b>
						<small>{{ r.why }}</small>
						<div class="rec-f"><span class="muted">{{ r.m.memory_gb }} of {{ focus.memory_gb }} GB</span>
							<span v-if="r.current" class="pill ok"><i />running now</span>
							<span v-else-if="requested(r)" class="pill warn"><i />requested</span>
							<button v-else type="button" class="primary sm" :disabled="busy" @click="attachTo(r.m, focus)">Attach</button>
						</div>
					</div>
				</article>
				<p v-if="!recs.length" class="empty">No model in the catalogue fits {{ task ? 'this task on ' : '' }}{{ focus.name }}'s memory. A bigger computer opens up the larger models below.</p>
			</div>
		</template>

		<h3 class="row-h">{{ focus ? 'All models, for' : 'All models' }} <span v-if="focus" class="pc">▣ {{ focus.name }}</span><small class="muted cnt">{{ rows.length }}</small></h3>
		<div class="cols">
			<div v-for="m in rows" :key="m.id" :class="['mrow', {off: focus && !fits(m, focus)}]">
				<span class="mk" :style="{background: tint(m.maker)}">{{ m.maker[0] }}</span>
				<div class="mi"><b>{{ m.name }}</b><small>{{ m.maker }} · {{ m.tasks.join(', ') }} · {{ m.licence }}</small><small class="muted">{{ m.note }}</small></div>
				<div class="mm"><b>{{ m.memory_gb }} GB</b><small>{{ focus ? (fits(m, focus) ? 'fits' : `needs ${Math.ceil(m.memory_gb)} GB+`) : `${m.file_gb} GB download` }}</small></div>
				<template v-if="focus">
					<span v-if="isCurrent(m, focus)" class="pill ok"><i />running</span>
					<button v-else-if="fits(m, focus)" type="button" class="ghost" :disabled="busy" @click="attachTo(m, focus)">Attach</button>
					<span v-else class="muted sm">bigger computer</span>
				</template>
				<span v-else class="fitsin muted sm">{{ fitNames(m) || 'no computer yet' }}</span>
			</div>
		</div>
		<p v-if="lastTask" class="ok-msg">Requested on <RouterLink :to="{name: 'task.detail', params: {id: lastTask}}">#{{ lastTask }}</RouterLink>.</p>
		<p v-if="err" class="notice">{{ err }}</p>
		<p class="foot">Each request is recorded as a task in S Stations. The hub does not switch models by itself yet: the download, licence check and restart are carried out from that task, and the computer keeps its current model until then. Figures: {{ source }}</p>
	</div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref} from 'vue'
import {fleetView, onFleetChange, stationProjects, listTasks, vkPut, escapeHtml, type FleetView} from '@/fleet/api'

const view = ref<(FleetView & {models?: any}) | null>(null)
const q = ref('')
const task = ref('')
const busy = ref(false)
const err = ref('')
const requests = ref<any[]>([])

const models = computed<any[]>(() => view.value?.models?.models || [])
const source = computed(() => view.value?.models?.source || '')
const computers = computed(() => (view.value?.computers || []).filter(c => c.state !== 'waiting for approval'))
const fits = (m: any, c: any) => c.memory_gb != null && m.memory_gb <= c.memory_gb
const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9.]/g, '')
// The model a computer serves is matched by the exact name its model server reports.
const isCurrent = (m: any, c: any) => !!c.model && !!m.serves && norm(c.model) === norm(m.serves)
const TASKS = [
	{key: 'chat', label: 'Chat', sub: 'Answer and assist', i: '✎', c: '#2383e2', words: ['chat', 'answer', 'customer', 'reply', 'assist', 'question']},
	{key: 'summaries', label: 'Summaries', sub: 'Read and condense', i: '≡', c: '#0f7b6c', words: ['summar', 'condense', 'read', 'document', 'brief', 'notes']},
	{key: 'coding', label: 'Coding', sub: 'Write and fix code', i: '{ }', c: '#9065b0', words: ['code', 'coding', 'program', 'bug', 'test', 'script']},
	{key: 'agents', label: 'Agents', sub: 'Multi-step work', i: '⚙', c: '#d9730d', words: ['agent', 'task', 'automat', 'steps', 'workflow', 'tool']},
	{key: 'reasoning', label: 'Reasoning', sub: 'Harder thinking', i: '◆', c: '#e03e3e', words: ['reason', 'plan', 'analy', 'math', 'think', 'decide']},
]
// The tasks the ask box points to: chosen chip, else any chip whose words appear in the text.
const wanted = computed<string[]>(() => task.value ? [task.value] : TASKS.filter(tk => tk.words.some(w => q.value.toLowerCase().includes(w))).map(tk => tk.key))
const suits = (m: any) => !wanted.value.length || wanted.value.some(w => m.tasks.includes(w) || (w === 'summaries' && m.tasks.includes('drafting')) || (w === 'agents' && m.tasks.includes('tool use')))
const rows = computed(() => models.value.filter(m => suits(m)).slice().sort((a, b) => a.memory_gb - b.memory_gb))
// Recommendation for the chosen computer: the most capable suitable model that leaves a fifth of its memory free is preferred;
// the model it already runs counts as a fit and is shown first only when nothing better fits.
const recs = computed(() => {
	const c = focus.value
	if (!c || c.memory_gb == null) {
		return []
	}
	const ok = models.value.filter(m => suits(m) && m.memory_gb <= c.memory_gb * 0.8).sort((a, b) => b.memory_gb - a.memory_gb)
	return ok.slice(0, 3).map((m, i) => ({m, current: isCurrent(m, c),
		why: i === 0 ? (isCurrent(m, c) ? `Already running on ${c.name}, and the most capable ${wanted.value[0] || 'general'} model that fits it.` : `The most capable ${wanted.value[0] || 'general'} model that fits ${c.name} (${c.memory_gb} GB) with room to spare.`)
			: isCurrent(m, c) ? 'What it runs today.' : `A lighter choice: ${m.note}`}))
})
const fitNames = (m: any) => computers.value.filter(c => fits(m, c)).map(c => c.name).join(', ') && `fits ${computers.value.filter(c => fits(m, c)).map(c => c.name).join(', ')}`
const focusName = ref('')
const focus = computed(() => computers.value.find(c => c.name === focusName.value) || null)
const lastTask = ref(0)
const requested = (r: any) => requests.value.some(t => t.title === `Model: attach ${r.m.name} to ${focus.value?.name}`)
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

async function attachTo(m: any, c: any) {
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
		lastTask.value = t.id
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
.hero { text-align: center; padding: 1.4rem 0 .4rem; }
.hero h2 { font-size: 1.6rem; font-weight: 600; color: var(--text-strong); margin: 0 0 .9rem; letter-spacing: -.01em; }
.ask { max-width: 620px; margin: 0 auto; border: 1.5px solid #9065b0; border-radius: 12px; padding: .7rem .9rem 1.6rem; text-align: left; background: var(--white); box-shadow: 0 2px 10px rgba(144, 101, 176, .1); }
.ask-tag { font-size: .8rem; font-weight: 600; color: #9065b0; }
.ask input { display: block; width: 100%; border: 0; outline: 0; font: inherit; font-size: .95rem; margin-top: .4rem; background: transparent; color: var(--text-strong); }
.ask-note { font-size: .76rem; color: var(--text-light); margin: .45rem 0 0; }
.row-h { display: flex; align-items: center; gap: .6rem; font-size: 1rem; font-weight: 600; color: var(--text-strong); margin: 1.6rem 0 .6rem; }
.pc { display: inline-flex; gap: .3rem; align-items: center; font-weight: 600; color: #0f7b6c; }
.change { border: 1px solid var(--border); border-radius: 6px; padding: .15rem .4rem; font: inherit; font-size: .8rem; font-weight: 400; background: var(--white); color: var(--text); }
.chips { display: grid; grid-template-columns: repeat(5, 1fr); gap: .5rem; }
.chip { display: flex; gap: .55rem; align-items: center; text-align: left; border: 1px solid var(--border); border-radius: 8px; padding: .55rem .65rem; background: var(--white); cursor: pointer; font: inherit; color: var(--text); }
.chip.on { border-color: #9065b0; box-shadow: 0 0 0 2px rgba(144, 101, 176, .15); }
.chip b { display: block; font-size: .88rem; color: var(--text-strong); }
.chip small { font-size: .74rem; color: var(--text-light); }
.chip-i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 6px; font-size: .78rem; font-weight: 700; flex: none; }
.recs { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .7rem; }
.rec { position: relative; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--white); display: flex; flex-direction: column; }
.rec.top { border-color: #9065b0; }
.badge-top { position: absolute; top: 0; left: 0; background: #6b4fbb; color: #fff; font-size: .72rem; font-weight: 600; padding: .15rem .55rem; border-bottom-right-radius: 6px; }
.flow { display: flex; align-items: center; justify-content: center; gap: .5rem; height: 96px; background: linear-gradient(135deg, #e8e3f6, #ddd6f3); }
.node { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 7px; background: #fff; font-weight: 700; box-shadow: 0 1px 3px rgba(0, 0, 0, .08); }
.node.comp { color: #0f7b6c; }
.arrow { color: #5b5a57; }
.rec-b { padding: .7rem .8rem; display: flex; flex-direction: column; gap: .3rem; flex: 1; }
.rec-b b { font-size: .92rem; color: var(--text-strong); line-height: 1.3; }
.rec-b small { font-size: .78rem; color: var(--text-light); }
.rec-f { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: .3rem; font-size: .78rem; }
.cols { border: 1px solid var(--border); border-radius: 8px; }
.mrow { display: flex; align-items: center; gap: .8rem; padding: .65rem .9rem; border-bottom: 1px solid var(--border-light); }
.mrow:last-child { border-bottom: 0; }
.mrow.off { opacity: .55; }
.mi { flex: 1; display: flex; flex-direction: column; }
.mi b { font-size: .9rem; color: var(--text-strong); }
.mi small { font-size: .76rem; color: var(--text); }
.mm { display: flex; flex-direction: column; align-items: flex-end; min-width: 80px; }
.mm b { font-size: .86rem; color: var(--text-strong); }
.mm small { font-size: .72rem; color: var(--text-light); }
.mk { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 7px; font-weight: 700; color: #37352f; flex: none; }
.sm { font-size: .78rem; }
.ok-msg { margin: .6rem 0 0; font-size: .84rem; color: #1c3829; }
.foot { color: var(--text-light); font-size: .78rem; margin-top: 1.4rem; }
@media (max-width: 760px) { .chips { grid-template-columns: repeat(2, 1fr); } }
.devs { display: flex; gap: .5rem; flex-wrap: wrap; margin: .4rem 0 .2rem; }
.dev { display: flex; align-items: center; gap: .55rem; text-align: left; border: 1px solid var(--border); border-radius: 10px; padding: .5rem .75rem; background: var(--white); cursor: pointer; font: inherit; color: var(--text); }
.dev.on { border-color: #2383e2; box-shadow: 0 0 0 2px rgba(35, 131, 226, .15); }
.dev b { display: block; font-size: .9rem; color: var(--text-strong); }
.dev small { font-size: .74rem; color: var(--text-light); }
.dev-i { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; background: #f1f1ef; flex: none; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-inline-start: .3rem; }
.dot.ok { background: #448361; }
.dot.bad { background: #e03e3e; }
.cnt { font-weight: 400; font-size: .8rem; }
.fitsin { min-width: 110px; text-align: right; }
</style>
