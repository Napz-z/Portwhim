export function detect(name: string, command: string, port: number) {
  const text = `${name} ${command}`.toLowerCase();
  const rules = [
    [/\bnext(?:\.js|-server)?\b/, 'Next.js','app'], [/\bvite\b/, 'Vite','app'],
    [/\bartisan\b|\blaravel\b/,'Laravel','app'], [/\bpostgres(?:ql)?\b/,'PostgreSQL','database'],
    [/\bredis(?:-server)?\b/,'Redis','database'], [/\bdocker\b|com\.docker/,'Docker','container'],
    [/\bnode(?:\.exe)?\b/,'Node.js','app'], [/\bmysql(?:d)?\b/,'MySQL','database'],
    [/\bpython(?:3)?\b/,'Python','app']
  ] as const;
  for (const [pattern,service,category] of rules) if(pattern.test(text)) return {service,category,confidence:'process' as const};
  const hint: Record<number,string> = {5432:'PostgreSQL',6379:'Redis',3306:'MySQL'};
  if(hint[port]) return {service:hint[port],category:'database' as const,confidence:'port hint' as const};
  return {service:name || 'Unknown',category:'system' as const,confidence:'unknown' as const};
}
