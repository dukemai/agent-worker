import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseLearningProgramImport } from './learning-program-import.ts';
import { advanceProgram } from './learning-programs.ts';
const template = JSON.parse(readFileSync(new URL('../../public/templates/learning-program.json', import.meta.url), 'utf8'));
test('template imports a full sorted curriculum with optional resources', () => {
  const input = structuredClone(template);
  input.days.reverse(); delete input.days[0].resources;
  const result = parseLearningProgramImport(input);
  assert.ok('program' in result);
  assert.deepEqual(result.program.days.map(d => d.day_number), [1,2,3]);
  assert.deepEqual(result.program.days[2].resources, []);
});
test('rejects invalid envelopes, partial days, duplicates, ranges and oversized fields', () => {
  for (const change of [p => p.schema = 'wrong', p => p.version = 2, p => p.total_days = 366, p => p.total_days = 1.5, p => p.days.pop(), p => p.days[1].day_number = 1, p => p.days[0].day_number = 0, p => p.days[0].day_number = 4, p => p.days[0].content = '', p => p.days[0].content = 'a'.repeat(20001), p => p.title = 'a'.repeat(201), p => p.days[0].resources = Array(21).fill('url'), p => p.days[0].resources = [null], p => p.days[0].resources = ['a'.repeat(501)]]) {
    const input = structuredClone(template); change(input); assert.ok('error' in parseLearningProgramImport(input));
  }
  assert.ok('error' in parseLearningProgramImport(null));
});
test('advance moves exactly one day and completes the final day without overshoot', () => {
  assert.deepEqual(advanceProgram({current_day:1,total_days:3}), {current_day:2,status:'active'});
  assert.deepEqual(advanceProgram({current_day:3,total_days:3}), {current_day:3,status:'completed'});
  assert.deepEqual(advanceProgram({current_day:1,total_days:1}), {current_day:1,status:'completed'});
});
