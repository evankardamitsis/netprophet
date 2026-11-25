'use server';
import { createV2ServerClient, getStaff } from '@/lib/v2/server';
import type { NumbersData } from './Numbers';

type Rpc = (fn: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;

/** api.admin_numbers for the last `days` days (admins only) */
export async function loadNumbers(days: number): Promise<NumbersData> {
  const client = await createV2ServerClient();
  const staff = await getStaff(client);
  if (!staff || staff.role !== 'admin') throw new Error('forbidden');
  const { data, error } = await (client.rpc.bind(client) as unknown as Rpc)('admin_numbers', { p_days: days });
  if (error) throw new Error(error.message);
  return data as NumbersData;
}
