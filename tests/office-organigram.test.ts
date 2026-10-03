import { getOrganigram } from '../src/lib/organigram';
import { prisma } from '../src/lib/prisma';

jest.mock('../src/lib/prisma', () => ({
  prisma: {
    orgUnit: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'u1', name: 'Dept A', parentId: null, children: [] },
        { id: 'u2', name: 'Dept B', parentId: 'u1', children: [] },
      ]),
    },
    departmentWorkItem: {
      groupBy: jest.fn().mockResolvedValue([
        { orgUnitId: 'u1', _count: { id: 2 } },
        { orgUnitId: 'u2', _count: { id: 1 } },
      ]),
    },
  },
}));

describe('getOrganigram', () => {
  it('returns hierarchy with work item counts', async () => {
    const org = await getOrganigram('tenant1');
    expect(org).toHaveLength(1);
    expect(org[0].name).toBe('Dept A');
    expect(org[0].workItemCount).toBe(2);
    expect(org[0].children[0].name).toBe('Dept B');
    expect(org[0].children[0].workItemCount).toBe(1);
  });
});
