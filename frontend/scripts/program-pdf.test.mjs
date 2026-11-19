/**
 * Programme PDF / view helpers (node:test, no new packages).
 *
 *   npm run test:pdf
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { programPdfFilename, programPdfPath } from '../src/utils/programPdfMeta.ts'
import { groupApiItems, itemTag, restLabel, toProgramItemView } from '../src/utils/programView.ts'

test('pdf path uses the authenticated route or the public token route', () => {
  assert.equal(programPdfPath(12), '/programs/12/pdf/')
  assert.equal(programPdfPath('abc', 'token123'), '/programs/public/token123/pdf/')
})

test('pdf filename is ascii, unique and keeps the programme number', () => {
  assert.equal(programPdfFilename(12, 7), 'physique-program-7-12.pdf')
  assert.match(programPdfFilename(12), /^physique-program-12\.pdf$/)
})

test('grouping keeps consecutive supersets together and labels them A1/A2', () => {
  const groups = groupApiItems([
    { id: 1, exercise: 10, sets: '3', reps: '10', superset_group: null },
    { id: 2, exercise: 11, sets: '12', reps: '12', superset_group: 1 },
    { id: 3, exercise: 12, sets: '15', reps: '15', superset_group: 1 },
    { id: 4, exercise: 13, sets: '3', reps: '8', superset_group: null },
  ])
  assert.equal(groups.length, 3)
  assert.equal(groups[1].letter, 'A')
  assert.deepEqual(groups[1].items.map((_, index) => itemTag(groups[1], index)), ['A1', 'A2'])
  assert.equal(groups[0].letter, null)
})

test('item view falls back to the snapshot name and lifts the media urls', () => {
  const view = toProgramItemView({
    id: 5,
    exercise: 9,
    sets: 4,
    reps: 8,
    rest_seconds: 90,
    exercise_name_snapshot: 'پرس سینه',
    exercise_detail: { gif_file: '/media/g.gif', video_url: 'https://v.example/1' },
  })
  assert.equal(view.name, 'پرس سینه')
  assert.equal(view.sets, '4')
  assert.equal(view.gifUrl, '/media/g.gif')
  assert.equal(view.videoUrl, 'https://v.example/1')
  assert.equal(restLabel(90), '90 ثانیه')
  assert.equal(restLabel(null), '')
})
