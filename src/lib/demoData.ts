import type { Row } from '../types/workbench'

/** Sample order records, wired to the "Sample data" button in the source modal. */
export function demoRows(): Row[] {
  return [
    {
      id: 'ord_1041',
      customer: { name: 'Mai Tran', tier: 'gold', city: 'Da Nang' },
      status: 'paid',
      total: 248.5,
      qty: 3,
      items: [
        { sku: 'KB-01', price: 89 },
        { sku: 'MS-12', price: 39 },
      ],
      created: '2026-07-02T09:14:00Z',
    },
    {
      id: 'ord_1042',
      customer: { name: 'Leo Fischer', tier: 'basic', city: 'Berlin' },
      status: 'pending',
      total: 42,
      qty: 1,
      items: [{ sku: 'CB-04', price: 42 }],
      created: '2026-07-02T11:41:00Z',
    },
    {
      id: 'ord_1043',
      customer: { name: 'Sara Ng', tier: 'gold', city: 'Singapore' },
      status: 'paid',
      total: 1310.75,
      qty: 8,
      items: [
        { sku: 'DK-30', price: 690 },
        { sku: 'KB-01', price: 89 },
      ],
      created: '2026-07-03T02:05:00Z',
    },
    {
      id: 'ord_1044',
      customer: { name: 'Tomás Ruiz', tier: 'silver', city: 'Madrid' },
      status: 'refunded',
      total: 99.9,
      qty: 2,
      items: [{ sku: 'MS-12', price: 39 }],
      created: '2026-07-03T15:22:00Z',
    },
    {
      id: 'ord_1045',
      customer: { name: 'Amara Obi', tier: 'silver', city: 'Lagos' },
      status: 'paid',
      total: 517.2,
      qty: 5,
      items: [{ sku: 'DK-30', price: 690 }],
      created: '2026-07-04T08:00:00Z',
    },
    {
      id: 'ord_1046',
      customer: { name: 'Jun Park', tier: 'basic', city: 'Seoul' },
      status: 'pending',
      total: 0,
      qty: 0,
      items: [],
      created: '2026-07-04T19:37:00Z',
    },
  ]
}
