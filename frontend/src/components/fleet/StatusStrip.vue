<template>
	<div
		class="status-strip"
		:class="{compact}"
	>
		<div
			class="bars"
			:style="{height: compact ? '10px' : '14px'}"
			role="img"
			:aria-label="summary"
		>
			<i
				v-for="(s, i) in cells"
				:key="i"
				:class="STATE[s] || 'none'"
				:title="titleFor ? titleFor(i, s) : undefined"
			/>
		</div>
		<div
			v-if="legend"
			class="legend"
		>
			<span v-for="k in shown" :key="k"><b :class="k" />{{ LABEL[k] }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
// Check-in timeline after Sentry's cron monitors (Yomi 2026-11-18: "Love the green and yellow on this page ... a great design
// to have"). One cell per time slot: '1' okay, '0' missed, 't' timed out, 'e' error, '.' no data.
import {computed} from 'vue'

const props = withDefaults(defineProps<{
	slots: string
	legend?: boolean
	compact?: boolean
	titleFor?: (i: number, s: string) => string
}>(), {legend: false, compact: false, titleFor: undefined})

const STATE: Record<string, string> = {'1': 'ok', '0': 'missed', t: 'timeout', e: 'error', '.': 'none'}
const LABEL: Record<string, string> = {ok: 'Okay', missed: 'Missed', timeout: 'Timed out', error: 'Error', none: 'No data'}
const cells = computed(() => props.slots.split(''))
const shown = computed(() => ['ok', 'missed', 'timeout', 'error', 'none'].filter(k => cells.value.some(s => STATE[s] === k)))
const summary = computed(() => {
	const seen = cells.value.filter(s => s !== '.')
	const ok = seen.filter(s => s === '1').length
	return seen.length ? `${ok} of ${seen.length} checks okay` : 'no checks recorded'
})
</script>

<style lang="scss" scoped>
.status-strip { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.bars { display: flex; gap: 1px; align-items: stretch; }
.bars i { flex: 1 1 0; min-width: 1px; }
.ok { background: #58cd6f; }
.missed { background: #ffce00; }
.timeout { background: #ff9838; }
.error { background: #e5484d; }
.none { background: #ebeaef; }
.legend { display: flex; gap: 12px; font-size: 12px; color: var(--text-light); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend b { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
</style>
