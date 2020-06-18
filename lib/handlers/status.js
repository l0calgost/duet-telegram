'use strict';
const {formatDuration} = require('../utils');
const {basename} = require('path');
const request = require('request-prom');

const statuses = {
	F: ({reply}) => reply('⚡ Flashing firmware ⚡'),
	O: ({reply}) => reply('☠️ Printer is off ☠️'),
	H: ({reply}) => reply('☠️ Printer halted ☠️'),
	D: replyWithWebcam('⚠️ Pausing'),
	S: replyWithWebcam('ℹ️ Paused'),
	R: replyWithWebcam('⚠️ Resuming'),
	M: ({reply}) => reply('🙌 Simulating'),
	B: replyWithWebcam('⚠️ Busy'),
	T: replyWithWebcam('ℹ️ Changing Tool'),
	I: replyWithWebcam((ctx, status) => `ℹ️ Idle\n${tempStatus(status)}`),
	P: printing
};

function replyWithWebcam(message) {
	return async (ctx, status) => {
		let caption;
		if (typeof (message) === 'function') {
			caption = await message(ctx, status);
		} else {
			caption = message;
		}

		const {webcamSnapshotUrl} = ctx.config;
		if (!webcamSnapshotUrl) {
			return ctx.reply(message);
		}

		return ctx.replyWithPhoto(
			{source: request.stream({url: webcamSnapshotUrl})},
			{caption}
		);
	};
}

async function printing(ctx, status, file) {
	const {
		currentLayer,
		printDuration,
		fractionPrinted,
		timesLeft
	} = status;

	return replyWithWebcam(
		`Z ${currentLayer}, ${fractionPrinted}%, ` +
		`${formatDuration(printDuration)} / ${formatDuration(timesLeft.filament)}, ${tempStatus(status)}`
	)(ctx, status);
}

function tempStatus(status) {
	const {temps} = status;
	const currentTool = status.currentTool > -1 ? status.currentTool : 0;
	return `E: ${temps.current[currentTool + 1]}/${temps.tools.active[currentTool]}, B: ${temps.bed.current}/${temps.bed.active}`;
}

module.exports = (ctx, status, ...args) => {
	if (!statuses[status.status]) {
		return ctx.reply(`⚠️ Unknown status (${status.status})`);
	}

	return statuses[status.status](ctx, status, ...args);
};

module.exports.replyWithWebcam = replyWithWebcam;
