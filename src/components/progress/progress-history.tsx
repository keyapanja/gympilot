import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";
import type { ProgressEntry } from "@/lib/services/progress";

const dash = (v: number | null) => (v == null ? "—" : v);

/** Read-only history table; newest first. */
export function ProgressHistory({ entries }: { entries: ProgressEntry[] }) {
  const rows = [...entries].reverse();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Weight</TableHead>
          <TableHead>Waist</TableHead>
          <TableHead>Chest</TableHead>
          <TableHead>Arms</TableHead>
          <TableHead>Hips</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{formatDate(e.recorded_on)}</TableCell>
            <TableCell>{dash(e.weight_kg)}</TableCell>
            <TableCell>{dash(e.waist_cm)}</TableCell>
            <TableCell>{dash(e.chest_cm)}</TableCell>
            <TableCell>{dash(e.arms_cm)}</TableCell>
            <TableCell>{dash(e.hips_cm)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
