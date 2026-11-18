<template>
	<div class="reminders">
		<div
			v-for="index in shownIndexes"
			:key="index"
			:data-is-overdue="isOverdue(reminders[index]) || undefined"
			class="reminder-input"
		>
			<OverdueIndicator
				v-if="isOverdue(reminders[index])"
				class="reminder-overdue mie-2"
			/>
			<ReminderDetail
				v-model="reminders[index]"
				class="reminder-detail"
				:disabled="disabled"
				:default-relative-to="defaultRelativeTo"
				:allow-absolute="allowAbsolute"
				@update:modelValue="updateData"
			/>
			<BaseButton
				v-if="!disabled"
				class="remove"
				:aria-label="$t('task.removeReminder')"
				@click="removeReminderByIndex(index)"
			>
				<Icon icon="times" />
			</BaseButton>
		</div>

		<button
			v-if="reminders.length > SHOWN"
			type="button"
			class="reminders-more"
			@click="showAll = !showAll"
		>
			{{ showAll ? 'Show fewer' : `Show ${reminders.length - SHOWN} more` }}
		</button>
		<ReminderDetail
			:disabled="disabled"
			:clear-after-update="true"
			:default-relative-to="defaultRelativeTo"
			:allow-absolute="allowAbsolute"
			@update:modelValue="addNewReminder"
		/>
	</div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'

import type {TaskReminder as ITaskReminder} from '@/client/generated'
import type {IReminderPeriodRelativeTo} from '@/types/IReminderPeriodRelativeTo'

import {parseDateOrNull} from '@/helpers/parseDateOrNull'

import BaseButton from '@/components/base/BaseButton.vue'
import ReminderDetail from '@/components/tasks/partials/ReminderDetail.vue'
import OverdueIndicator from '@/components/tasks/partials/OverdueIndicator.vue'
import {useNow} from '@vueuse/core'

const props = withDefaults(defineProps<{
	modelValue?: ITaskReminder[],
	defaultRelativeTo?: IReminderPeriodRelativeTo | null,
	disabled?: boolean,
	allowAbsolute?: boolean,
}>(), {
	modelValue: () => [],
	defaultRelativeTo: null,
	disabled: false,
	allowAbsolute: true,
})

const emit = defineEmits<{
	'update:modelValue': [ITaskReminder[]]
}>()

const reminders = ref<ITaskReminder[]>([])

// Newest first; only the latest few unless the user asks for all (positions in `reminders` stay unchanged for editing)
const SHOWN = 3
const showAll = ref(false)
const orderedIndexes = computed(() => reminders.value
	.map((_, i) => i)
	.sort((a, b) => (parseDateOrNull(reminders.value[b].reminder)?.getTime() ?? 0) - (parseDateOrNull(reminders.value[a].reminder)?.getTime() ?? 0)))
const shownIndexes = computed(() => (showAll.value ? orderedIndexes.value : orderedIndexes.value.slice(0, SHOWN)))

const now = useNow({interval: 1000})

function isOverdue(reminder: ITaskReminder): boolean {
	const date = parseDateOrNull(reminder.reminder)
	return date !== null && date < now.value
}

watch(
	() => props.modelValue,
	(newVal) => {
		reminders.value = [...(newVal ?? [])]
	},
	{immediate: true, deep: true}, // deep watcher so that we get the resolved date after updating the task
)

function updateData() {
	emit('update:modelValue', [...reminders.value])
}

function addNewReminder(newReminder: ITaskReminder | undefined) {
	if (!newReminder) {
		return
	}
	reminders.value.push(newReminder)
	updateData()
}

function removeReminderByIndex(index: number) {
	reminders.value.splice(index, 1)
	updateData()
}
</script>

<style lang="scss" scoped>
.reminder-input {
	display: flex;
	align-items: center;

	&[data-is-overdue] :deep(.datepicker .show),
	.reminder-overdue {
		color: var(--danger-text);
	}

	&:last-child {
		margin-block-end: 0.75rem;
	}
}

.reminder-detail {
	inline-size: 100%;
}

.remove {
	color: var(--danger);
	vertical-align: top;
	padding-inline-start: .5rem;
	line-height: 1;
}
</style>
