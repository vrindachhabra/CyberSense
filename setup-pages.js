const fs = require('fs');
const path = require('path');
const pages = [
  'dashboard',
  'dashboard/synthetic-data',
  'dashboard/models',
  'dashboard/alerts',
  'dashboard/entities',
  'dashboard/analytics',
  'dashboard/settings'
];

pages.forEach(p => {
  const dir = path.join('src/app', p);
  fs.mkdirSync(dir, { recursive: true });
  const name = p.split('/').pop().split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const content = `export default function ${name}Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">${name}</h1>
      <p className="text-muted-foreground">This page is under construction.</p>
    </div>
  );
}`;
  fs.writeFileSync(path.join(dir, 'page.tsx'), content);
});
console.log("Done");
